from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.domain.enums import OrigenConsumo
from app.models.models import Alumno, Colegio, Consumo, Curso, DiaSinAlmuerzo
from app.schemas.schemas import DiaSinAlmuerzoIn, DiaSinAlmuerzoOut

router = APIRouter(prefix="/dias-libres", tags=["Días Libres"])


@router.get("", response_model=list[DiaSinAlmuerzoOut])
async def listar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DiaSinAlmuerzo).order_by(DiaSinAlmuerzo.fecha.desc()))
    dias = result.scalars().all()

    colegio_ids = {d.colegio_id for d in dias if d.colegio_id}
    curso_ids   = {d.curso_id   for d in dias if d.curso_id}
    alumno_ids  = {d.alumno_id  for d in dias if d.alumno_id}

    colegios: dict[int, str] = {}
    cursos:   dict[int, str] = {}
    alumnos:  dict[int, str] = {}

    if colegio_ids:
        r = await db.execute(select(Colegio).where(Colegio.id.in_(colegio_ids)))
        colegios = {c.id: c.nombre for c in r.scalars()}

    if curso_ids:
        r = await db.execute(select(Curso).where(Curso.id.in_(curso_ids)))
        cursos = {c.id: c.nombre for c in r.scalars()}

    if alumno_ids:
        r = await db.execute(select(Alumno).where(Alumno.id.in_(alumno_ids)))
        alumnos = {a.id: a.nombre for a in r.scalars()}

    return [
        DiaSinAlmuerzoOut(
            id=d.id,
            fecha=d.fecha,
            colegio_id=d.colegio_id,
            curso_id=d.curso_id,
            alumno_id=d.alumno_id,
            colegio_nombre=colegios.get(d.colegio_id) if d.colegio_id else None,
            curso_nombre=cursos.get(d.curso_id) if d.curso_id else None,
            alumno_nombre=alumnos.get(d.alumno_id) if d.alumno_id else None,
        )
        for d in dias
    ]


async def _eliminar_consumos_del_dia(db: AsyncSession, data: DiaSinAlmuerzoIn) -> int:
    """Elimina consumos AUTOMATICO no pagados que caen en la fecha del día libre,
    respetando el alcance (global / colegio / curso / alumno).
    No toca consumos con abonos parciales ni consumos de origen EXCEL.
    Retorna la cantidad eliminada.
    """
    q = (
        select(Consumo)
        .options(selectinload(Consumo.pago_detalles))
        .where(
            Consumo.fecha == data.fecha,
            Consumo.origen == OrigenConsumo.AUTOMATICO.value,
            Consumo.pagado == False,
        )
    )

    if data.alumno_id:
        q = q.where(Consumo.alumno_id == data.alumno_id)
    elif data.curso_id:
        q = q.join(Alumno, Consumo.alumno_id == Alumno.id).where(Alumno.curso_id == data.curso_id)
    elif data.colegio_id:
        q = (
            q.join(Alumno, Consumo.alumno_id == Alumno.id)
             .join(Curso, Alumno.curso_id == Curso.id)
             .where(Curso.colegio_id == data.colegio_id)
        )
    # alcance global: sin filtro adicional → afecta todos los consumos de esa fecha

    result = await db.execute(q)
    consumos = result.scalars().all()

    eliminados = 0
    for consumo in consumos:
        if not consumo.pago_detalles:   # no tiene abonos parciales
            await db.delete(consumo)
            eliminados += 1

    return eliminados


@router.post("", response_model=DiaSinAlmuerzoOut, status_code=201)
async def crear(data: DiaSinAlmuerzoIn, db: AsyncSession = Depends(get_db)):
    obj = DiaSinAlmuerzo(**data.model_dump())
    db.add(obj)
    await db.flush()  # obtener id sin commit aún

    eliminados = await _eliminar_consumos_del_dia(db, data)

    await db.commit()
    await db.refresh(obj)
    return DiaSinAlmuerzoOut(id=obj.id, consumos_eliminados=eliminados, **data.model_dump())


@router.delete("/{id}", status_code=204)
async def eliminar(id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(DiaSinAlmuerzo, id)
    if not obj:
        raise HTTPException(404)
    await db.delete(obj)
    await db.commit()
