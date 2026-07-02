from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.models import Apoderado, AlumnoApoderado, Consumo, Alumno, Curso, DiaSinAlmuerzo
from app.schemas.schemas import (
    ApoderadoCreate, ApoderadoOut, ConsumoOut, DeudaOut, AlumnoApoderadoOut, VincularHijoIn,
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

router = APIRouter(prefix="/apoderados", tags=["Apoderados"])


@router.get("", response_model=list[ApoderadoOut])
async def listar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Apoderado))
    return result.scalars().all()


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
    rel = AlumnoApoderado(apoderado_id=id, alumno_id=data.alumno_id)
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

            periodos_out.append(PeriodoPortalOut(
                anio=anio,
                mes=mes,
                nombre_mes=_MESES[mes - 1],
                total_consumo=total_consumo,
                total_pagado=total_pagado_val,
                total_pendiente=total_consumo - total_pagado_val,
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
