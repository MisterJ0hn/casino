from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.schemas import CargaMasivaResult
from app.services.carga_masiva import procesar_carga

router = APIRouter(prefix="/carga-masiva", tags=["Carga Masiva"])


@router.post("/preview", response_model=CargaMasivaResult)
async def preview(
    colegio_id: int = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    contenido = await file.read()
    return await procesar_carga(db, contenido, file.filename or "", colegio_id, commit=False)


@router.post("/confirm", response_model=CargaMasivaResult)
async def confirm(
    colegio_id: int = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    contenido = await file.read()
    return await procesar_carga(db, contenido, file.filename or "", colegio_id, commit=True)
