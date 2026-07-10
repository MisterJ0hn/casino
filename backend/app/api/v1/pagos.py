from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.models import Pago, PagoDetalle
from app.schemas.schemas import PagoCreate, PagoOut, PagoListOut, PagoDetalleItemOut, PagoDetalleOut
from app.services.pago_service import aplicar_pago, anular_pago

router = APIRouter(prefix="/pagos", tags=["Pagos"])


@router.get("", response_model=list[PagoListOut])
async def listar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Pago)
        .options(selectinload(Pago.apoderado), selectinload(Pago.alumno))
        .order_by(Pago.fecha.desc(), Pago.id.desc())
    )
    pagos = result.scalars().all()
    return [
        PagoListOut(
            id=p.id,
            fecha=p.fecha,
            monto=p.monto,
            apoderado_id=p.apoderado_id,
            apoderado_rut=p.apoderado.rut,
            apoderado_nombre=p.apoderado.nombre,
            alumno_id=p.alumno_id,
            alumno_nombre=p.alumno.nombre if p.alumno else None,
        )
        for p in pagos
    ]


@router.get("/{id}/detalle", response_model=PagoDetalleOut)
async def detalle(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Pago)
        .options(
            selectinload(Pago.apoderado),
            selectinload(Pago.detalles).selectinload(PagoDetalle.consumo),
        )
        .where(Pago.id == id)
    )
    pago = result.scalar_one_or_none()
    if not pago:
        raise HTTPException(404)

    return PagoDetalleOut(
        id=pago.id,
        fecha=pago.fecha,
        monto=pago.monto,
        apoderado_id=pago.apoderado_id,
        apoderado_nombre=pago.apoderado.nombre,
        items=[
            PagoDetalleItemOut(
                consumo_id=pd.consumo_id,
                fecha_consumo=pd.consumo.fecha,
                tipo=pd.consumo.tipo,
                modalidad=pd.consumo.modalidad,
                precio_consumo=pd.consumo.precio,
                monto_aplicado=pd.monto_aplicado,
            )
            for pd in sorted(pago.detalles, key=lambda x: x.consumo.fecha)
        ],
    )


@router.post("", response_model=PagoOut, status_code=201)
async def registrar_pago(data: PagoCreate, db: AsyncSession = Depends(get_db)):
    pago = await aplicar_pago(db, data.apoderado_id, data.monto, data.fecha, data.alumno_id)
    return pago


@router.delete("/{id}", status_code=204)
async def anular(id: int, db: AsyncSession = Depends(get_db)):
    await anular_pago(db, id)
