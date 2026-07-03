"""Carga masiva de cursos, alumnos y apoderados desde un archivo CSV/XLSX.

El archivo esperado trae una fila por alumno, con columnas (separador ';' en CSV):
  Codigo;Curso;Letra;Rut Alumno;Nombre Alumno;Apellido Paterno Alumno;
  Apellido Materno Alumno;Rut Apoderado;Nombre Apoderado;Apellido Paterno Apoderado;
  Apellido Materno Apoderado;Telefono Apoderado;Celular Apoderado;Email Apoderado;
  Nombre Apoderado Secundario;Rut Apoderado Secundario;Email Apoderado Secundario

Se procesa todo con upsert por RUT. Con commit=False funciona como dry-run (preview):
aplica la lógica en la transacción y hace rollback al final.
"""
import re
from io import BytesIO
from typing import Any, Optional

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Alumno, AlumnoApoderado, Apoderado, Colegio, Curso
from app.schemas.schemas import CargaMasivaResult

COLUMNAS_REQUERIDAS = ["Curso", "Letra", "Rut Alumno", "Nombre Alumno"]

_ROMANOS = {"i": 1, "ii": 2, "iii": 3, "iv": 4}


def _read_dataframe(contenido: bytes, filename: str) -> tuple[pd.DataFrame, list[str]]:
    """Devuelve (df, advertencias).

    El CSV se parsea a mano (separador ';', sin comillas) para tolerar filas con
    columnas de más: si los campos sobrantes al final están vacíos se recortan;
    si hay un ';' dentro de un dato (campo extra no vacío) la fila se omite y se
    reporta su número de línea. Las filas con menos columnas se completan vacías.
    """
    name = (filename or "").lower()
    if name.endswith((".xlsx", ".xls")):
        df = pd.read_excel(BytesIO(contenido), dtype=str).fillna("")
        df.columns = df.columns.str.strip()
        return df, []

    text: Optional[str] = None
    for enc in ("utf-8-sig", "latin-1"):
        try:
            text = contenido.decode(enc)
            break
        except Exception:  # noqa: BLE001
            continue
    if text is None:
        text = contenido.decode("latin-1", errors="replace")

    lines = text.splitlines()
    header_idx = next((i for i, l in enumerate(lines) if l.strip()), 0)
    header = [h.strip() for h in lines[header_idx].split(";")]
    ncol = len(header)

    data: list[list[str]] = []
    advertencias: list[str] = []
    for i in range(header_idx + 1, len(lines)):
        raw = lines[i]
        if not raw.strip():
            continue
        campos = raw.split(";")
        if len(campos) > ncol:
            if all(not c.strip() for c in campos[ncol:]):
                campos = campos[:ncol]
            else:
                advertencias.append(
                    f"Línea {i + 1}: {len(campos)} columnas (se esperaban {ncol}); "
                    f"probablemente un ';' dentro de un dato. Fila omitida."
                )
                continue
        elif len(campos) < ncol:
            campos = campos + [""] * (ncol - len(campos))
        data.append(campos)

    df = pd.DataFrame(data, columns=header)
    df.columns = df.columns.str.strip()
    return df, advertencias


def _cell(row: Any, col: str) -> str:
    val = row.get(col, "")
    if val is None:
        return ""
    return str(val).strip()


def _norm_rut(valor: str) -> str:
    return valor.replace(".", "").replace(" ", "").upper().strip()


def _join_nombre(*partes: str) -> str:
    return " ".join(p.strip() for p in partes if p and p.strip())


def _derive_nivel(curso_str: str) -> Optional[int]:
    """1°–8° Básico → 1–8; I–IV Medio → 9–12."""
    s = curso_str.strip().lower()
    m_num = re.search(r"\b([1-8])\b", s)
    m_rom = re.search(r"\b(iv|iii|ii|i)\b", s)
    if "medio" in s:
        if m_num:
            n = int(m_num.group(1))
        elif m_rom:
            n = _ROMANOS[m_rom.group(1)]
        else:
            return None
        return 8 + n if 1 <= n <= 4 else None
    if "sic" in s:  # básico / basico
        return int(m_num.group(1)) if m_num else None
    return int(m_num.group(1)) if m_num else None


async def procesar_carga(
    db: AsyncSession,
    contenido: bytes,
    filename: str,
    colegio_id: int,
    commit: bool,
) -> CargaMasivaResult:
    errores: list[str] = []
    counters = dict(cursos_creados=0, alumnos_creados=0, alumnos_actualizados=0,
                    apoderados_creados=0, apoderados_actualizados=0, vinculos_creados=0)
    filas_ok = 0
    filas_error = 0

    colegio = await db.get(Colegio, colegio_id)
    if not colegio:
        return CargaMasivaResult(commit=commit, filas_total=0, filas_ok=0, filas_error=1,
                                 errores=[f"El colegio id={colegio_id} no existe."], **counters)

    try:
        df, advertencias = _read_dataframe(contenido, filename)
    except Exception as e:  # noqa: BLE001
        return CargaMasivaResult(commit=commit, filas_total=0, filas_ok=0, filas_error=1,
                                 errores=[f"No se pudo leer el archivo: {e}"], **counters)

    errores.extend(advertencias)
    filas_malformadas = len(advertencias)

    faltantes = [c for c in COLUMNAS_REQUERIDAS if c not in df.columns]
    if faltantes:
        return CargaMasivaResult(commit=commit, filas_total=0, filas_ok=0, filas_error=1,
                                 errores=[f"Faltan columnas requeridas: {', '.join(faltantes)}"], **counters)

    cursos_cache: dict[str, Curso] = {}
    apoderados_cache: dict[str, Apoderado] = {}
    alumnos_vistos: set[str] = set()
    cursos_sin_nivel: set[str] = set()

    async def _get_curso(nombre: str, curso_col: str) -> Curso:
        if nombre in cursos_cache:
            return cursos_cache[nombre]
        res = await db.execute(
            select(Curso).where(Curso.colegio_id == colegio_id, Curso.nombre == nombre)
        )
        curso = res.scalar_one_or_none()
        if curso is None:
            nivel = _derive_nivel(curso_col)
            if nivel is None:
                nivel = 0
                if nombre not in cursos_sin_nivel:
                    cursos_sin_nivel.add(nombre)
                    errores.append(f"Curso '{nombre}': no se pudo derivar nivel de '{curso_col}', se usó 0.")
            curso = Curso(colegio_id=colegio_id, nombre=nombre, nivel=nivel)
            db.add(curso)
            await db.flush()
            counters["cursos_creados"] += 1
        cursos_cache[nombre] = curso
        return curso

    async def _upsert_apoderado(rut: str, nombre: str, email: str,
                                telefono: str = "", celular: str = "") -> Optional[Apoderado]:
        if not rut:
            return None
        if rut in apoderados_cache:
            return apoderados_cache[rut]
        res = await db.execute(select(Apoderado).where(Apoderado.rut == rut))
        apo = res.scalar_one_or_none()
        if apo is None:
            apo = Apoderado(rut=rut, nombre=nombre, email=email,
                            telefono=telefono or None, celular=celular or None)
            db.add(apo)
            await db.flush()
            counters["apoderados_creados"] += 1
        else:
            if nombre:
                apo.nombre = nombre
            if email:
                apo.email = email
            if telefono:
                apo.telefono = telefono
            if celular:
                apo.celular = celular
            counters["apoderados_actualizados"] += 1
        apoderados_cache[rut] = apo
        return apo

    async def _vincular(alumno: Alumno, apo: Apoderado) -> None:
        res = await db.execute(
            select(AlumnoApoderado).where(
                AlumnoApoderado.alumno_id == alumno.id,
                AlumnoApoderado.apoderado_id == apo.id,
            )
        )
        if res.scalar_one_or_none() is None:
            db.add(AlumnoApoderado(alumno_id=alumno.id, apoderado_id=apo.id))
            await db.flush()
            counters["vinculos_creados"] += 1

    for idx, row in df.iterrows():
        fila = int(idx) + 2  # +1 header, +1 base-1
        try:
            alumno_rut = _norm_rut(_cell(row, "Rut Alumno"))
            alumno_nombre = _join_nombre(
                _cell(row, "Nombre Alumno"),
                _cell(row, "Apellido Paterno Alumno"),
                _cell(row, "Apellido Materno Alumno"),
            )
            if not alumno_rut or not alumno_nombre:
                filas_error += 1
                errores.append(f"Fila {fila}: falta RUT o nombre del alumno.")
                continue

            curso_nombre = _cell(row, "Letra") or _cell(row, "Curso")
            curso = await _get_curso(curso_nombre, _cell(row, "Curso"))

            res = await db.execute(select(Alumno).where(Alumno.rut == alumno_rut))
            alumno = res.scalar_one_or_none()
            if alumno is None:
                alumno = Alumno(rut=alumno_rut, nombre=alumno_nombre,
                                curso_id=curso.id, activo=True)
                db.add(alumno)
                await db.flush()
                counters["alumnos_creados"] += 1
            else:
                alumno.nombre = alumno_nombre
                alumno.curso_id = curso.id
                alumno.activo = True
                if alumno_rut not in alumnos_vistos:
                    counters["alumnos_actualizados"] += 1
            alumnos_vistos.add(alumno_rut)

            apo = await _upsert_apoderado(
                _norm_rut(_cell(row, "Rut Apoderado")),
                _join_nombre(
                    _cell(row, "Nombre Apoderado"),
                    _cell(row, "Apellido Paterno Apoderado"),
                    _cell(row, "Apellido Materno Apoderado"),
                ),
                _cell(row, "Email Apoderado"),
                _cell(row, "Telefono Apoderado"),
                _cell(row, "Celular Apoderado"),
            )
            if apo:
                await _vincular(alumno, apo)

            apo2 = await _upsert_apoderado(
                _norm_rut(_cell(row, "Rut Apoderado Secundario")),
                _cell(row, "Nombre Apoderado Secundario"),
                _cell(row, "Email Apoderado Secundario"),
            )
            if apo2:
                await _vincular(alumno, apo2)

            filas_ok += 1
        except Exception as e:  # noqa: BLE001
            filas_error += 1
            errores.append(f"Fila {fila}: {e}")

    if commit and filas_ok > 0:
        await db.commit()
    else:
        await db.rollback()

    return CargaMasivaResult(
        commit=commit and filas_ok > 0,
        filas_total=len(df) + filas_malformadas,
        filas_ok=filas_ok,
        filas_error=filas_error + filas_malformadas,
        errores=errores[:200],
        **counters,
    )
