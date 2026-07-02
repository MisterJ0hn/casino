from datetime import date
from io import BytesIO
from typing import Any

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.enums import TipoConsumo, OrigenConsumo
from app.models.models import Alumno, ConfiguracionConsumo, Consumo
from app.schemas.schemas import ImportResult
from app.services.rule_engine import ConsumoRuleEngine


def _parse_fecha(valor: Any) -> date:
    """Convierte el valor de celda FechaHora/Fecha a date.

    Casos manejados:
    - datetime / date de pandas (lectura nativa de xlsx)
    - string en cualquier formato reconocible por pandas
    - int/float como Unix timestamp en milisegundos (>1e10) o segundos (>1e7)
    """
    if isinstance(valor, (int, float)):
        if valor > 1e10:          # milisegundos
            return pd.to_datetime(valor, unit='ms').date()
        elif valor > 1e7:         # segundos
            return pd.to_datetime(valor, unit='s').date()
        # número pequeño: dejar que pandas intente (Excel serial date)
    return pd.to_datetime(valor).date()


async def importar_excel(db: AsyncSession, contenido: bytes) -> ImportResult:
    rule_engine = ConsumoRuleEngine()
    procesados = 0
    errores = 0
    mensajes: list[str] = []

    try:
        df = pd.read_excel(BytesIO(contenido))
        df.columns = df.columns.str.strip()
    except Exception as e:
        return ImportResult(procesados=0, errores=1, mensajes=[f"No se pudo leer el archivo: {e}"])

    result_config = await db.execute(
        select(ConfiguracionConsumo).where(ConfiguracionConsumo.activo == True)
    )
    configuraciones = result_config.scalars().all()

    for idx, row in df.iterrows():
        fila = idx + 2
        try:
            rut = str(row.get("RUT", "")).strip()
            fecha_raw = row.get("FechaHora", row.get("Fecha", None))

            if not rut:
                errores += 1
                mensajes.append(f"Fila {fila}: RUT vacío")
                continue

            if fecha_raw is None:
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

        except Exception as e:
            errores += 1
            mensajes.append(f"Fila {fila}: {e}")

    await db.commit()
    return ImportResult(procesados=procesados, errores=errores, mensajes=mensajes)
