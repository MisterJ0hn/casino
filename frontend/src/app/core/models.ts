export type Modalidad = 'MENSUAL' | 'TICKET' | 'BECADO' | 'TERMO';
export type TipoConsumo = 'MENSUAL' | 'TICKET';
export type OrigenConsumo = 'AUTOMATICO' | 'EXCEL';

export interface Colegio {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface Curso {
  id: number;
  colegio_id: number;
  nombre: string;
  nivel: number;
}

export interface Alumno {
  id: number;
  rut: string;
  nombre: string;
  curso_id: number;
  activo: boolean;
  modalidad_override?: Modalidad;
  precio_override?: number;
}

export interface Apoderado {
  id: number;
  rut: string;
  nombre: string;
  email: string;
}

export interface ConfiguracionConsumo {
  id: number;
  colegio_id: number;
  nivel_desde: number;
  nivel_hasta: number;
  modalidad: Modalidad;
  precio: number;
  activo: boolean;
}

export interface Consumo {
  id: number;
  alumno_id: number;
  fecha: string;
  tipo: TipoConsumo;
  modalidad: Modalidad;
  precio: number;
  precio_base: number;
  origen: OrigenConsumo;
  pagado: boolean;
  alumno_nombre?: string;
  curso_nombre?: string;
  colegio_nombre?: string;
}

export interface Pago {
  id: number;
  apoderado_id: number;
  fecha: string;
  monto: number;
}

export interface PagoList {
  id: number;
  fecha: string;
  monto: number;
  apoderado_id: number;
  apoderado_rut: string;
  apoderado_nombre: string;
}

export interface PagoDetalleItem {
  consumo_id: number;
  fecha_consumo: string;
  tipo: string;
  modalidad: string;
  precio_consumo: number;
  monto_aplicado: number;
}

export interface PagoDetalle {
  id: number;
  fecha: string;
  monto: number;
  apoderado_id: number;
  apoderado_nombre: string;
  items: PagoDetalleItem[];
}

export interface DeudaOut {
  apoderado_id: number;
  deuda: number;
}

export interface DiaSinAlmuerzo {
  id: number;
  fecha: string;
  colegio_id?: number;
  curso_id?: number;
  alumno_id?: number;
  colegio_nombre?: string;
  curso_nombre?: string;
  alumno_nombre?: string;
  consumos_eliminados?: number;
}

export interface ImportResult {
  procesados: number;
  errores: number;
  mensajes: string[];
}

export interface ConsumoPortal {
  id: number;
  fecha: string;
  tipo: string;
  modalidad: string;
  precio: number;
  pagado: boolean;
}

export interface PeriodoPortal {
  anio: number;
  mes: number;
  nombre_mes: string;
  total_consumo: number;
  total_pagado: number;
  total_pendiente: number;
  dias_libres: string[];
  consumos: ConsumoPortal[];
}

export interface HijoPortal {
  id: number;
  nombre: string;
  rut: string;
  curso_nombre: string;
  colegio_nombre: string;
  periodos: PeriodoPortal[];
}

export interface PortalOut {
  apoderado_id: number;
  deuda_total: number;
  hijos: HijoPortal[];
}
