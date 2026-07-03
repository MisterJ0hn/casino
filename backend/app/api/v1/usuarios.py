from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.models import Colegio, Usuario
from app.schemas.schemas import PasswordUpdate, UsuarioCreate, UsuarioOut, UsuarioUpdate
from app.services.auth_service import get_password_hash

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


async def _load_colegios(db: AsyncSession, ids: list[int]) -> list[Colegio]:
    if not ids:
        return []
    result = await db.execute(select(Colegio).where(Colegio.id.in_(ids)))
    return list(result.scalars().all())


async def _get_full(db: AsyncSession, user_id: int) -> Usuario:
    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    return result.scalar_one()


@router.get("", response_model=list[UsuarioOut])
async def listar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).order_by(Usuario.username))
    return result.scalars().all()


@router.post("", response_model=UsuarioOut, status_code=201)
async def crear(data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    exists = await db.execute(select(Usuario).where(Usuario.username == data.username))
    if exists.scalar_one_or_none():
        raise HTTPException(409, detail="El nombre de usuario ya existe")
    user = Usuario(
        username=data.username,
        password_hash=get_password_hash(data.password),
        activo=data.activo,
    )
    user.colegios = await _load_colegios(db, data.colegio_ids)
    db.add(user)
    await db.commit()
    return await _get_full(db, user.id)


@router.put("/{id}", response_model=UsuarioOut)
async def actualizar(id: int, data: UsuarioUpdate, db: AsyncSession = Depends(get_db)):
    user = await db.get(Usuario, id)
    if not user:
        raise HTTPException(404)
    user.activo = data.activo
    user.colegios = await _load_colegios(db, data.colegio_ids)
    await db.commit()
    return await _get_full(db, id)


@router.put("/{id}/password", response_model=UsuarioOut)
async def cambiar_password(id: int, data: PasswordUpdate, db: AsyncSession = Depends(get_db)):
    user = await db.get(Usuario, id)
    if not user:
        raise HTTPException(404)
    user.password_hash = get_password_hash(data.password)
    await db.commit()
    return await _get_full(db, id)
