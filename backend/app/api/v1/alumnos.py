from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.models import Alumno
from app.schemas.schemas import AlumnoCreate, AlumnoOut, AlumnoPage, AlumnoUpdate

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
