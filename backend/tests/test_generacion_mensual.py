from datetime import date

import pytest

from app.services.generacion_mensual import _dias_habiles, _es_dia_sin_almuerzo


def test_dias_habiles_no_incluye_fines_de_semana():
    dias = _dias_habiles(2024, 4)
    for d in dias:
        assert d.weekday() < 5, f"{d} es fin de semana"


def test_dias_habiles_abril_2024():
    dias = _dias_habiles(2024, 4)
    assert len(dias) == 22  # Abril 2024 tiene 22 días hábiles


def test_es_dia_sin_almuerzo_global():
    from unittest.mock import MagicMock
    dia = MagicMock()
    dia.fecha = date(2024, 4, 1)
    dia.colegio_id = None
    dia.curso_id = None
    dia.alumno_id = None

    alumno = MagicMock()
    alumno.id = 1
    alumno.curso_id = 10
    alumno.curso.colegio_id = 5

    assert _es_dia_sin_almuerzo([dia], date(2024, 4, 1), alumno) is True


def test_es_dia_sin_almuerzo_otro_colegio():
    from unittest.mock import MagicMock
    dia = MagicMock()
    dia.fecha = date(2024, 4, 1)
    dia.colegio_id = 99  # otro colegio
    dia.curso_id = None
    dia.alumno_id = None

    alumno = MagicMock()
    alumno.id = 1
    alumno.curso_id = 10
    alumno.curso.colegio_id = 5

    assert _es_dia_sin_almuerzo([dia], date(2024, 4, 1), alumno) is False
