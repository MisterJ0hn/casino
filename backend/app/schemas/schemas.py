from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.domain.enums import Modalidad, TipoConsumo, OrigenConsumo


# ── Colegio ──────────────────────────────────────────────────────────────────

class ColegioBase(BaseModel):
    nombre: str
    activo: bool = True


class ColegioCreate(ColegioBase):
    pass


class ColegioOut(ColegioBase):
    id: int
    model_config = {"from_attributes": True}


# ── Curso ────────────────────────────────────────────────────────────────────

class CursoBase(BaseModel):
    colegio_id: int
    nombre: str
    nivel: int


class CursoCreate(CursoBase):
    pass


class CursoOut(CursoBase):
    id: int
    model_config = {"from_attributes": True}


# ── Alumno ───────────────────────────────────────────────────────────────────

class AlumnoBase(BaseModel):
    rut: str
    nombre: str
    curso_id: int
    activo: bool = True
    modalidad_override: Optional[Modalidad] = None
    precio_override: Optional[Decimal] = None


class AlumnoCreate(AlumnoBase):
    pass


class AlumnoUpdate(AlumnoBase):
    pass


class AlumnoOut(AlumnoBase):
    id: int
    model_config = {"from_attributes": True}


# ── Apoderado ────────────────────────────────────────────────────────────────

class ApoderadoBase(BaseModel):
    rut: str
    nombre: str
    email: str


class ApoderadoCreate(ApoderadoBase):
    pass


class ApoderadoOut(ApoderadoBase):
    id: int
    model_config = {"from_attributes": True}


# ── AlumnoApoderado ──────────────────────────────────────────────────────────

class AlumnoApoderadoCreate(BaseModel):
    alumno_id: int
    apoderado_id: int


class VincularHijoIn(BaseModel):
    alumno_id: int


class AlumnoApoderadoOut(AlumnoApoderadoCreate):
    id: int
    model_config = {"from_attributes": True}


# ── ConfiguracionConsumo ─────────────────────────────────────────────────────

class ConfiguracionBase(BaseModel):
    colegio_id: int
    nivel_desde: int
    nivel_hasta: int
    modalidad: Modalidad
    precio: Decimal
    activo: bool = True


class ConfiguracionCreate(ConfiguracionBase):
    pass


class ConfiguracionOut(ConfiguracionBase):
    id: int
    model_config = {"from_attributes": True}


# ── Consumo ──────────────────────────────────────────────────────────────────

class ConsumoOut(BaseModel):
    id: int
    alumno_id: int
    fecha: date
    tipo: str
    modalidad: str
    precio: Decimal
    precio_base: Decimal
    origen: str
    pagado: bool
    model_config = {"from_attributes": True}


class ConsumoListOut(ConsumoOut):
    alumno_nombre: Optional[str] = None
    curso_nombre: Optional[str] = None
    colegio_nombre: Optional[str] = None


# ── Pago ─────────────────────────────────────────────────────────────────────

class PagoCreate(BaseModel):
    apoderado_id: int
    monto: Decimal
    fecha: date


class PagoOut(BaseModel):
    id: int
    apoderado_id: int
    fecha: date
    monto: Decimal
    model_config = {"from_attributes": True}


class PagoListOut(BaseModel):
    id: int
    fecha: date
    monto: Decimal
    apoderado_id: int
    apoderado_rut: str
    apoderado_nombre: str


class PagoDetalleItemOut(BaseModel):
    consumo_id: int
    fecha_consumo: date
    tipo: str
    modalidad: str
    precio_consumo: Decimal
    monto_aplicado: Decimal


class PagoDetalleOut(BaseModel):
    id: int
    fecha: date
    monto: Decimal
    apoderado_id: int
    apoderado_nombre: str
    items: list[PagoDetalleItemOut]


# ── Importación Excel ────────────────────────────────────────────────────────

class ImportResult(BaseModel):
    procesados: int
    errores: int
    mensajes: list[str]


# ── Deuda ────────────────────────────────────────────────────────────────────

class DeudaOut(BaseModel):
    apoderado_id: int
    deuda: Decimal


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    id: int
    username: str
    activo: bool


# ── Días sin almuerzo ─────────────────────────────────────────────────────────

class DiaSinAlmuerzoIn(BaseModel):
    fecha: date
    colegio_id: Optional[int] = None
    curso_id: Optional[int] = None
    alumno_id: Optional[int] = None


class DiaSinAlmuerzoOut(DiaSinAlmuerzoIn):
    id: int
    colegio_nombre: Optional[str] = None
    curso_nombre: Optional[str] = None
    alumno_nombre: Optional[str] = None
    consumos_eliminados: int = 0
    model_config = {"from_attributes": True}


# ── Portal Apoderado ──────────────────────────────────────────────────────────

class ConsumoPortalOut(BaseModel):
    id: int
    fecha: date
    tipo: str
    modalidad: str
    precio: Decimal
    pagado: bool


class PeriodoPortalOut(BaseModel):
    anio: int
    mes: int
    nombre_mes: str
    total_consumo: Decimal
    total_pagado: Decimal
    total_pendiente: Decimal
    dias_libres: list[str]
    consumos: list[ConsumoPortalOut]


class HijoPortalOut(BaseModel):
    id: int
    nombre: str
    rut: str
    curso_nombre: str
    colegio_nombre: str
    periodos: list[PeriodoPortalOut]


class PortalOut(BaseModel):
    apoderado_id: int
    deuda_total: Decimal
    hijos: list[HijoPortalOut]
