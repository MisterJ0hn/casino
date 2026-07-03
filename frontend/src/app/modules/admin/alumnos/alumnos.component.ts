import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { Alumno, Curso, Modalidad } from '../../../core/models';

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

    <div class="input-group mb-3" style="max-width:460px">
      <span class="input-group-text"><i class="bi bi-search"></i></span>
      <input class="form-control" placeholder="Buscar por RUT o nombre…"
             [(ngModel)]="q" (ngModelChange)="onSearch()">
      <button class="btn btn-outline-secondary" *ngIf="q" (click)="q=''; onSearch()">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <div class="card">
      <div class="card-body p-0">
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
              <td>
                <button class="btn btn-sm btn-outline-secondary" (click)="openModal(a)">
                  <i class="bi bi-pencil"></i>
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

            <!-- Curso -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Curso <span class="text-danger">*</span></label>
              <select class="form-select"
                      [(ngModel)]="form.curso_id"
                      [class.is-invalid]="submitted && errores['curso_id']"
                      [class.is-valid]="submitted && !errores['curso_id']">
                <option [ngValue]="undefined" disabled>Seleccione un curso</option>
                <option *ngFor="let c of cursos" [ngValue]="c.id">{{ c.nombre }}</option>
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

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getCursos().subscribe(data => this.cursos = data);
    this.cargar();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  cargar() {
    this.api.searchAlumnos(this.q.trim(), this.page, this.pageSize).subscribe(r => {
      this.alumnos = r.items;
      this.total = r.total;
    });
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
    this.showModal = true;
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
