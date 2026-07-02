from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.domain.enums import Modalidad
from app.services.rule_engine import ConsumoRuleEngine


def make_alumno(nivel: int, modalidad_override=None, precio_override=None):
    alumno = MagicMock()
    alumno.modalidad_override = modalidad_override
    alumno.precio_override = precio_override
    alumno.curso.nivel = nivel
    alumno.curso.colegio_id = 1
    return alumno


def make_config(nivel_desde, nivel_hasta, modalidad, precio, activo=True):
    c = MagicMock()
    c.nivel_desde = nivel_desde
    c.nivel_hasta = nivel_hasta
    c.modalidad = modalidad
    c.precio = Decimal(str(precio))
    c.activo = activo
    c.colegio_id = 1
    return c


class TestConsumoRuleEngine:
    def setup_method(self):
        self.engine = ConsumoRuleEngine()

    def test_override_mensual(self):
        alumno = make_alumno(3, modalidad_override="MENSUAL", precio_override=Decimal("5000"))
        result = self.engine.resolver(alumno, [])
        assert result.modalidad == Modalidad.MENSUAL
        assert result.precio == Decimal("5000")

    def test_override_becado_precio_cero(self):
        alumno = make_alumno(3, modalidad_override="BECADO")
        result = self.engine.resolver(alumno, [])
        assert result.modalidad == Modalidad.BECADO
        assert result.precio == Decimal("0")

    def test_override_termo_precio_cero(self):
        alumno = make_alumno(5, modalidad_override="TERMO")
        result = self.engine.resolver(alumno, [])
        assert result.precio == Decimal("0")

    def test_config_por_nivel(self):
        alumno = make_alumno(nivel=3)
        configs = [
            make_config(1, 4, "MENSUAL", 4500),
            make_config(5, 8, "TICKET", 600),
        ]
        result = self.engine.resolver(alumno, configs)
        assert result.modalidad == Modalidad.MENSUAL
        assert result.precio == Decimal("4500")

    def test_config_nivel_alto(self):
        alumno = make_alumno(nivel=7)
        configs = [
            make_config(1, 4, "MENSUAL", 4500),
            make_config(5, 8, "TICKET", 600),
        ]
        result = self.engine.resolver(alumno, configs)
        assert result.modalidad == Modalidad.TICKET

    def test_sin_config_retorna_none(self):
        alumno = make_alumno(nivel=10)
        result = self.engine.resolver(alumno, [])
        assert result is None

    def test_config_inactiva_ignorada(self):
        alumno = make_alumno(nivel=3)
        configs = [make_config(1, 8, "MENSUAL", 4500, activo=False)]
        result = self.engine.resolver(alumno, configs)
        assert result is None
