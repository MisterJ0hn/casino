from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.models import Alumno
from app.schemas.schemas import AlumnoCreate, AlumnoOut, AlumnoUpdate

router = APIRouter(prefix="/alumnos", tags=["Alumnos"])


@router.get("", response_model=list[AlumnoOut])
async def listar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alumno).options(selectinload(Alumno.curso)).where(Alumno.activo == True)
    )
    return result.scalars().all()


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
