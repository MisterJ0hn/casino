import calendar
from datetime import date
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional

from app.api.deps import get_db
from app.models.models import Alumno, AlumnoApoderado, Apoderado, Consumo, Curso
from app.schemas.schemas import ConsumoListOut, ConsumoPage, ImportResult
from app.services.generacion_mensual import generar_consumos_mensuales
from app.services.excel_import import importar_excel

router = APIRouter(prefix="/consumos", tags=["Consumos"])


def _norm_rut(valor: str) -> str:
    """Normaliza a formato canónico con guión: '244676898' -> '24467689-8'."""
    s = str(valor).replace(".", "").replace(" ", "").replace("-", "").upper().strip()
    if len(s) < 2:
        return s
    return f"{s[:-1]}-{s[-1]}"


_LOADER = selectinload(Consumo.alumno).selectinload(Alumno.curso).selectinload(Curso.colegio)


def _consumos_query(alumno_id, curso_id, colegio_id, apoderado_id, alumno_rut, apoderado_rut, anio, mes):
    q = select(Consumo)
    if alumno_id:
        q = q.where(Consumo.alumno_id == alumno_id)
    if curso_id or colegio_id or apoderado_id or alumno_rut or apoderado_rut:
        q = q.join(Alumno, Consumo.alumno_id == Alumno.id)
        if curso_id:
            q = q.where(Alumno.curso_id == curso_id)
        if colegio_id:
            q = q.join(Curso, Alumno.curso_id == Curso.id).where(Curso.colegio_id == colegio_id)
        if alumno_rut and alumno_rut.strip():
            q = q.where(Alumno.rut == _norm_rut(alumno_rut))
        if apoderado_id:
            q = q.join(AlumnoApoderado, AlumnoApoderado.alumno_id == Alumno.id).where(
                AlumnoApoderado.apoderado_id == apoderado_id
            )
        if apoderado_rut and apoderado_rut.strip():
            q = (
                q.join(AlumnoApoderado, AlumnoApoderado.alumno_id == Alumno.id)
                .join(Apoderado, Apoderado.id == AlumnoApoderado.apoderado_id)
                .where(Apoderado.rut == _norm_rut(apoderado_rut))
            )
    if anio and mes:
        ultimo_dia = calendar.monthrange(anio, mes)[1]
        q = q.where(Consumo.fecha >= date(anio, mes, 1), Consumo.fecha <= date(anio, mes, ultimo_dia))
    elif anio:
        q = q.where(Consumo.fecha >= date(anio, 1, 1), Consumo.fecha <= date(anio, 12, 31))
    return q


def _to_listout(c: Consumo) -> ConsumoListOut:
    return ConsumoListOut(
        **ConsumoListOut.model_validate(c, from_attributes=True).model_dump(
            exclude={"alumno_nombre", "curso_nombre", "colegio_nombre"}
        ),
        alumno_nombre=c.alumno.nombre if c.alumno else None,
        curso_nombre=c.alumno.curso.nombre if c.alumno and c.alumno.curso else None,
        colegio_nombre=c.alumno.curso.colegio.nombre if c.alumno and c.alumno.curso and c.alumno.curso.colegio else None,
    )


@router.get("", response_model=ConsumoPage)
async def listar(
    alumno_id: Optional[int] = Query(None),
    curso_id: Optional[int] = Query(None),
    colegio_id: Optional[int] = Query(None),
    apoderado_id: Optional[int] = Query(None),
    alumno_rut: Optional[str] = Query(None),
    apoderado_rut: Optional[str] = Query(None),
    anio: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    page: int = Query(1),
    page_size: int = Query(100),
    db: AsyncSession = Depends(get_db),
):
    page = max(1, page)
    page_size = min(max(1, page_size), 500)
    q = _consumos_query(alumno_id, curso_id, colegio_id, apoderado_id, alumno_rut, apoderado_rut, anio, mes)
    total = await db.scalar(select(func.count()).select_from(q.subquery())) or 0
    items_q = q.options(_LOADER).order_by(Consumo.fecha.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(items_q)
    consumos = result.scalars().all()
    return ConsumoPage(items=[_to_listout(c) for c in consumos], total=total, page=page, page_size=page_size)


@router.get("/export")
async def exportar(
    alumno_id: Optional[int] = Query(None),
    curso_id: Optional[int] = Query(None),
    colegio_id: Optional[int] = Query(None),
    apoderado_id: Optional[int] = Query(None),
    alumno_rut: Optional[str] = Query(None),
    apoderado_rut: Optional[str] = Query(None),
    anio: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    import pandas as pd

    q = _consumos_query(alumno_id, curso_id, colegio_id, apoderado_id, alumno_rut, apoderado_rut, anio, mes)
    items_q = q.options(_LOADER).order_by(Consumo.fecha.desc())
    result = await db.execute(items_q)
    consumos = result.scalars().all()

    filas = [
        {
            "Fecha": c.fecha.isoformat() if c.fecha else "",
            "Alumno": c.alumno.nombre if c.alumno else "",
            "RUT": c.alumno.rut if c.alumno else "",
            "Colegio": c.alumno.curso.colegio.nombre if c.alumno and c.alumno.curso and c.alumno.curso.colegio else "",
            "Curso": c.alumno.curso.nombre if c.alumno and c.alumno.curso else "",
            "Tipo": c.tipo,
            "Modalidad": c.modalidad,
            "Precio": float(c.precio),
            "Origen": c.origen,
            "Pagado": "Sí" if c.pagado else "No",
        }
        for c in consumos
    ]
    columnas = ["Fecha", "Alumno", "RUT", "Colegio", "Curso", "Tipo", "Modalidad", "Precio", "Origen", "Pagado"]
    df = pd.DataFrame(filas, columns=columnas)
    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Consumos")
    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="consumos.xlsx"'},
    )


@router.post("/generar-mensual")
async def generar_mensual(
    anio: int = Query(...),
    mes: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not (1 <= mes <= 12):
        raise HTTPException(400, "Mes inválido")
    generados = await generar_consumos_mensuales(db, anio, mes)
    return {"mensaje": f"Consumos generados: {generados} para {mes}/{anio}"}


@router.post("/import-excel", response_model=ImportResult)
async def import_excel(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(400, "Solo archivos Excel (.xlsx, .xls) o CSV (.csv)")
    try:
        contenido = await file.read()
        return await importar_excel(db, contenido, file.filename)
    except Exception as e:
        raise HTTPException(500, f"Error procesando el archivo: {e}")
