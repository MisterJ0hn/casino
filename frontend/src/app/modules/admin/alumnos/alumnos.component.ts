import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { Alumno, Apoderado, ApoderadoVinculo, Colegio, Curso, Modalidad } from '../../../core/models';

@Component({
  selector: 'app-alumnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2><i class="bi bi-people me-2"></i>Alumnos</h2>
      <button class="btn btn-primary" (click)="openModal()">
        <i class="bi bi-plus-circle me-1"></i>Nuevo alumno
      </button>
    </div>

    <div class="d-flex flex-wrap gap-2 mb-3">
      <div class="input-group" style="max-width:340px">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input class="form-control" placeholder="Buscar por RUT o nombre…"
               [(ngModel)]="q" (ngModelChange)="onSearch()">
        <button class="btn btn-outline-secondary" *ngIf="q" (click)="q=''; onSearch()">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <select class="form-select w-auto" [(ngModel)]="filtroColegio" (ngModelChange)="onColegioFiltro($event)">
        <option [ngValue]="undefined">Todos los colegios</option>
        <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
      </select>
      <select class="form-select w-auto" [(ngModel)]="filtroCurso" (ngModelChange)="onCursoFiltro()"
              [disabled]="!filtroColegio">
        <option [ngValue]="undefined">Todos los cursos</option>
        <option *ngFor="let c of cursosFiltro" [ngValue]="c.id">{{ c.nombre }}</option>
      </select>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th>RUT</th><th>Nombre</th><th>Curso</th>
              <th>Modalidad override</th><th>Precio override</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of alumnos">
              <td>{{ a.rut }}</td>
              <td>{{ a.nombre }}</td>
              <td>{{ nombreCurso(a.curso_id) }}</td>
              <td>
                <span class="badge" [ngClass]="badgeClass(a.modalidad_override)">
                  {{ a.modalidad_override || '—' }}
                </span>
              </td>
              <td>{{ a.precio_override ? ('$' + a.precio_override) : '—' }}</td>
              <td class="text-nowrap">
                <button class="btn btn-sm btn-outline-secondary me-1" (click)="openModal(a)" title="Editar alumno">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary" (click)="openApoderados(a)" title="Apoderados">
                  <i class="bi bi-person-vcard"></i>
                </button>
              </td>
            </tr>
            <tr *ngIf="alumnos.length === 0">
              <td colspan="6" class="text-center text-muted py-3">Sin resultados</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mt-2">
      <small class="text-muted">{{ total }} resultado(s)</small>
      <div class="btn-group" *ngIf="totalPages > 1">
        <button class="btn btn-sm btn-outline-secondary" [disabled]="page <= 1" (click)="irPagina(page - 1)">Anterior</button>
        <button class="btn btn-sm btn-outline-secondary" disabled>Página {{ page }} de {{ totalPages }}</button>
        <button class="btn btn-sm btn-outline-secondary" [disabled]="page >= totalPages" (click)="irPagina(page + 1)">Siguiente</button>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal fade show d-block" *ngIf="showModal" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editando ? 'Editar' : 'Nuevo' }} Alumno</h5>
            <button class="btn-close" (click)="showModal=false"></button>
          </div>
          <div class="modal-body">

            <!-- RUT -->
            <div class="mb-3">
              <label class="form-label fw-semibold">RUT <span class="text-danger">*</span></label>
              <input class="form-control" [(ngModel)]="form.rut"
                     [class.is-invalid]="submitted && errores['rut']"
                     [class.is-valid]="submitted && !errores['rut']"
                     placeholder="12345678-9"
                     (blur)="formatearRut()">
              <div class="invalid-feedback">{{ errores['rut'] }}</div>
              <div class="form-text">Sin puntos, con guión. Ej: 12345678-9</div>
            </div>

            <!-- Nombre -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Nombre completo <span class="text-danger">*</span></label>
              <input class="form-control" [(ngModel)]="form.nombre"
                     [class.is-invalid]="submitted && errores['nombre']"
                     [class.is-valid]="submitted && !errores['nombre']"
                     placeholder="Juan Andrés Pérez González">
              <div class="invalid-feedback">{{ errores['nombre'] }}</div>
            </div>

            <!-- Colegio -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Colegio <span class="text-danger">*</span></label>
              <select class="form-select"
                      [(ngModel)]="modalColegioId"
                      (ngModelChange)="onModalColegio($event)"
                      [disabled]="!esAdmin">
                <option [ngValue]="undefined" disabled>Seleccione un colegio</option>
                <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
              </select>
              <div class="form-text" *ngIf="!esAdmin">Solo un administrador puede cambiar el colegio.</div>
            </div>

            <!-- Curso -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Curso <span class="text-danger">*</span></label>
              <select class="form-select"
                      [(ngModel)]="form.curso_id"
                      [class.is-invalid]="submitted && errores['curso_id']"
                      [class.is-valid]="submitted && !errores['curso_id']"
                      [disabled]="!modalColegioId">
                <option [ngValue]="undefined" disabled>Seleccione un curso</option>
                <option *ngFor="let c of cursosModal" [ngValue]="c.id">{{ c.nombre }}</option>
              </select>
              <div class="invalid-feedback">{{ errores['curso_id'] }}</div>
            </div>

            <!-- Modalidad override -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Modalidad override</label>
              <select class="form-select" [(ngModel)]="form.modalidad_override"
                      (ngModelChange)="onModalidadChange($event)">
                <option value="">Sin override</option>
                <option *ngFor="let m of modalidades" [value]="m">{{ m }}</option>
              </select>
              <div class="form-text">Si no se selecciona, se aplica la configuración del colegio.</div>
            </div>

            <!-- Precio override -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Precio override</label>
              <div class="input-group">
                <span class="input-group-text">$</span>
                <input type="number" class="form-control" [(ngModel)]="form.precio_override"
                       [class.is-invalid]="submitted && errores['precio_override']"
                       [class.is-valid]="submitted && !errores['precio_override'] && precioHabilitado"
                       [disabled]="!precioHabilitado"
                       placeholder="0" min="0">
              </div>
              <div class="text-danger small mt-1" *ngIf="submitted && errores['precio_override']">
                {{ errores['precio_override'] }}
              </div>
              <div class="form-text" *ngIf="!precioHabilitado">
                BECADO y TERMO tienen precio $0 fijo.
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <span class="text-danger me-auto small" *ngIf="error">{{ error }}</span>
            <button class="btn btn-secondary" (click)="showModal=false">Cancelar</button>
            <button class="btn btn-primary" (click)="guardar()">Guardar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Apoderados del alumno -->
    <div class="modal fade show d-block" *ngIf="showApoModal" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-person-vcard me-2"></i>Apoderados de {{ apoAlumno?.nombre }}</h5>
            <button class="btn-close" (click)="showApoModal=false"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="cargandoApos" class="text-muted"><span class="spinner-border spinner-border-sm me-1"></span>Cargando…</div>

            <table class="table table-sm align-middle" *ngIf="!cargandoApos">
              <thead class="table-light">
                <tr><th>RUT</th><th>Apoderado</th><th class="text-center">Principal</th><th style="width:150px"></th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let v of vinculos">
                  <td>{{ v.rut }}</td>
                  <td>{{ v.nombre }}</td>
                  <td class="text-center">
                    <span *ngIf="v.es_principal" class="badge bg-success"><i class="bi bi-star-fill me-1"></i>Principal</span>
                    <button *ngIf="!v.es_principal" class="btn btn-sm btn-outline-success py-0"
                            (click)="marcarPrincipal(v)" title="Marcar como principal">
                      <i class="bi bi-star"></i> Hacer principal
                    </button>
                  </td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger" (click)="desvincular(v)"
                            [disabled]="v.es_principal" [title]="v.es_principal ? 'No se puede desvincular al principal' : 'Desvincular'">
                      <i class="bi bi-x-circle"></i>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="vinculos.length === 0">
                  <td colspan="4" class="text-center text-muted py-2">Sin apoderados vinculados</td>
                </tr>
              </tbody>
            </table>

            <hr>
            <label class="form-label small text-muted mb-1">Vincular apoderado existente</label>
            <div class="input-group mb-2">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input class="form-control" placeholder="Buscar por RUT, nombre o email…"
                     [(ngModel)]="qApo" (ngModelChange)="buscarApoderados()">
            </div>
            <div class="list-group mb-2" *ngIf="qApo && resultadosApo.length">
              <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                      *ngFor="let ap of resultadosApo" (click)="vincular(ap, false)"
                      [disabled]="yaVinculado(ap.id)">
                <span>{{ ap.nombre }} <span class="text-muted small">— {{ ap.rut }}</span></span>
                <span class="badge bg-secondary" *ngIf="yaVinculado(ap.id)">Ya vinculado</span>
                <i class="bi bi-plus-circle text-primary" *ngIf="!yaVinculado(ap.id)"></i>
              </button>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="apoPrincipal" [(ngModel)]="vincularComoPrincipal">
              <label class="form-check-label small" for="apoPrincipal">Marcar como principal al vincular</label>
            </div>
            <div class="form-text">El apoderado debe existir. Créelo primero en el módulo <strong>Apoderados</strong>.</div>
            <div class="text-danger small mt-2" *ngIf="errorApo">{{ errorApo }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showApoModal=false">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AlumnosComponent implements OnInit {
  alumnos: Alumno[] = [];
  cursos: Curso[] = [];
  showModal = false;
  editando = false;
  form: Partial<Alumno> = {};
  error: string | null = null;
  modalidades: Modalidad[] = ['MENSUAL', 'TICKET', 'BECADO', 'TERMO'];
  errores: Record<string, string> = {};
  submitted = false;

  q = '';
  page = 1;
  pageSize = 50;
  total = 0;
  private searchTimer: any;

  colegios: Colegio[] = [];
  cursosFiltro: Curso[] = [];
  filtroColegio?: number;
  filtroCurso?: number;

  esAdmin = false;
  modalColegioId?: number;
  cursosModal: Curso[] = [];

  // Apoderados del alumno
  showApoModal = false;
  apoAlumno: Alumno | null = null;
  vinculos: ApoderadoVinculo[] = [];
  cargandoApos = false;
  qApo = '';
  resultadosApo: Apoderado[] = [];
  vincularComoPrincipal = false;
  errorApo: string | null = null;
  private apoSearchTimer: any;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.esAdmin = this.auth.isAdmin();
    this.api.getCursos().subscribe(data => this.cursos = data);
    this.api.getColegios().subscribe(data => this.colegios = data);
    this.cargar();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  cargar() {
    this.api.searchAlumnos(this.q.trim(), this.page, this.pageSize, this.filtroColegio, this.filtroCurso)
      .subscribe(r => {
        this.alumnos = r.items;
        this.total = r.total;
      });
  }

  onColegioFiltro(colegioId?: number) {
    this.filtroCurso = undefined;
    this.cursosFiltro = [];
    if (colegioId) {
      this.api.getCursosByColegio(colegioId).subscribe(d => this.cursosFiltro = d);
    }
    this.page = 1;
    this.cargar();
  }

  onCursoFiltro() {
    this.page = 1;
    this.cargar();
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.cargar(); }, 300);
  }

  irPagina(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.cargar();
  }

  get precioHabilitado(): boolean {
    const m = this.form.modalidad_override;
    return !m || m === 'MENSUAL' || m === 'TICKET';
  }

  onModalidadChange(modalidad: string) {
    if (modalidad === 'BECADO' || modalidad === 'TERMO') {
      this.form.precio_override = undefined;
    }
  }

  formatearRut() {
    if (!this.form.rut) return;
    // Eliminar todo excepto dígitos y K
    let val = this.form.rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (val.length > 1) {
      val = val.slice(0, -1) + '-' + val.slice(-1);
    }
    this.form.rut = val;
  }

  private calcularDv(cuerpo: string): string {
    let suma = 0;
    let multiplo = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    const resultado = 11 - (suma % 11);
    if (resultado === 11) return '0';
    if (resultado === 10) return 'K';
    return String(resultado);
  }

  private validarFormatoRut(rut: string): boolean {
    const limpio = rut.replace(/\./g, '').toUpperCase();
    const match = limpio.match(/^(\d{7,8})-([0-9K])$/);
    if (!match) return false;
    return this.calcularDv(match[1]) === match[2];
  }

  private validar(): boolean {
    this.errores = {};

    const rut = (this.form.rut ?? '').trim();
    if (!rut) {
      this.errores['rut'] = 'El RUT es requerido.';
    } else if (!this.validarFormatoRut(rut)) {
      this.errores['rut'] = 'RUT inválido. Verifique el formato y dígito verificador.';
    }

    const nombre = (this.form.nombre ?? '').trim();
    if (!nombre) {
      this.errores['nombre'] = 'El nombre es requerido.';
    } else if (nombre.length < 3) {
      this.errores['nombre'] = 'El nombre debe tener al menos 3 caracteres.';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nombre)) {
      this.errores['nombre'] = 'El nombre solo puede contener letras y espacios.';
    }

    if (!this.form.curso_id) {
      this.errores['curso_id'] = 'Debe seleccionar un curso.';
    }

    const precio = this.form.precio_override;
    if (this.precioHabilitado && precio !== null && precio !== undefined && String(precio) !== '') {
      if (isNaN(Number(precio)) || Number(precio) <= 0) {
        this.errores['precio_override'] = 'El precio debe ser un número mayor a 0.';
      }
    }

    return Object.keys(this.errores).length === 0;
  }

  openModal(a?: Alumno) {
    this.editando = !!a;
    this.form = a ? { ...a } : { activo: true };
    this.error = null;
    this.errores = {};
    this.submitted = false;
    this.cursosModal = [];
    this.modalColegioId = undefined;
    if (a) {
      const curso = this.cursos.find(c => c.id === a.curso_id);
      this.modalColegioId = curso?.colegio_id;
      if (this.modalColegioId) {
        this.api.getCursosByColegio(this.modalColegioId).subscribe(d => this.cursosModal = d);
      }
    }
    this.showModal = true;
  }

  onModalColegio(colegioId?: number) {
    this.form.curso_id = undefined;
    this.cursosModal = [];
    if (colegioId) {
      this.api.getCursosByColegio(colegioId).subscribe(d => this.cursosModal = d);
    }
  }

  guardar() {
    this.submitted = true;
    if (!this.validar()) return;

    this.error = null;
    const payload = { ...this.form };
    if (!payload.modalidad_override) delete payload.modalidad_override;
    if (!payload.precio_override) delete payload.precio_override;

    const obs = this.editando
      ? this.api.updateAlumno(this.form.id!, payload)
      : this.api.createAlumno(payload);

    obs.subscribe({
      next: () => { this.showModal = false; this.cargar(); },
      error: (e) => { this.error = e.error?.detail ?? 'Error al guardar'; },
    });
  }

  // ── Apoderados del alumno ──────────────────────────────────────────────────
  openApoderados(a: Alumno) {
    this.apoAlumno = a;
    this.showApoModal = true;
    this.qApo = '';
    this.resultadosApo = [];
    this.vincularComoPrincipal = false;
    this.errorApo = null;
    this.cargarVinculos();
  }

  cargarVinculos() {
    if (!this.apoAlumno) return;
    this.cargandoApos = true;
    this.api.getApoderadosDeAlumno(this.apoAlumno.id).subscribe({
      next: (v) => { this.vinculos = v; this.cargandoApos = false; },
      error: () => { this.cargandoApos = false; },
    });
  }

  buscarApoderados() {
    clearTimeout(this.apoSearchTimer);
    const q = this.qApo.trim();
    if (!q) { this.resultadosApo = []; return; }
    this.apoSearchTimer = setTimeout(() => {
      this.api.searchApoderados(q, 1, 10).subscribe(r => this.resultadosApo = r.items);
    }, 300);
  }

  yaVinculado(apoderadoId: number): boolean {
    return this.vinculos.some(v => v.apoderado_id === apoderadoId);
  }

  vincular(ap: Apoderado, _principal: boolean) {
    if (!this.apoAlumno || this.yaVinculado(ap.id)) return;
    this.errorApo = null;
    this.api.vincularApoderadoAlumno(this.apoAlumno.id, ap.id, this.vincularComoPrincipal).subscribe({
      next: () => { this.qApo = ''; this.resultadosApo = []; this.vincularComoPrincipal = false; this.cargarVinculos(); },
      error: (e) => { this.errorApo = e?.error?.detail ?? 'No se pudo vincular el apoderado.'; },
    });
  }

  marcarPrincipal(v: ApoderadoVinculo) {
    if (!this.apoAlumno) return;
    this.errorApo = null;
    this.api.marcarApoderadoPrincipal(this.apoAlumno.id, v.apoderado_id).subscribe({
      next: () => this.cargarVinculos(),
      error: (e) => { this.errorApo = e?.error?.detail ?? 'No se pudo marcar como principal.'; },
    });
  }

  desvincular(v: ApoderadoVinculo) {
    if (!this.apoAlumno || v.es_principal) return;
    this.errorApo = null;
    this.api.desvincularApoderadoAlumno(this.apoAlumno.id, v.apoderado_id).subscribe({
      next: () => this.cargarVinculos(),
      error: (e) => { this.errorApo = e?.error?.detail ?? 'No se pudo desvincular.'; },
    });
  }

  nombreCurso(id: number): string {
    return this.cursos.find(c => c.id === id)?.nombre ?? String(id);
  }

  badgeClass(m?: Modalidad | null) {
    const map: Record<string, string> = {
      MENSUAL: 'bg-primary', TICKET: 'bg-info', BECADO: 'bg-success', TERMO: 'bg-warning text-dark',
    };
    return m ? map[m] : 'bg-secondary';
  }
}
