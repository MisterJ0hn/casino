from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, Numeric, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.domain.enums import Modalidad, TipoConsumo, OrigenConsumo


class Colegio(Base):
    __tablename__ = "colegio"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    cursos: Mapped[list["Curso"]] = relationship(back_populates="colegio")
    configuraciones: Mapped[list["ConfiguracionConsumo"]] = relationship(back_populates="colegio")


class Curso(Base):
    __tablename__ = "curso"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    colegio_id: Mapped[int] = mapped_column(ForeignKey("colegio.id"))
    nombre: Mapped[str] = mapped_column(String(50))
    nivel: Mapped[int] = mapped_column(Integer)

    colegio: Mapped["Colegio"] = relationship(back_populates="cursos")
    alumnos: Mapped[list["Alumno"]] = relationship(back_populates="curso")


class Alumno(Base):
    __tablename__ = "alumno"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rut: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(255))
    curso_id: Mapped[int] = mapped_column(ForeignKey("curso.id"))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    modalidad_override: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    precio_override: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    curso: Mapped["Curso"] = relationship(back_populates="alumnos")
    alumno_apoderados: Mapped[list["AlumnoApoderado"]] = relationship(back_populates="alumno")
    consumos: Mapped[list["Consumo"]] = relationship(back_populates="alumno")


class Apoderado(Base):
    __tablename__ = "apoderado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rut: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    telefono: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    celular: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    alumno_apoderados: Mapped[list["AlumnoApoderado"]] = relationship(back_populates="apoderado")
    pagos: Mapped[list["Pago"]] = relationship(back_populates="apoderado")


class AlumnoApoderado(Base):
    __tablename__ = "alumno_apoderado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("alumno.id"))
    apoderado_id: Mapped[int] = mapped_column(ForeignKey("apoderado.id"))

    alumno: Mapped["Alumno"] = relationship(back_populates="alumno_apoderados")
    apoderado: Mapped["Apoderado"] = relationship(back_populates="alumno_apoderados")


class ConfiguracionConsumo(Base):
    __tablename__ = "configuracion_consumo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    colegio_id: Mapped[int] = mapped_column(ForeignKey("colegio.id"))
    nivel_desde: Mapped[int] = mapped_column(Integer)
    nivel_hasta: Mapped[int] = mapped_column(Integer)
    modalidad: Mapped[str] = mapped_column(String(20))
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    colegio: Mapped["Colegio"] = relationship(back_populates="configuraciones")


class Consumo(Base):
    __tablename__ = "consumo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("alumno.id"))
    fecha: Mapped[date] = mapped_column(Date)
    tipo: Mapped[str] = mapped_column(String(20))
    modalidad: Mapped[str] = mapped_column(String(20))
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    precio_base: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    origen: Mapped[str] = mapped_column(String(20))
    pagado: Mapped[bool] = mapped_column(Boolean, default=False)

    alumno: Mapped["Alumno"] = relationship(back_populates="consumos")
    pago_detalles: Mapped[list["PagoDetalle"]] = relationship(back_populates="consumo")


usuario_colegio = Table(
    "usuario_colegio",
    Base.metadata,
    Column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True),
    Column("colegio_id", ForeignKey("colegio.id", ondelete="CASCADE"), primary_key=True),
)


class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    colegios: Mapped[list["Colegio"]] = relationship(secondary=usuario_colegio, lazy="selectin")


class DiaSinAlmuerzo(Base):
    __tablename__ = "dia_sin_almuerzo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[date] = mapped_column(Date)
    colegio_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    curso_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    alumno_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)


class Pago(Base):
    __tablename__ = "pago"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    apoderado_id: Mapped[int] = mapped_column(ForeignKey("apoderado.id"))
    fecha: Mapped[date] = mapped_column(Date)
    monto: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    apoderado: Mapped["Apoderado"] = relationship(back_populates="pagos")
    detalles: Mapped[list["PagoDetalle"]] = relationship(back_populates="pago")


class PagoDetalle(Base):
    __tablename__ = "pago_detalle"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pago_id: Mapped[int] = mapped_column(ForeignKey("pago.id"))
    consumo_id: Mapped[int] = mapped_column(ForeignKey("consumo.id"))
    monto_aplicado: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    pago: Mapped["Pago"] = relationship(back_populates="detalles")
    consumo: Mapped["Consumo"] = relationship(back_populates="pago_detalles")
