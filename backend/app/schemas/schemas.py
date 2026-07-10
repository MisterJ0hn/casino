from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

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
    telefono: Optional[str] = None
    celular: Optional[str] = None


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
    es_principal: bool = False


class AlumnoApoderadoOut(AlumnoApoderadoCreate):
    id: int
    es_principal: bool = False
    model_config = {"from_attributes": True}


class VincularApoderadoIn(BaseModel):
    """Vincular un apoderado existente desde la pantalla del alumno."""
    apoderado_id: int
    es_principal: bool = False


class ApoderadoVinculoOut(BaseModel):
    """Apoderado vinculado a un alumno, con su rol."""
    vinculo_id: int
    apoderado_id: int
    rut: str
    nombre: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    celular: Optional[str] = None
    es_principal: bool = False


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
    alumno_id: Optional[int] = None  # pago dirigido a un alumno puntual


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
    alumno_id: Optional[int] = None
    alumno_nombre: Optional[str] = None


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


class CargaMasivaResult(BaseModel):
    commit: bool
    filas_total: int
    filas_ok: int
    filas_error: int
    cursos_creados: int
    alumnos_creados: int
    alumnos_actualizados: int
    apoderados_creados: int
    apoderados_actualizados: int
    vinculos_creados: int
    errores: list[str]


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
    colegios: list[ColegioOut] = []
    model_config = {"from_attributes": True}


class UsuarioCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    activo: bool = True
    colegio_ids: list[int] = []


class UsuarioUpdate(BaseModel):
    activo: bool = True
    colegio_ids: list[int] = []


class PasswordUpdate(BaseModel):
    password: str = Field(..., min_length=6)


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
    rebaja: Decimal = Decimal(0)
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


# ── Rebaja por tickets frecuentes ────────────────────────────────────────────

class ConfiguracionRebajaIn(BaseModel):
    colegio_id: int
    dias_minimos: int = Field(..., ge=1)
    monto: Decimal = Field(..., ge=0)
    activo: bool = True


class ConfiguracionRebajaOut(BaseModel):
    id: int
    colegio_id: int
    colegio_nombre: Optional[str] = None
    dias_minimos: int
    monto: Decimal
    activo: bool
    model_config = {"from_attributes": True}


class RebajaAplicarResult(BaseModel):
    anio: int
    mes: int
    rebajas: int
    monto_total: Decimal
    mensaje: str


# ── Informes / Deudas ────────────────────────────────────────────────────────

class ApoderadoDeudaOut(BaseModel):
    id: int
    rut: str
    nombre: str
    deuda: Decimal


class DeudaColegioOut(BaseModel):
    deuda_total: Decimal
    apoderados: list[ApoderadoDeudaOut]


# ── Paginación ───────────────────────────────────────────────────────────────

class AlumnoPage(BaseModel):
    items: list[AlumnoOut]
    total: int
    page: int
    page_size: int


class ApoderadoPage(BaseModel):
    items: list[ApoderadoOut]
    total: int
    page: int
    page_size: int


class CursoPage(BaseModel):
    items: list[CursoOut]
    total: int
    page: int
    page_size: int


class ConsumoPage(BaseModel):
    items: list[ConsumoListOut]
    total: int
    page: int
    page_size: int
