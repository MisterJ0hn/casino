from enum import Enum


class Modalidad(str, Enum):
    MENSUAL = "MENSUAL"
    TICKET = "TICKET"
    BECADO = "BECADO"
    TERMO = "TERMO"


class TipoConsumo(str, Enum):
    MENSUAL = "MENSUAL"
    TICKET = "TICKET"


class OrigenConsumo(str, Enum):
    AUTOMATICO = "AUTOMATICO"
    EXCEL = "EXCEL"
