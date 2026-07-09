from collections import defaultdict
from decimal import Decimal

from fpdf import FPDF
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Alumno, AlumnoApoderado, Apoderado, Consumo, Curso, Rebaja

_MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]


def _money(v: Decimal) -> str:
    return "$" + f"{v:,.0f}".replace(",", ".")


def _txt(s: str) -> str:
    return (s or "").encode("latin-1", "replace").decode("latin-1")


async def _consumo_pagado_por_mes(db: AsyncSession, alumno_ids: list[int]):
    """Devuelve (consumo_mes, pagado_mes, rebajas) indexados por (alumno_id, anio, mes)."""
    res = await db.execute(
        select(Consumo).options(selectinload(Consumo.pago_detalles))
        .where(Consumo.alumno_id.in_(alumno_ids))
    )
    consumos = res.scalars().all()
    res_r = await db.execute(select(Rebaja).where(Rebaja.alumno_id.in_(alumno_ids)))
    rebajas = {(r.alumno_id, r.anio, r.mes): r.monto for r in res_r.scalars().all()}

    consumo_mes: dict = defaultdict(lambda: Decimal("0"))
    pagado_mes: dict = defaultdict(lambda: Decimal("0"))
    for c in consumos:
        key = (c.alumno_id, c.fecha.year, c.fecha.month)
        consumo_mes[key] += c.precio
        paid = sum((pd.monto_aplicado for pd in c.pago_detalles), Decimal("0"))
        if c.pagado and not c.pago_detalles:
            paid = c.precio
        pagado_mes[key] += paid
    return consumo_mes, pagado_mes, rebajas


async def deudas_por_colegio(db: AsyncSession, colegio_id: int) -> dict:
    res = await db.execute(
        select(Alumno).join(Curso, Alumno.curso_id == Curso.id)
        .where(Curso.colegio_id == colegio_id, Alumno.activo == True)
    )
    alumnos = res.scalars().all()
    if not alumnos:
        return {"deuda_total": Decimal("0"), "apoderados": []}
    alumno_ids = [a.id for a in alumnos]

    consumo_mes, pagado_mes, rebajas = await _consumo_pagado_por_mes(db, alumno_ids)

    # saldo pendiente por (alumno, mes)
    saldo: dict = {}
    for key, consumo in consumo_mes.items():
        adeudado = consumo - rebajas.get(key, Decimal("0"))
        saldo[key] = adeudado - pagado_mes.get(key, Decimal("0"))

    deuda_total = sum((s for s in saldo.values() if s > 0), Decimal("0"))

    # apoderados de esos alumnos
    res = await db.execute(
        select(AlumnoApoderado.alumno_id, Apoderado)
        .join(Apoderado, Apoderado.id == AlumnoApoderado.apoderado_id)
        .where(AlumnoApoderado.alumno_id.in_(alumno_ids))
    )
    apo_alumnos: dict = defaultdict(set)
    apo_info: dict = {}
    for alumno_id, apo in res.all():
        apo_alumnos[apo.id].add(alumno_id)
        apo_info[apo.id] = apo

    apoderados_out = []
    for apo_id, al_ids in apo_alumnos.items():
        deuda = sum(
            (s for (a_id, _an, _me), s in saldo.items() if a_id in al_ids and s > 0),
            Decimal("0"),
        )
        apo = apo_info[apo_id]
        apoderados_out.append({"id": apo_id, "rut": apo.rut, "nombre": apo.nombre, "deuda": deuda})

    apoderados_out.sort(key=lambda x: (-x["deuda"], x["nombre"]))
    return {"deuda_total": deuda_total, "apoderados": apoderados_out}


async def breakdown_apoderado(db: AsyncSession, apoderado_id: int) -> dict | None:
    apo = await db.get(Apoderado, apoderado_id)
    if not apo:
        return None
    res = await db.execute(
        select(Alumno).join(AlumnoApoderado, AlumnoApoderado.alumno_id == Alumno.id)
        .where(AlumnoApoderado.apoderado_id == apoderado_id).order_by(Alumno.nombre)
    )
    alumnos = res.scalars().all()
    nombre_alumno = {a.id: a.nombre for a in alumnos}
    alumno_ids = list(nombre_alumno.keys())

    rows = []
    deuda_total = Decimal("0")
    pagado_total = Decimal("0")
    a_favor_total = Decimal("0")

    if alumno_ids:
        consumo_mes, pagado_mes, rebajas = await _consumo_pagado_por_mes(db, alumno_ids)
        for key in sorted(consumo_mes.keys(), key=lambda k: (nombre_alumno[k[0]], k[1], k[2])):
            a_id, anio, mes = key
            adeudado = consumo_mes[key] - rebajas.get(key, Decimal("0"))
            pagado = pagado_mes.get(key, Decimal("0"))
            rows.append({"alumno": nombre_alumno[a_id], "anio": anio, "mes": mes,
                         "adeudado": adeudado, "pagado": pagado})
            pagado_total += pagado
            s = adeudado - pagado
            if s > 0:
                deuda_total += s
            else:
                a_favor_total += -s

    return {
        "apoderado": apo,
        "rows": rows,
        "deuda_total": deuda_total,
        "pagado_total": pagado_total,
        "a_favor_total": a_favor_total,
    }


def build_pdf(data: dict) -> bytes:
    apo = data["apoderado"]
    pdf = FPDF()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Informe de Deuda", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, _txt(f"Apoderado: {apo.nombre}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, _txt(f"RUT: {apo.rut}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, _txt(f"Email: {apo.email or '-'}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, _txt(f"Telefono: {apo.telefono or apo.celular or '-'}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, _txt(f"Deuda total: {_money(data['deuda_total'])}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, _txt(f"Pagado total: {_money(data['pagado_total'])}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, _txt(f"Saldos a favor: {_money(data['a_favor_total'])}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    widths = [75, 20, 30, 30, 30]
    headers = ["Alumno", "Año", "Mes", "Adeudado", "Pagado"]
    pdf.set_font("Helvetica", "B", 10)
    for w, h in zip(widths, headers):
        pdf.cell(w, 8, _txt(h), border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 9)
    for r in data["rows"]:
        pdf.cell(widths[0], 7, _txt(r["alumno"])[:45], border=1)
        pdf.cell(widths[1], 7, str(r["anio"]), border=1)
        pdf.cell(widths[2], 7, _MESES[r["mes"] - 1], border=1)
        pdf.cell(widths[3], 7, _money(r["adeudado"]), border=1, align="R")
        pdf.cell(widths[4], 7, _money(r["pagado"]), border=1, align="R")
        pdf.ln()

    if not data["rows"]:
        pdf.set_font("Helvetica", "I", 9)
        pdf.cell(sum(widths), 7, _txt("Sin movimientos"), border=1, align="C")
        pdf.ln()

    return bytes(pdf.output())
