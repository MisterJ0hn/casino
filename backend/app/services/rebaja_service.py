import calendar
from datetime import date
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import TipoConsumo
from app.models.models import Alumno, ConfiguracionRebaja, Consumo, Curso, Rebaja
from app.schemas.schemas import RebajaAplicarResult


async def aplicar_rebajas(db: AsyncSession, anio: int, mes: int) -> RebajaAplicarResult:
    """Recalcula las rebajas del mes: por cada alumno con modalidad TICKET cuyo
    número de días con ticket en el mes alcance el umbral del colegio, registra
    una rebaja del monto configurado. Es idempotente (borra y recrea el mes)."""
    res_cfg = await db.execute(
        select(ConfiguracionRebaja).where(ConfiguracionRebaja.activo == True)
    )
    configs = {c.colegio_id: c for c in res_cfg.scalars().all()}

    ultimo_dia = calendar.monthrange(anio, mes)[1]
    inicio, fin = date(anio, mes, 1), date(anio, mes, ultimo_dia)

    res = await db.execute(
        select(Alumno.id, Curso.colegio_id, func.count(Consumo.id))
        .join(Consumo, Consumo.alumno_id == Alumno.id)
        .join(Curso, Alumno.curso_id == Curso.id)
        .where(
            Consumo.tipo == TipoConsumo.TICKET.value,
            Consumo.fecha >= inicio,
            Consumo.fecha <= fin,
        )
        .group_by(Alumno.id, Curso.colegio_id)
    )
    conteos = res.all()

    # Recalcular desde cero para este mes
    await db.execute(delete(Rebaja).where(Rebaja.anio == anio, Rebaja.mes == mes))

    creadas = 0
    monto_total = Decimal("0")
    for alumno_id, colegio_id, dias in conteos:
        cfg = configs.get(colegio_id)
        if cfg and dias >= cfg.dias_minimos:
            db.add(Rebaja(alumno_id=alumno_id, anio=anio, mes=mes, dias=dias, monto=cfg.monto))
            creadas += 1
            monto_total += cfg.monto

    await db.commit()
    return RebajaAplicarResult(
        anio=anio,
        mes=mes,
        rebajas=creadas,
        monto_total=monto_total,
        mensaje=f"{creadas} rebaja(s) aplicada(s) para {mes:02d}/{anio} por un total de ${monto_total:.0f}.",
    )
