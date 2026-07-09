from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Alumno, AlumnoApoderado, Consumo, Pago, PagoDetalle, Rebaja


async def get_deuda_apoderado(db: AsyncSession, apoderado_id: int) -> Decimal:
    result = await db.execute(
        select(Consumo)
        .join(Alumno)
        .join(AlumnoApoderado)
        .options(selectinload(Consumo.pago_detalles))
        .where(
            AlumnoApoderado.apoderado_id == apoderado_id,
            Consumo.pagado == False,
        )
    )
    consumos = result.scalars().all()

    # Saldo pendiente agrupado por (alumno, año, mes) para poder restar la
    # rebaja de ese mes sin cruzar meses.
    saldo: dict[tuple, Decimal] = {}
    alumno_ids: set[int] = set()
    for c in consumos:
        pagado_parcial = sum(pd.monto_aplicado for pd in c.pago_detalles)
        key = (c.alumno_id, c.fecha.year, c.fecha.month)
        saldo[key] = saldo.get(key, Decimal("0")) + (c.precio - pagado_parcial)
        alumno_ids.add(c.alumno_id)

    if alumno_ids:
        res_r = await db.execute(select(Rebaja).where(Rebaja.alumno_id.in_(alumno_ids)))
        for r in res_r.scalars().all():
            key = (r.alumno_id, r.anio, r.mes)
            if key in saldo:
                saldo[key] = max(Decimal("0"), saldo[key] - r.monto)

    return sum(saldo.values(), Decimal("0"))


async def aplicar_pago(
    db: AsyncSession,
    apoderado_id: int,
    monto: Decimal,
    fecha: date,
) -> Pago:
    pago = Pago(apoderado_id=apoderado_id, fecha=fecha, monto=monto)
    db.add(pago)
    await db.flush()  # obtener pago.id

    # Consumos pendientes en orden FIFO
    result = await db.execute(
        select(Consumo)
        .join(Alumno)
        .join(AlumnoApoderado)
        .options(selectinload(Consumo.pago_detalles))
        .where(
            AlumnoApoderado.apoderado_id == apoderado_id,
            Consumo.pagado == False,
        )
        .order_by(Consumo.fecha.asc())
    )
    consumos = result.scalars().all()

    saldo = monto
    for consumo in consumos:
        if saldo <= 0:
            break

        pagado_parcial = sum(pd.monto_aplicado for pd in consumo.pago_detalles)
        pendiente = consumo.precio - pagado_parcial
        if pendiente <= 0:
            continue

        aplicar = min(saldo, pendiente)
        db.add(PagoDetalle(
            pago_id=pago.id,
            consumo_id=consumo.id,
            monto_aplicado=aplicar,
        ))
        saldo -= aplicar

        if pendiente - aplicar <= Decimal("0.001"):
            consumo.pagado = True

    await db.commit()
    await db.refresh(pago)
    return pago


async def anular_pago(db: AsyncSession, pago_id: int) -> None:
    result = await db.execute(
        select(Pago)
        .options(selectinload(Pago.detalles))
        .where(Pago.id == pago_id)
    )
    pago = result.scalar_one_or_none()
    if not pago:
        raise HTTPException(404)

    consumo_ids = [pd.consumo_id for pd in pago.detalles]

    for pd in list(pago.detalles):
        await db.delete(pd)
    await db.flush()

    for consumo_id in consumo_ids:
        res = await db.execute(
            select(Consumo)
            .options(selectinload(Consumo.pago_detalles))
            .where(Consumo.id == consumo_id)
        )
        consumo = res.scalar_one_or_none()
        if consumo:
            total = sum(pd.monto_aplicado for pd in consumo.pago_detalles)
            if total < consumo.precio:
                consumo.pagado = False

    await db.delete(pago)
    await db.commit()
