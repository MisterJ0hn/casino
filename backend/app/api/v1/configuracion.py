from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.models import ConfiguracionConsumo
from app.schemas.schemas import ConfiguracionCreate, ConfiguracionOut

router = APIRouter(prefix="/configuracion", tags=["Configuración"])


@router.get("", response_model=list[ConfiguracionOut])
async def listar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConfiguracionConsumo).where(ConfiguracionConsumo.activo == True)
    )
    return result.scalars().all()


@router.post("", response_model=ConfiguracionOut, status_code=201)
async def crear(data: ConfiguracionCreate, db: AsyncSession = Depends(get_db)):
    obj = ConfiguracionConsumo(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/{id}", response_model=ConfiguracionOut)
async def actualizar(id: int, data: ConfiguracionCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ConfiguracionConsumo, id)
    if not obj:
        raise HTTPException(404)
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
async def eliminar(id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ConfiguracionConsumo, id)
    if not obj:
        raise HTTPException(404)
    obj.activo = False
    await db.commit()
