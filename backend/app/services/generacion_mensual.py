import calendar
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.enums import Modalidad, TipoConsumo, OrigenConsumo
from app.models.models import Alumno, ConfiguracionConsumo, Consumo, DiaSinAlmuerzo
from app.services.rule_engine import ConsumoRuleEngine


def _dias_habiles(anio: int, mes: int) -> list[date]:
    dias = []
    for d in range(1, calendar.monthrange(anio, mes)[1] + 1):
        fecha = date(anio, mes, d)
        if fecha.weekday() < 5:  # lun–vie
            dias.append(fecha)
    return dias


def _es_dia_sin_almuerzo(
    dias_sin: list[DiaSinAlmuerzo],
    fecha: date,
    alumno: Alumno,
) -> bool:
    for d in dias_sin:
        if d.fecha != fecha:
            continue
        if d.colegio_id and d.colegio_id != alumno.curso.colegio_id:
            continue
        if d.curso_id and d.curso_id != alumno.curso_id:
            continue
        if d.alumno_id and d.alumno_id != alumno.id:
            continue
        return True
    return False


async def generar_consumos_mensuales(db: AsyncSession, anio: int, mes: int) -> int:
    rule_engine = ConsumoRuleEngine()

    result = await db.execute(
        select(Alumno)
        .options(selectinload(Alumno.curso))
        .where(Alumno.activo == True)
    )
    alumnos = result.scalars().all()

    result_config = await db.execute(
        select(ConfiguracionConsumo).where(ConfiguracionConsumo.activo == True)
    )
    configuraciones = result_config.scalars().all()

    result_dias = await db.execute(
        select(DiaSinAlmuerzo).where(
            DiaSinAlmuerzo.fecha >= date(anio, mes, 1),
            DiaSinAlmuerzo.fecha <= date(anio, mes, calendar.monthrange(anio, mes)[1]),
        )
    )
    dias_sin = result_dias.scalars().all()

    dias_habiles = _dias_habiles(anio, mes)
    generados = 0

    for alumno in alumnos:
        configs_colegio = [c for c in configuraciones if c.colegio_id == alumno.curso.colegio_id]
        reglas = rule_engine.resolver(alumno, configs_colegio)

        if reglas is None or reglas.modalidad != Modalidad.MENSUAL:
            continue

        for dia in dias_habiles:
            if _es_dia_sin_almuerzo(dias_sin, dia, alumno):
                continue

            existe = await db.execute(
                select(Consumo).where(
                    Consumo.alumno_id == alumno.id,
                    Consumo.fecha == dia,
                    Consumo.tipo == TipoConsumo.MENSUAL.value,
                )
            )
            if existe.scalar_one_or_none():
                continue

            db.add(Consumo(
                alumno_id=alumno.id,
                fecha=dia,
                tipo=TipoConsumo.MENSUAL.value,
                modalidad=reglas.modalidad.value,
                precio=reglas.precio,
                precio_base=reglas.precio,
                origen=OrigenConsumo.AUTOMATICO.value,
                pagado=False,
            ))
            generados += 1

    await db.commit()
    return generados
