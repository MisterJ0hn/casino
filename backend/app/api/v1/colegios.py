from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.models import Colegio, ConfiguracionConsumo, Curso
from app.schemas.schemas import ColegioCreate, ColegioOut, ConfiguracionCreate, ConfiguracionOut, CursoOut

router = APIRouter(prefix="/colegios", tags=["Colegios"])


@router.get("", response_model=list[ColegioOut])
async def listar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Colegio).where(Colegio.activo == True))
    return result.scalars().all()


@router.get("/{id}", response_model=ColegioOut)
async def obtener(id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Colegio, id)
    if not obj:
        raise HTTPException(404)
    return obj


@router.post("", response_model=ColegioOut, status_code=201)
async def crear(data: ColegioCreate, db: AsyncSession = Depends(get_db)):
    obj = Colegio(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/{id}", response_model=ColegioOut)
async def actualizar(id: int, data: ColegioCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Colegio, id)
    if not obj:
        raise HTTPException(404)
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{id}/cursos", response_model=list[CursoOut])
async def get_cursos(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Curso).where(Curso.colegio_id == id).order_by(Curso.nivel, Curso.nombre)
    )
    return result.scalars().all()


@router.get("/{id}/configuracion", response_model=list[ConfiguracionOut])
async def get_configuracion(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConfiguracionConsumo).where(
            ConfiguracionConsumo.colegio_id == id,
            ConfiguracionConsumo.activo == True,
        )
    )
    return result.scalars().all()
