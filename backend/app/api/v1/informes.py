from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.schemas import DeudaColegioOut
from app.services.informe_service import breakdown_apoderado, build_pdf, deudas_por_colegio

router = APIRouter(prefix="/informes", tags=["Informes"])


@router.get("/deudas", response_model=DeudaColegioOut)
async def deudas(colegio_id: int = Query(...), db: AsyncSession = Depends(get_db)):
    return await deudas_por_colegio(db, colegio_id)


@router.get("/deudas/{apoderado_id}/pdf")
async def deuda_pdf(apoderado_id: int, db: AsyncSession = Depends(get_db)):
    data = await breakdown_apoderado(db, apoderado_id)
    if data is None:
        raise HTTPException(404, "Apoderado no encontrado")
    pdf_bytes = build_pdf(data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="deuda_apoderado_{apoderado_id}.pdf"'},
    )
