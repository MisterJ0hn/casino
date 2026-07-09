import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Alumno, Apoderado, CargaMasivaResult, Colegio, ConfiguracionConsumo, ConfiguracionRebaja, ConsumoFiltro,
  Consumo, Curso, DeudaColegio, DeudaOut, DiaSinAlmuerzo, ImportResult, Page, Pago, PagoList, PagoDetalle, PortalOut, RebajaResult, Usuario,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Colegios ─────────────────────────────────────────────────────────────
  getColegios(): Observable<Colegio[]> {
    return this.http.get<Colegio[]>(`${this.base}/colegios`);
  }
  createColegio(data: Partial<Colegio>): Observable<Colegio> {
    return this.http.post<Colegio>(`${this.base}/colegios`, data);
  }
  updateColegio(id: number, data: Partial<Colegio>): Observable<Colegio> {
    return this.http.put<Colegio>(`${this.base}/colegios/${id}`, data);
  }
  getConfiguracion(colegioId: number): Observable<ConfiguracionConsumo[]> {
    return this.http.get<ConfiguracionConsumo[]>(`${this.base}/colegios/${colegioId}/configuracion`);
  }

  // ── Cursos ───────────────────────────────────────────────────────────────
  getCursos(colegioId?: number): Observable<Curso[]> {
    let p = new HttpParams();
    if (colegioId != null) p = p.set('colegio_id', colegioId);
    return this.http.get<Curso[]>(`${this.base}/cursos`, { params: p });
  }
  getCursosByColegio(colegioId: number): Observable<Curso[]> {
    return this.http.get<Curso[]>(`${this.base}/colegios/${colegioId}/cursos`);
  }
  createCurso(data: Partial<Curso>): Observable<Curso> {
    return this.http.post<Curso>(`${this.base}/cursos`, data);
  }
  updateCurso(id: number, data: Partial<Curso>): Observable<Curso> {
    return this.http.put<Curso>(`${this.base}/cursos/${id}`, data);
  }
  deleteCurso(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/cursos/${id}`);
  }

  // ── Alumnos ───────────────────────────────────────────────────────────────
  getAlumnos(): Observable<Alumno[]> {
    return this.http.get<Alumno[]>(`${this.base}/alumnos`);
  }
  getAlumno(id: number): Observable<Alumno> {
    return this.http.get<Alumno>(`${this.base}/alumnos/${id}`);
  }
  createAlumno(data: Partial<Alumno>): Observable<Alumno> {
    return this.http.post<Alumno>(`${this.base}/alumnos`, data);
  }
  updateAlumno(id: number, data: Partial<Alumno>): Observable<Alumno> {
    return this.http.put<Alumno>(`${this.base}/alumnos/${id}`, data);
  }

  // ── Apoderados ────────────────────────────────────────────────────────────
  getApoderados(): Observable<Apoderado[]> {
    return this.http.get<Apoderado[]>(`${this.base}/apoderados`);
  }
  createApoderado(data: Partial<Apoderado>): Observable<Apoderado> {
    return this.http.post<Apoderado>(`${this.base}/apoderados`, data);
  }
  updateApoderado(id: number, data: Partial<Apoderado>): Observable<Apoderado> {
    return this.http.put<Apoderado>(`${this.base}/apoderados/${id}`, data);
  }
  getDeuda(apoderadoId: number): Observable<DeudaOut> {
    return this.http.get<DeudaOut>(`${this.base}/apoderados/${apoderadoId}/deuda`);
  }
  getConsumosApoderado(apoderadoId: number): Observable<Consumo[]> {
    return this.http.get<Consumo[]>(`${this.base}/apoderados/${apoderadoId}/consumos`);
  }
  getPortal(apoderadoId: number): Observable<PortalOut> {
    return this.http.get<PortalOut>(`${this.base}/apoderados/${apoderadoId}/portal`);
  }
  getHijos(apoderadoId: number): Observable<Alumno[]> {
    return this.http.get<Alumno[]>(`${this.base}/apoderados/${apoderadoId}/hijos`);
  }
  vincularHijo(apoderadoId: number, alumnoId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/apoderados/${apoderadoId}/hijos`, { alumno_id: alumnoId });
  }
  desvincularHijo(apoderadoId: number, alumnoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/apoderados/${apoderadoId}/hijos/${alumnoId}`);
  }

  // ── Consumos ──────────────────────────────────────────────────────────────
  private consumoParams(params?: ConsumoFiltro): HttpParams {
    let p = new HttpParams();
    if (params?.alumno_id)     p = p.set('alumno_id',     params.alumno_id);
    if (params?.curso_id)      p = p.set('curso_id',      params.curso_id);
    if (params?.colegio_id)    p = p.set('colegio_id',    params.colegio_id);
    if (params?.apoderado_id)  p = p.set('apoderado_id',  params.apoderado_id);
    if (params?.alumno_rut)    p = p.set('alumno_rut',    params.alumno_rut);
    if (params?.apoderado_rut) p = p.set('apoderado_rut', params.apoderado_rut);
    if (params?.anio)          p = p.set('anio',          params.anio);
    if (params?.mes)           p = p.set('mes',           params.mes);
    if (params?.page)          p = p.set('page',          params.page);
    if (params?.page_size)     p = p.set('page_size',     params.page_size);
    return p;
  }
  getConsumos(params?: ConsumoFiltro): Observable<Page<Consumo>> {
    return this.http.get<Page<Consumo>>(`${this.base}/consumos`, { params: this.consumoParams(params) });
  }
  exportConsumos(params?: ConsumoFiltro): Observable<Blob> {
    return this.http.get(`${this.base}/consumos/export`, { params: this.consumoParams(params), responseType: 'blob' });
  }
  generarMensual(anio: number, mes: number): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(
      `${this.base}/consumos/generar-mensual`,
      null,
      { params: new HttpParams().set('anio', anio).set('mes', mes) }
    );
  }
  importarExcel(file: File): Observable<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ImportResult>(`${this.base}/consumos/import-excel`, form);
  }

  // ── Pagos ─────────────────────────────────────────────────────────────────
  getPagos(): Observable<PagoList[]> {
    return this.http.get<PagoList[]>(`${this.base}/pagos`);
  }
  getPagoDetalle(id: number): Observable<PagoDetalle> {
    return this.http.get<PagoDetalle>(`${this.base}/pagos/${id}/detalle`);
  }
  registrarPago(data: { apoderado_id: number; monto: number; fecha: string }): Observable<Pago> {
    return this.http.post<Pago>(`${this.base}/pagos`, data);
  }
  anularPago(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/pagos/${id}`);
  }

  // ── Días Libres ───────────────────────────────────────────────────────────
  getDiasLibres(): Observable<DiaSinAlmuerzo[]> {
    return this.http.get<DiaSinAlmuerzo[]>(`${this.base}/dias-libres`);
  }
  createDiaLibre(data: Partial<DiaSinAlmuerzo>): Observable<DiaSinAlmuerzo> {
    return this.http.post<DiaSinAlmuerzo>(`${this.base}/dias-libres`, data);
  }
  deleteDiaLibre(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/dias-libres/${id}`);
  }

  // ── Configuración ─────────────────────────────────────────────────────────
  getConfiguraciones(): Observable<ConfiguracionConsumo[]> {
    return this.http.get<ConfiguracionConsumo[]>(`${this.base}/configuracion`);
  }
  createConfiguracion(data: Partial<ConfiguracionConsumo>): Observable<ConfiguracionConsumo> {
    return this.http.post<ConfiguracionConsumo>(`${this.base}/configuracion`, data);
  }
  deleteConfiguracion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/configuracion/${id}`);
  }

  // ── Usuarios ──────────────────────────────────────────────────────────────
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.base}/usuarios`);
  }
  createUsuario(data: { username: string; password: string; activo: boolean; colegio_ids: number[] }): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.base}/usuarios`, data);
  }
  updateUsuario(id: number, data: { activo: boolean; colegio_ids: number[] }): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.base}/usuarios/${id}`, data);
  }
  updateUsuarioPassword(id: number, password: string): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.base}/usuarios/${id}/password`, { password });
  }

  // ── Listados paginados con búsqueda ───────────────────────────────────────
  searchAlumnos(q: string, page: number, pageSize = 50, colegioId?: number, cursoId?: number): Observable<Page<Alumno>> {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (q) params = params.set('q', q);
    if (colegioId != null) params = params.set('colegio_id', colegioId);
    if (cursoId != null) params = params.set('curso_id', cursoId);
    return this.http.get<Page<Alumno>>(`${this.base}/alumnos/paginated`, { params });
  }
  searchApoderados(q: string, page: number, pageSize = 50): Observable<Page<Apoderado>> {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (q) params = params.set('q', q);
    return this.http.get<Page<Apoderado>>(`${this.base}/apoderados/paginated`, { params });
  }
  searchCursos(q: string, page: number, pageSize = 50, colegioId?: number): Observable<Page<Curso>> {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (q) params = params.set('q', q);
    if (colegioId != null) params = params.set('colegio_id', colegioId);
    return this.http.get<Page<Curso>>(`${this.base}/cursos/paginated`, { params });
  }

  // ── Informes ──────────────────────────────────────────────────────────────
  getDeudasColegio(colegioId: number): Observable<DeudaColegio> {
    return this.http.get<DeudaColegio>(`${this.base}/informes/deudas`,
      { params: new HttpParams().set('colegio_id', colegioId) });
  }
  descargarDeudaPdf(apoderadoId: number): Observable<Blob> {
    return this.http.get(`${this.base}/informes/deudas/${apoderadoId}/pdf`, { responseType: 'blob' });
  }

  // ── Rebajas por tickets frecuentes ────────────────────────────────────────
  getRebajaConfigs(): Observable<ConfiguracionRebaja[]> {
    return this.http.get<ConfiguracionRebaja[]>(`${this.base}/rebajas/config`);
  }
  saveRebajaConfig(data: { colegio_id: number; dias_minimos: number; monto: number; activo: boolean }): Observable<ConfiguracionRebaja> {
    return this.http.post<ConfiguracionRebaja>(`${this.base}/rebajas/config`, data);
  }
  deleteRebajaConfig(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/rebajas/config/${id}`);
  }
  aplicarRebajas(anio: number, mes: number): Observable<RebajaResult> {
    return this.http.post<RebajaResult>(`${this.base}/rebajas/aplicar`, null,
      { params: new HttpParams().set('anio', anio).set('mes', mes) });
  }

  // ── Carga masiva ──────────────────────────────────────────────────────────
  private cargaMasivaForm(colegioId: number, file: File): FormData {
    const form = new FormData();
    form.append('colegio_id', String(colegioId));
    form.append('file', file);
    return form;
  }
  previewCargaMasiva(colegioId: number, file: File): Observable<CargaMasivaResult> {
    return this.http.post<CargaMasivaResult>(`${this.base}/carga-masiva/preview`, this.cargaMasivaForm(colegioId, file));
  }
  confirmCargaMasiva(colegioId: number, file: File): Observable<CargaMasivaResult> {
    return this.http.post<CargaMasivaResult>(`${this.base}/carga-masiva/confirm`, this.cargaMasivaForm(colegioId, file));
  }
}
