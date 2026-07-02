import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { Alumno, Apoderado } from '../../../core/models';

@Component({
  selector: 'app-apoderados',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2><i class="bi bi-person-badge me-2"></i>Apoderados</h2>
      <button class="btn btn-primary" (click)="openModalApoderado()">
        <i class="bi bi-plus-circle me-1"></i>Nuevo apoderado
      </button>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr><th>RUT</th><th>Nombre</th><th>Email</th><th>Alumnos vinculados</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of apoderados">
              <td>{{ a.rut }}</td>
              <td>{{ a.nombre }}</td>
              <td>{{ a.email }}</td>
              <td>
                <span class="badge bg-secondary me-1"
                  *ngFor="let h of hijosMap[a.id]">{{ h.nombre }}</span>
                <span *ngIf="!hijosMap[a.id]?.length" class="text-muted small">Sin alumnos</span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-success me-1" (click)="openModalHijos(a)">
                  <i class="bi bi-person-plus"></i>
                </button>
                <a [routerLink]="['/portal', a.id]" class="btn btn-sm btn-outline-info me-1">
                  <i class="bi bi-eye"></i>
                </a>
                <button class="btn btn-sm btn-outline-secondary" (click)="openModalApoderado(a)">
                  <i class="bi bi-pencil"></i>
                </button>
              </td>
            </tr>
            <tr *ngIf="apoderados.length === 0">
              <td colspan="5" class="text-center text-muted py-3">Sin apoderados registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal apoderado -->
    <div class="modal fade show d-block" *ngIf="showModalApoderado" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editando ? 'Editar' : 'Nuevo' }} Apoderado</h5>
            <button class="btn-close" (click)="showModalApoderado=false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">RUT</label>
              <input class="form-control" [(ngModel)]="form.rut">
            </div>
            <div class="mb-3">
              <label class="form-label">Nombre</label>
              <input class="form-control" [(ngModel)]="form.nombre">
            </div>
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" [(ngModel)]="form.email">
            </div>
          </div>
          <div class="modal-footer">
            <span class="text-danger me-auto small" *ngIf="error">{{ error }}</span>
            <button class="btn btn-secondary" (click)="showModalApoderado=false">Cancelar</button>
            <button class="btn btn-primary" (click)="guardar()">Guardar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal vincular hijos -->
    <div class="modal fade show d-block" *ngIf="showModalHijos" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Alumnos de {{ apoderadoSeleccionado?.nombre }}</h5>
            <button class="btn-close" (click)="showModalHijos=false"></button>
          </div>
          <div class="modal-body">
            <!-- Hijos actuales -->
            <h6 class="text-muted mb-2">Vinculados</h6>
            <ul class="list-group mb-3">
              <li class="list-group-item d-flex justify-content-between align-items-center"
                *ngFor="let h of hijosActuales">
                {{ h.nombre }}
                <button class="btn btn-sm btn-outline-danger" (click)="desvincular(h.id)">
                  <i class="bi bi-x"></i>
                </button>
              </li>
              <li class="list-group-item text-muted" *ngIf="hijosActuales.length === 0">
                Sin alumnos vinculados
              </li>
            </ul>

            <!-- Agregar alumno -->
            <h6 class="text-muted mb-2">Vincular alumno</h6>
            <div class="input-group">
              <select class="form-select" [(ngModel)]="alumnoAVincular">
                <option [ngValue]="null" disabled>Seleccione alumno</option>
                <option *ngFor="let a of alumnosDisponibles" [ngValue]="a.id">{{ a.nombre }}</option>
              </select>
              <button class="btn btn-outline-primary" (click)="vincular()" [disabled]="!alumnoAVincular">
                <i class="bi bi-plus"></i> Vincular
              </button>
            </div>
            <div class="text-danger small mt-1" *ngIf="errorHijos">{{ errorHijos }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showModalHijos=false">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ApoderadosComponent implements OnInit {
  apoderados: Apoderado[] = [];
  todosAlumnos: Alumno[] = [];
  hijosMap: Record<number, Alumno[]> = {};

  showModalApoderado = false;
  editando = false;
  form: Partial<Apoderado> = {};
  error: string | null = null;

  showModalHijos = false;
  apoderadoSeleccionado: Apoderado | null = null;
  hijosActuales: Alumno[] = [];
  alumnoAVincular: number | null = null;
  errorHijos: string | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getCursos().subscribe(() => {}); // precarga cursos si hace falta
    this.api.getAlumnos().subscribe(a => {
      this.todosAlumnos = a;
      this.cargar();
    });
  }

  cargar() {
    this.api.getApoderados().subscribe(data => {
      this.apoderados = data;
      data.forEach(a => {
        this.api.getHijos(a.id).subscribe(hijos => {
          this.hijosMap = { ...this.hijosMap, [a.id]: hijos };
        });
      });
    });
  }

  get alumnosDisponibles(): Alumno[] {
    const vinculadosIds = new Set(this.hijosActuales.map(h => h.id));
    return this.todosAlumnos.filter(a => !vinculadosIds.has(a.id));
  }

  openModalApoderado(a?: Apoderado) {
    this.editando = !!a;
    this.form = a ? { ...a } : {};
    this.error = null;
    this.showModalApoderado = true;
  }

  guardar() {
    this.error = null;
    const obs = this.editando
      ? this.api.updateApoderado(this.form.id!, this.form)
      : this.api.createApoderado(this.form);
    obs.subscribe({
      next: () => { this.showModalApoderado = false; this.cargar(); },
      error: (e) => { this.error = e.error?.detail ?? 'Error al guardar'; },
    });
  }

  openModalHijos(a: Apoderado) {
    this.apoderadoSeleccionado = a;
    this.alumnoAVincular = null;
    this.errorHijos = null;
    this.api.getHijos(a.id).subscribe(hijos => {
      this.hijosActuales = hijos;
      this.showModalHijos = true;
    });
  }

  vincular() {
    if (!this.alumnoAVincular || !this.apoderadoSeleccionado) return;
    this.errorHijos = null;
    this.api.vincularHijo(this.apoderadoSeleccionado.id, this.alumnoAVincular).subscribe({
      next: () => {
        this.alumnoAVincular = null;
        this.api.getHijos(this.apoderadoSeleccionado!.id).subscribe(h => {
          this.hijosActuales = h;
          this.hijosMap = { ...this.hijosMap, [this.apoderadoSeleccionado!.id]: h };
        });
      },
      error: (e) => { this.errorHijos = e.error?.detail ?? 'Error al vincular'; },
    });
  }

  desvincular(alumnoId: number) {
    if (!this.apoderadoSeleccionado) return;
    this.api.desvincularHijo(this.apoderadoSeleccionado.id, alumnoId).subscribe({
      next: () => {
        this.api.getHijos(this.apoderadoSeleccionado!.id).subscribe(h => {
          this.hijosActuales = h;
          this.hijosMap = { ...this.hijosMap, [this.apoderadoSeleccionado!.id]: h };
        });
      },
      error: (e) => { this.errorHijos = e.error?.detail ?? 'Error al desvincular'; },
    });
  }
}
