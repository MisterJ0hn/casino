from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.models import Colegio, ConfiguracionRebaja
from app.schemas.schemas import ConfiguracionRebajaIn, ConfiguracionRebajaOut, RebajaAplicarResult
from app.services.rebaja_service import aplicar_rebajas

router = APIRouter(prefix="/rebajas", tags=["Rebajas"])


def _out(cfg: ConfiguracionRebaja, nombre: str | None) -> ConfiguracionRebajaOut:
    return ConfiguracionRebajaOut(
        id=cfg.id, colegio_id=cfg.colegio_id, colegio_nombre=nombre,
        dias_minimos=cfg.dias_minimos, monto=cfg.monto, activo=cfg.activo,
    )


@router.get("/config", response_model=list[ConfiguracionRebajaOut])
async def listar_config(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ConfiguracionRebaja))
    configs = res.scalars().all()
    res_col = await db.execute(select(Colegio))
    nombres = {c.id: c.nombre for c in res_col.scalars().all()}
    return [_out(c, nombres.get(c.colegio_id)) for c in configs]


@router.post("/config", response_model=ConfiguracionRebajaOut)
async def guardar_config(data: ConfiguracionRebajaIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(ConfiguracionRebaja).where(ConfiguracionRebaja.colegio_id == data.colegio_id)
    )
    cfg = res.scalar_one_or_none()
    if cfg is None:
        cfg = ConfiguracionRebaja(**data.model_dump())
        db.add(cfg)
    else:
        cfg.dias_minimos = data.dias_minimos
        cfg.monto = data.monto
        cfg.activo = data.activo
    await db.commit()
    await db.refresh(cfg)
    colegio = await db.get(Colegio, cfg.colegio_id)
    return _out(cfg, colegio.nombre if colegio else None)


@router.delete("/config/{id}", status_code=204)
async def eliminar_config(id: int, db: AsyncSession = Depends(get_db)):
    cfg = await db.get(ConfiguracionRebaja, id)
    if cfg:
        await db.delete(cfg)
        await db.commit()


@router.post("/aplicar", response_model=RebajaAplicarResult)
async def aplicar(anio: int = Query(...), mes: int = Query(...), db: AsyncSession = Depends(get_db)):
    return await aplicar_rebajas(db, anio, mes)
