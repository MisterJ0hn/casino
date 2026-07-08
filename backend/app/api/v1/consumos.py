from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional

from app.api.deps import get_db
from app.models.models import Alumno, AlumnoApoderado, Consumo, Curso
from app.schemas.schemas import ConsumoListOut, ImportResult
from app.services.generacion_mensual import generar_consumos_mensuales
from app.services.excel_import import importar_excel

router = APIRouter(prefix="/consumos", tags=["Consumos"])


@router.get("", response_model=list[ConsumoListOut])
async def listar(
    alumno_id: Optional[int] = Query(None),
    curso_id: Optional[int] = Query(None),
    colegio_id: Optional[int] = Query(None),
    apoderado_id: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Consumo).options(
        selectinload(Consumo.alumno)
        .selectinload(Alumno.curso)
        .selectinload(Curso.colegio)
    )

    # Filtro directo por alumno
    if alumno_id:
        q = q.where(Consumo.alumno_id == alumno_id)

    # Filtros que requieren JOIN con Alumno
    if curso_id or colegio_id or apoderado_id:
        q = q.join(Alumno, Consumo.alumno_id == Alumno.id)

        if curso_id:
            q = q.where(Alumno.curso_id == curso_id)

        if colegio_id:
            q = q.join(Curso, Alumno.curso_id == Curso.id)
            q = q.where(Curso.colegio_id == colegio_id)

        if apoderado_id:
            q = q.join(AlumnoApoderado, AlumnoApoderado.alumno_id == Alumno.id)
            q = q.where(AlumnoApoderado.apoderado_id == apoderado_id)

    if anio and mes:
        import calendar
        ultimo_dia = calendar.monthrange(anio, mes)[1]
        q = q.where(
            Consumo.fecha >= date(anio, mes, 1),
            Consumo.fecha <= date(anio, mes, ultimo_dia),
        )
    elif anio:
        q = q.where(Consumo.fecha >= date(anio, 1, 1), Consumo.fecha <= date(anio, 12, 31))

    q = q.order_by(Consumo.fecha.desc())
    result = await db.execute(q)
    consumos = result.scalars().all()
    return [
        ConsumoListOut(
            **ConsumoListOut.model_validate(c, from_attributes=True).model_dump(
                exclude={"alumno_nombre", "curso_nombre", "colegio_nombre"}
            ),
            alumno_nombre=c.alumno.nombre if c.alumno else None,
            curso_nombre=c.alumno.curso.nombre if c.alumno and c.alumno.curso else None,
            colegio_nombre=c.alumno.curso.colegio.nombre if c.alumno and c.alumno.curso and c.alumno.curso.colegio else None,
        )
        for c in consumos
    ]


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
