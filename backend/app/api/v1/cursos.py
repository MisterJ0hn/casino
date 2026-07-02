from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.models import Alumno, Curso
from app.schemas.schemas import CursoCreate, CursoOut

router = APIRouter(prefix="/cursos", tags=["Cursos"])


@router.get("", response_model=list[CursoOut])
async def listar(colegio_id: int | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Curso)
    if colegio_id is not None:
        q = q.where(Curso.colegio_id == colegio_id)
    result = await db.execute(q.order_by(Curso.nivel, Curso.nombre))
    return result.scalars().all()


@router.get("/{id}", response_model=CursoOut)
async def obtener(id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Curso, id)
    if not obj:
        raise HTTPException(404)
    return obj


@router.post("", response_model=CursoOut, status_code=201)
async def crear(data: CursoCreate, db: AsyncSession = Depends(get_db)):
    obj = Curso(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/{id}", response_model=CursoOut)
async def actualizar(id: int, data: CursoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Curso, id)
    if not obj:
        raise HTTPException(404)
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
async def eliminar(id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Curso, id)
    if not obj:
        raise HTTPException(404)
    alumnos = await db.execute(select(Alumno).where(Alumno.curso_id == id, Alumno.activo == True))
    if alumnos.first():
        raise HTTPException(409, "El curso tiene alumnos activos")
    await db.delete(obj)
    await db.commit()
