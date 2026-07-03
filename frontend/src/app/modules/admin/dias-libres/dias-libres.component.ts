import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { Alumno, Colegio, Curso, DiaSinAlmuerzo } from '../../../core/models';

type Alcance = 'global' | 'colegio' | 'curso' | 'alumno';

@Component({
  selector: 'app-dias-libres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2><i class="bi bi-calendar-x me-2"></i>Días Libres</h2>
      <button class="btn btn-primary" (click)="openModal()">
        <i class="bi bi-plus-circle me-1"></i>Agregar día libre
      </button>
    </div>

    <div class="alert alert-info d-flex gap-2 align-items-start">
      <i class="bi bi-info-circle-fill mt-1"></i>
      <span>
        Los consumos <strong>MENSUAL</strong> que caigan en un día libre no serán generados.
        Los consumos <strong>MENSUAL</strong> ya se generan solo de lunes a viernes.
      </span>
    </div>

    <div *ngIf="mensajeExito" class="alert alert-success alert-dismissible d-flex gap-2 align-items-start">
      <i class="bi bi-check-circle-fill mt-1"></i>
      <span>{{ mensajeExito }}</span>
      <button type="button" class="btn-close ms-auto" (click)="mensajeExito=null"></button>
    </div>

    <!-- Tabla -->
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th>Fecha</th>
              <th>Día</th>
              <th>Alcance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let d of dias">
              <td>{{ d.fecha }}</td>
              <td class="text-capitalize text-muted small">{{ diaSemana(d.fecha) }}</td>
              <td>
                <span *ngIf="!d.colegio_id" class="badge bg-dark">Global — todos los alumnos</span>
                <span *ngIf="d.colegio_id && !d.curso_id" class="badge bg-primary">
                  <i class="bi bi-building me-1"></i>{{ d.colegio_nombre }}
                </span>
                <span *ngIf="d.curso_id && !d.alumno_id" class="badge bg-info text-dark">
                  <i class="bi bi-journal-text me-1"></i>{{ d.curso_nombre }}
                </span>
                <span *ngIf="d.alumno_id" class="badge bg-success">
                  <i class="bi bi-person me-1"></i>{{ d.alumno_nombre }}
                </span>
              </td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" (click)="eliminar(d)" title="Eliminar">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
            <tr *ngIf="dias.length === 0">
              <td colspan="4" class="text-center text-muted py-3">Sin días libres registrados</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal fade show d-block" *ngIf="showModal" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-calendar-x me-2"></i>Nuevo día libre</h5>
            <button class="btn-close" (click)="showModal=false"></button>
          </div>
          <div class="modal-body">

            <!-- Fecha -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Fecha <span class="text-danger">*</span></label>
              <input type="date" class="form-control"
                     [(ngModel)]="form.fecha"
                     [class.is-invalid]="submitted && !form.fecha">
              <div class="invalid-feedback">La fecha es requerida.</div>
            </div>

            <!-- Alcance -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Alcance</label>
              <div class="d-flex flex-wrap gap-2">
                <div *ngFor="let op of alcanceOpciones"
                     class="form-check form-check-inline border rounded px-3 py-2"
                     [class.border-primary]="form.alcance === op.value"
                     [class.bg-primary]="form.alcance === op.value"
                     [class.bg-opacity-10]="form.alcance === op.value"
                     style="cursor:pointer" (click)="setAlcance(op.value)">
                  <input class="form-check-input" type="radio" [value]="op.value"
                         [(ngModel)]="form.alcance" (change)="setAlcance(op.value)">
                  <label class="form-check-label ms-1" style="cursor:pointer">
                    <i class="bi me-1" [ngClass]="op.icon"></i>{{ op.label }}
                  </label>
                </div>
              </div>
            </div>

            <!-- Colegio (alcance colegio / curso / alumno) -->
            <div class="mb-3" *ngIf="form.alcance !== 'global'">
              <label class="form-label fw-semibold">Colegio <span class="text-danger">*</span></label>
              <select class="form-select"
                      [(ngModel)]="form.colegio_id"
                      [class.is-invalid]="submitted && !form.colegio_id"
                      (ngModelChange)="onColegioChange($event)">
                <option [ngValue]="undefined" disabled>Seleccione un colegio</option>
                <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
              </select>
              <div class="invalid-feedback">Seleccione un colegio.</div>
            </div>

            <!-- Curso (alcance curso / alumno) -->
            <div class="mb-3" *ngIf="form.alcance === 'curso' || form.alcance === 'alumno'">
              <label class="form-label fw-semibold">Curso <span class="text-danger">*</span></label>
              <select class="form-select"
                      [(ngModel)]="form.curso_id"
                      [class.is-invalid]="submitted && !form.curso_id"
                      [disabled]="!form.colegio_id"
                      (ngModelChange)="onCursoChange($event)">
                <option [ngValue]="undefined" disabled>Seleccione un curso</option>
                <option *ngFor="let c of cursosFiltrados" [ngValue]="c.id">{{ c.nombre }}</option>
              </select>
              <div class="invalid-feedback">Seleccione un curso.</div>
            </div>

            <!-- Alumno (alcance alumno) -->
            <div class="mb-3" *ngIf="form.alcance === 'alumno'">
              <label class="form-label fw-semibold">Alumno <span class="text-danger">*</span></label>
              <select class="form-select"
                      [(ngModel)]="form.alumno_id"
                      [class.is-invalid]="submitted && !form.alumno_id"
                      [disabled]="!form.curso_id">
                <option [ngValue]="undefined" disabled>Seleccione un alumno</option>
                <option *ngFor="let a of alumnosFiltrados" [ngValue]="a.id">{{ a.nombre }}</option>
              </select>
              <div class="invalid-feedback">Seleccione un alumno.</div>
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
export class DiasLibresComponent implements OnInit {
  dias: DiaSinAlmuerzo[] = [];
  colegios: Colegio[] = [];
  cursosFiltrados: Curso[] = [];
  alumnosFiltrados: Alumno[] = [];
  todosAlumnos: Alumno[] = [];
  showModal = false;
  submitted = false;
  error: string | null = null;
  mensajeExito: string | null = null;

  form: {
    fecha: string;
    alcance: Alcance;
    colegio_id?: number;
    curso_id?: number;
    alumno_id?: number;
  } = { fecha: '', alcance: 'global' };

  alcanceOpciones = [
    { value: 'global' as Alcance,  label: 'Global',   icon: 'bi-globe' },
    { value: 'colegio' as Alcance, label: 'Colegio',  icon: 'bi-building' },
    { value: 'curso' as Alcance,   label: 'Curso',    icon: 'bi-journal-text' },
    { value: 'alumno' as Alcance,  label: 'Alumno',   icon: 'bi-person' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getColegios().subscribe(d => this.colegios = d);
    this.api.getAlumnos().subscribe(d => this.todosAlumnos = d);
    this.cargar();
  }

  cargar() {
    this.api.getDiasLibres().subscribe(d => this.dias = d);
  }

  setAlcance(alcance: Alcance) {
    this.form.alcance = alcance;
    this.form.colegio_id = undefined;
    this.form.curso_id = undefined;
    this.form.alumno_id = undefined;
    this.cursosFiltrados = [];
    this.alumnosFiltrados = [];
  }

  onColegioChange(colegioId: number) {
    this.form.curso_id = undefined;
    this.form.alumno_id = undefined;
    this.alumnosFiltrados = [];
    this.api.getCursosByColegio(colegioId).subscribe(d => this.cursosFiltrados = d);
  }

  onCursoChange(cursoId: number) {
    this.form.alumno_id = undefined;
    this.alumnosFiltrados = this.todosAlumnos.filter(a => a.curso_id === cursoId);
  }

  private validar(): boolean {
    if (!this.form.fecha) return false;
    if (this.form.alcance !== 'global' && !this.form.colegio_id) return false;
    if ((this.form.alcance === 'curso' || this.form.alcance === 'alumno') && !this.form.curso_id) return false;
    if (this.form.alcance === 'alumno' && !this.form.alumno_id) return false;
    return true;
  }

  openModal() {
    this.form = { fecha: '', alcance: 'global' };
    this.cursosFiltrados = [];
    this.alumnosFiltrados = [];
    this.submitted = false;
    this.error = null;
    this.showModal = true;
  }

  guardar() {
    this.submitted = true;
    if (!this.validar()) return;

    const payload: Partial<DiaSinAlmuerzo> = { fecha: this.form.fecha };
    if (this.form.alcance !== 'global') payload.colegio_id = this.form.colegio_id;
    if (this.form.alcance === 'curso' || this.form.alcance === 'alumno') payload.curso_id = this.form.curso_id;
    if (this.form.alcance === 'alumno') payload.alumno_id = this.form.alumno_id;

    this.api.createDiaLibre(payload).subscribe({
      next: (r) => {
        this.showModal = false;
        this.cargar();
        const n = r.consumos_eliminados ?? 0;
        this.mensajeExito = n > 0
          ? `Día libre registrado. Se eliminaron ${n} consumo${n === 1 ? '' : 's'} generado${n === 1 ? '' : 's'} para esa fecha.`
          : 'Día libre registrado. No había consumos generados para esa fecha.';
      },
      error: (e) => { this.error = e.error?.detail ?? 'Error al guardar'; },
    });
  }

  eliminar(dia: DiaSinAlmuerzo) {
    if (!confirm(`¿Eliminar el día libre ${dia.fecha}?`)) return;
    this.api.deleteDiaLibre(dia.id).subscribe(() => this.cargar());
  }

  diaSemana(fecha: string): string {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[new Date(fecha + 'T12:00:00').getDay()];
  }
}
