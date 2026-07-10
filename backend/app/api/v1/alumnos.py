from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.api.v1.apoderados import _limpiar_principal
from app.models.models import Alumno, AlumnoApoderado, Apoderado, Curso
from app.schemas.schemas import (
    AlumnoCreate, AlumnoOut, AlumnoPage, AlumnoUpdate,
    ApoderadoVinculoOut, VincularApoderadoIn,
)

router = APIRouter(prefix="/alumnos", tags=["Alumnos"])


@router.get("", response_model=list[AlumnoOut])
async def listar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alumno).options(selectinload(Alumno.curso)).where(Alumno.activo == True)
    )
    return result.scalars().all()


@router.get("/paginated", response_model=AlumnoPage)
async def paginated(
    q: str | None = None,
    colegio_id: int | None = None,
    curso_id: int | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
):
    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    base = select(Alumno).where(Alumno.activo == True)
    if q and q.strip():
        like = f"%{q.strip()}%"
        base = base.where(or_(Alumno.rut.ilike(like), Alumno.nombre.ilike(like)))
    if curso_id:
        base = base.where(Alumno.curso_id == curso_id)
    if colegio_id:
        base = base.join(Curso, Alumno.curso_id == Curso.id).where(Curso.colegio_id == colegio_id)
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(
        base.options(selectinload(Alumno.curso))
        .order_by(Alumno.nombre)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return AlumnoPage(items=result.scalars().all(), total=total, page=page, page_size=page_size)


@router.get("/{id}", response_model=AlumnoOut)
async def obtener(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alumno).options(selectinload(Alumno.curso)).where(Alumno.id == id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404)
    return obj


@router.post("", response_model=AlumnoOut, status_code=201)
async def crear(data: AlumnoCreate, db: AsyncSession = Depends(get_db)):
    obj = Alumno(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/{id}", response_model=AlumnoOut)
async def actualizar(id: int, data: AlumnoUpdate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Alumno, id)
    if not obj:
        raise HTTPException(404)
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
async def eliminar(id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Alumno, id)
    if not obj:
        raise HTTPException(404)
    obj.activo = False
    await db.commit()


# ── Apoderados vinculados al alumno ───────────────────────────────────────────

@router.get("/{id}/apoderados", response_model=list[ApoderadoVinculoOut])
async def apoderados_del_alumno(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AlumnoApoderado, Apoderado)
        .join(Apoderado, Apoderado.id == AlumnoApoderado.apoderado_id)
        .where(AlumnoApoderado.alumno_id == id)
        .order_by(AlumnoApoderado.es_principal.desc(), Apoderado.nombre)
    )
    return [
        ApoderadoVinculoOut(
            vinculo_id=rel.id,
            apoderado_id=apo.id,
            rut=apo.rut,
            nombre=apo.nombre,
            email=apo.email,
            telefono=apo.telefono,
            celular=apo.celular,
            es_principal=rel.es_principal,
        )
        for rel, apo in result.all()
    ]


@router.post("/{id}/apoderados", response_model=ApoderadoVinculoOut, status_code=201)
async def vincular_apoderado(id: int, data: VincularApoderadoIn, db: AsyncSession = Depends(get_db)):
    alumno = await db.get(Alumno, id)
    if not alumno:
        raise HTTPException(404, "Alumno no encontrado")
    apo = await db.get(Apoderado, data.apoderado_id)
    if not apo:
        raise HTTPException(404, "Apoderado no encontrado")
    existe = await db.execute(
        select(AlumnoApoderado).where(
            AlumnoApoderado.alumno_id == id,
            AlumnoApoderado.apoderado_id == data.apoderado_id,
        )
    )
    if existe.scalar_one_or_none():
        raise HTTPException(409, "El apoderado ya está vinculado a este alumno")
    if data.es_principal:
        await _limpiar_principal(db, id)
    rel = AlumnoApoderado(alumno_id=id, apoderado_id=data.apoderado_id, es_principal=data.es_principal)
    db.add(rel)
    await db.commit()
    await db.refresh(rel)
    return ApoderadoVinculoOut(
        vinculo_id=rel.id, apoderado_id=apo.id, rut=apo.rut, nombre=apo.nombre,
        email=apo.email, telefono=apo.telefono, celular=apo.celular, es_principal=rel.es_principal,
    )


@router.put("/{id}/apoderados/{apoderado_id}/principal", status_code=204)
async def marcar_principal(id: int, apoderado_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AlumnoApoderado).where(
            AlumnoApoderado.alumno_id == id,
            AlumnoApoderado.apoderado_id == apoderado_id,
        )
    )
    rel = result.scalar_one_or_none()
    if not rel:
        raise HTTPException(404, "Vínculo no encontrado")
    await _limpiar_principal(db, id)
    rel.es_principal = True
    await db.commit()


@router.delete("/{id}/apoderados/{apoderado_id}", status_code=204)
async def desvincular_apoderado(id: int, apoderado_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AlumnoApoderado).where(
            AlumnoApoderado.alumno_id == id,
            AlumnoApoderado.apoderado_id == apoderado_id,
        )
    )
    rel = result.scalar_one_or_none()
    if not rel:
        raise HTTPException(404)
    await db.delete(rel)
    await db.commit()
