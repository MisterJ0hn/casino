from datetime import date
from io import BytesIO, StringIO
from typing import Any, Optional

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.enums import TipoConsumo, OrigenConsumo
from app.models.models import Alumno, ConfiguracionConsumo, Consumo
from app.schemas.schemas import ImportResult
from app.services.rule_engine import ConsumoRuleEngine


def _norm_rut(valor: Any) -> str:
    """Normaliza a formato canónico con guión: '244676898' -> '24467689-8'."""
    s = str(valor).replace(".", "").replace(" ", "").replace("-", "").upper().strip()
    if len(s) < 2:
        return ""
    return f"{s[:-1]}-{s[-1]}"


def _parse_fecha(valor: Any) -> date:
    """Convierte el valor de celda a date. Fechas string se interpretan
    day-first (formato chileno DD-MM-AAAA)."""
    if isinstance(valor, (int, float)):
        if valor > 1e10:          # milisegundos
            return pd.to_datetime(valor, unit='ms').date()
        elif valor > 1e7:         # segundos
            return pd.to_datetime(valor, unit='s').date()
    return pd.to_datetime(valor, dayfirst=True).date()


def _leer_df(contenido: bytes, filename: str) -> pd.DataFrame:
    """Lee CSV (';') o XLSX y detecta automáticamente la fila de encabezado,
    saltando filas de basura previas (ej. un total '150;;;;')."""
    name = (filename or "").lower()
    if name.endswith((".xlsx", ".xls")):
        raw = pd.read_excel(BytesIO(contenido), header=None, dtype=str)
    else:
        text: Optional[str] = None
        for enc in ("utf-8-sig", "latin-1"):
            try:
                text = contenido.decode(enc)
                break
            except Exception:  # noqa: BLE001
                continue
        if text is None:
            text = contenido.decode("latin-1", errors="replace")
        raw = pd.read_csv(StringIO(text), sep=";", header=None, dtype=str, keep_default_na=False)
    raw = raw.fillna("")

    header_idx = None
    for i in range(min(len(raw), 20)):
        valores = [str(v).strip().upper() for v in raw.iloc[i].tolist()]
        if "RUT" in valores:
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("No se encontró la fila de encabezado con la columna 'RUT'.")

    columnas = [str(v).strip() for v in raw.iloc[header_idx].tolist()]
    df = raw.iloc[header_idx + 1:].copy()
    df.columns = columnas
    return df.reset_index(drop=True)


def _valor(row: Any, colmap: dict, *candidatos: str) -> str:
    for c in candidatos:
        col = colmap.get(c.upper())
        if col is not None:
            v = row.get(col, "")
            if v is not None and str(v).strip():
                return str(v).strip()
    return ""


async def importar_excel(db: AsyncSession, contenido: bytes, filename: str = "") -> ImportResult:
    rule_engine = ConsumoRuleEngine()
    procesados = 0
    errores = 0
    mensajes: list[str] = []

    try:
        df = _leer_df(contenido, filename)
    except Exception as e:  # noqa: BLE001
        return ImportResult(procesados=0, errores=1, mensajes=[f"No se pudo leer el archivo: {e}"])

    colmap = {str(c).strip().upper(): c for c in df.columns}

    result_config = await db.execute(
        select(ConfiguracionConsumo).where(ConfiguracionConsumo.activo == True)
    )
    configuraciones = result_config.scalars().all()

    for idx, row in df.iterrows():
        fila = int(idx) + 2
        try:
            rut = _norm_rut(_valor(row, colmap, "RUT"))
            fecha_raw = _valor(row, colmap, "Fecha y Hora", "FechaHora", "Fecha")

            if not rut:
                errores += 1
                mensajes.append(f"Fila {fila}: RUT vacío")
                continue

            if not fecha_raw:
                errores += 1
                mensajes.append(f"Fila {fila}: Fecha vacía")
                continue

            fecha: date = _parse_fecha(fecha_raw)

            result = await db.execute(
                select(Alumno)
                .options(selectinload(Alumno.curso))
                .where(Alumno.rut == rut, Alumno.activo == True)
            )
            alumno = result.scalar_one_or_none()

            if alumno is None:
                errores += 1
                mensajes.append(f"Fila {fila}: alumno con RUT '{rut}' no encontrado")
                continue

            existe = await db.execute(
                select(Consumo).where(
                    Consumo.alumno_id == alumno.id,
                    Consumo.fecha == fecha,
                    Consumo.tipo == TipoConsumo.TICKET.value,
                )
            )
            if existe.scalar_one_or_none():
                mensajes.append(f"Fila {fila}: consumo duplicado para RUT {rut} en {fecha}")
                continue

            configs_colegio = [c for c in configuraciones if c.colegio_id == alumno.curso.colegio_id]
            reglas = rule_engine.resolver(alumno, configs_colegio)

            if reglas is None:
                errores += 1
                mensajes.append(f"Fila {fila}: sin configuración para alumno {rut}")
                continue

            db.add(Consumo(
                alumno_id=alumno.id,
                fecha=fecha,
                tipo=TipoConsumo.TICKET.value,
                modalidad=reglas.modalidad.value,
                precio=reglas.precio,
                precio_base=reglas.precio,
                origen=OrigenConsumo.EXCEL.value,
                pagado=False,
            ))
            procesados += 1

        except Exception as e:  # noqa: BLE001
            errores += 1
            mensajes.append(f"Fila {fila}: {e}")

    await db.commit()
    return ImportResult(procesados=procesados, errores=errores, mensajes=mensajes)
