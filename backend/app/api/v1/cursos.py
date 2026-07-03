from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.models import Alumno, Curso
from app.schemas.schemas import CursoCreate, CursoOut, CursoPage

router = APIRouter(prefix="/cursos", tags=["Cursos"])


@router.get("", response_model=list[CursoOut])
async def listar(colegio_id: int | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Curso)
    if colegio_id is not None:
        q = q.where(Curso.colegio_id == colegio_id)
    result = await db.execute(q.order_by(Curso.nivel, Curso.nombre))
    return result.scalars().all()


@router.get("/paginated", response_model=CursoPage)
async def paginated(
    q: str | None = None,
    colegio_id: int | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
):
    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    base = select(Curso)
    if colegio_id is not None:
        base = base.where(Curso.colegio_id == colegio_id)
    if q and q.strip():
        base = base.where(Curso.nombre.ilike(f"%{q.strip()}%"))
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(
        base.order_by(Curso.nivel, Curso.nombre).offset((page - 1) * page_size).limit(page_size)
    )
    return CursoPage(items=result.scalars().all(), total=total, page=page, page_size=page_size)


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
