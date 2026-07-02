from decimal import Decimal
from typing import Optional

from app.domain.enums import Modalidad
from app.models.models import Alumno, ConfiguracionConsumo


class ReglasConsumo:
    def __init__(self, modalidad: Modalidad, precio: Decimal):
        self.modalidad = modalidad
        self.precio = precio


class ConsumoRuleEngine:
    def resolver(
        self,
        alumno: Alumno,
        configuraciones: list[ConfiguracionConsumo],
    ) -> Optional[ReglasConsumo]:
        # Override del alumno tiene prioridad total
        if alumno.modalidad_override:
            modalidad = Modalidad(alumno.modalidad_override)
            precio = Decimal("0") if modalidad in (Modalidad.BECADO, Modalidad.TERMO) else (alumno.precio_override or Decimal("0"))
            return ReglasConsumo(modalidad=modalidad, precio=precio)

        nivel = alumno.curso.nivel

        for config in configuraciones:
            if config.activo and config.nivel_desde <= nivel <= config.nivel_hasta:
                return ReglasConsumo(modalidad=Modalidad(config.modalidad), precio=config.precio)

        return None
