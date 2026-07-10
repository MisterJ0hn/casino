from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.models import Apoderado, AlumnoApoderado, Consumo, Alumno, Curso, DiaSinAlmuerzo, Rebaja
from app.schemas.schemas import (
    ApoderadoCreate, ApoderadoOut, ApoderadoPage, ConsumoOut, DeudaOut, AlumnoApoderadoOut, VincularHijoIn,
    ConsumoPortalOut, PeriodoPortalOut, HijoPortalOut, PortalOut,
)
from app.services.pago_service import get_deuda_apoderado

_MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]


def _aplica_a_alumno(dia: DiaSinAlmuerzo, alumno_id: int, curso_id: int, colegio_id: int) -> bool:
    if dia.alumno_id:
        return dia.alumno_id == alumno_id
    if dia.curso_id:
        return dia.curso_id == curso_id
    if dia.colegio_id:
        return dia.colegio_id == colegio_id
    return True  # global

async def _limpiar_principal(db: AsyncSession, alumno_id: int) -> None:
    """Desmarca cualquier apoderado principal previo del alumno (un solo principal)."""
    res = await db.execute(
        select(AlumnoApoderado).where(
            AlumnoApoderado.alumno_id == alumno_id,
            AlumnoApoderado.es_principal == True,
        )
    )
    for rel in res.scalars().all():
        rel.es_principal = False


router = APIRouter(prefix="/apoderados", tags=["Apoderados"])


@router.get("", response_model=list[ApoderadoOut])
async def listar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Apoderado))
    return result.scalars().all()


@router.get("/paginated", response_model=ApoderadoPage)
async def paginated(
    q: str | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
):
    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    base = select(Apoderado)
    if q and q.strip():
        like = f"%{q.strip()}%"
        base = base.where(or_(
            Apoderado.rut.ilike(like),
            Apoderado.nombre.ilike(like),
            Apoderado.email.ilike(like),
        ))
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(
        base.order_by(Apoderado.nombre).offset((page - 1) * page_size).limit(page_size)
    )
    return ApoderadoPage(items=result.scalars().all(), total=total, page=page, page_size=page_size)


@router.get("/{id}", response_model=ApoderadoOut)
async def obtener(id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Apoderado, id)
    if not obj:
        raise HTTPException(404)
    return obj


@router.post("", response_model=ApoderadoOut, status_code=201)
async def crear(data: ApoderadoCreate, db: AsyncSession = Depends(get_db)):
    obj = Apoderado(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/{id}", response_model=ApoderadoOut)
async def actualizar(id: int, data: ApoderadoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Apoderado, id)
    if not obj:
        raise HTTPException(404)
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{id}/hijos", response_model=list)
async def hijos(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alumno)
        .join(AlumnoApoderado)
        .options(selectinload(Alumno.curso))
        .where(AlumnoApoderado.apoderado_id == id)
    )
    from app.schemas.schemas import AlumnoOut
    alumnos = result.scalars().all()
    return [AlumnoOut.model_validate(a) for a in alumnos]


@router.post("/{id}/hijos", response_model=AlumnoApoderadoOut, status_code=201)
async def vincular_hijo(id: int, data: VincularHijoIn, db: AsyncSession = Depends(get_db)):
    existe = await db.execute(
        select(AlumnoApoderado).where(
            AlumnoApoderado.apoderado_id == id,
            AlumnoApoderado.alumno_id == data.alumno_id,
        )
    )
    if existe.scalar_one_or_none():
        raise HTTPException(409, "El alumno ya está vinculado a este apoderado")
    if data.es_principal:
        await _limpiar_principal(db, data.alumno_id)
    rel = AlumnoApoderado(apoderado_id=id, alumno_id=data.alumno_id, es_principal=data.es_principal)
    db.add(rel)
    await db.commit()
    await db.refresh(rel)
    return rel


@router.delete("/{id}/hijos/{alumno_id}", status_code=204)
async def desvincular_hijo(id: int, alumno_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AlumnoApoderado).where(
            AlumnoApoderado.apoderado_id == id,
            AlumnoApoderado.alumno_id == alumno_id,
        )
    )
    rel = result.scalar_one_or_none()
    if not rel:
        raise HTTPException(404)
    await db.delete(rel)
    await db.commit()


@router.get("/{id}/deuda", response_model=DeudaOut)
async def deuda(id: int, db: AsyncSession = Depends(get_db)):
    total = await get_deuda_apoderado(db, id)
    return DeudaOut(apoderado_id=id, deuda=total)


@router.get("/{id}/consumos", response_model=list[ConsumoOut])
async def consumos(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Consumo)
        .join(Alumno)
        .join(AlumnoApoderado)
        .where(AlumnoApoderado.apoderado_id == id)
        .order_by(Consumo.fecha.desc())
    )
    return result.scalars().all()


@router.get("/{id}/portal", response_model=PortalOut)
async def portal(id: int, db: AsyncSession = Depends(get_db)):
    apoderado = await db.get(Apoderado, id)
    if not apoderado:
        raise HTTPException(404)

    deuda_total = await get_deuda_apoderado(db, id)

    result = await db.execute(
        select(Alumno)
        .join(AlumnoApoderado, AlumnoApoderado.alumno_id == Alumno.id)
        .options(selectinload(Alumno.curso).selectinload(Curso.colegio))
        .where(AlumnoApoderado.apoderado_id == id)
        .order_by(Alumno.nombre)
    )
    hijos = result.scalars().all()

    if not hijos:
        return PortalOut(apoderado_id=id, deuda_total=deuda_total, hijos=[])

    alumno_ids = [a.id for a in hijos]

    result = await db.execute(
        select(Consumo)
        .options(selectinload(Consumo.pago_detalles))
        .where(Consumo.alumno_id.in_(alumno_ids))
        .order_by(Consumo.fecha)
    )
    todos_consumos = result.scalars().all()

    res_reb = await db.execute(select(Rebaja).where(Rebaja.alumno_id.in_(alumno_ids)))
    rebajas_map = {(r.alumno_id, r.anio, r.mes): r.monto for r in res_reb.scalars().all()}

    result = await db.execute(select(DiaSinAlmuerzo))
    todos_dias = result.scalars().all()

    consumos_por_alumno: dict[int, list] = defaultdict(list)
    for c in todos_consumos:
        consumos_por_alumno[c.alumno_id].append(c)

    hijos_out = []
    for alumno in hijos:
        curso = alumno.curso
        colegio = curso.colegio

        dias_aplicables = [
            d for d in todos_dias
            if _aplica_a_alumno(d, alumno.id, alumno.curso_id, colegio.id)
        ]
        dias_por_mes: dict[tuple, list[str]] = defaultdict(list)
        for d in dias_aplicables:
            dias_por_mes[(d.fecha.year, d.fecha.month)].append(str(d.fecha))

        periodos_dict: dict[tuple, list] = defaultdict(list)
        for c in consumos_por_alumno.get(alumno.id, []):
            periodos_dict[(c.fecha.year, c.fecha.month)].append(c)

        periodos_out = []
        for (anio, mes) in sorted(periodos_dict.keys(), reverse=True):
            consumos_periodo = periodos_dict[(anio, mes)]
            total_consumo = sum(c.precio for c in consumos_periodo)
            total_pagado_val = Decimal(0)
            for c in consumos_periodo:
                paid = sum(pd.monto_aplicado for pd in c.pago_detalles)
                if c.pagado and not c.pago_detalles:
                    paid = c.precio
                total_pagado_val += paid

            rebaja_periodo = rebajas_map.get((alumno.id, anio, mes), Decimal(0))
            pendiente = total_consumo - total_pagado_val - rebaja_periodo
            if pendiente < 0:
                pendiente = Decimal(0)

            periodos_out.append(PeriodoPortalOut(
                anio=anio,
                mes=mes,
                nombre_mes=_MESES[mes - 1],
                total_consumo=total_consumo,
                total_pagado=total_pagado_val,
                total_pendiente=pendiente,
                rebaja=rebaja_periodo,
                dias_libres=sorted(dias_por_mes.get((anio, mes), [])),
                consumos=[
                    ConsumoPortalOut(
                        id=c.id,
                        fecha=c.fecha,
                        tipo=c.tipo,
                        modalidad=c.modalidad,
                        precio=c.precio,
                        pagado=c.pagado,
                    )
                    for c in sorted(consumos_periodo, key=lambda x: x.fecha)
                ],
            ))

        hijos_out.append(HijoPortalOut(
            id=alumno.id,
            nombre=alumno.nombre,
            rut=alumno.rut,
            curso_nombre=curso.nombre,
            colegio_nombre=colegio.nombre,
            periodos=periodos_out,
        ))

    return PortalOut(apoderado_id=id, deuda_total=deuda_total, hijos=hijos_out)
