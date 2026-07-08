import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { Alumno, Apoderado, Colegio, Consumo, Curso, ImportResult } from '../../../core/models';

@Component({
  selector: 'app-consumos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2><i class="bi bi-cup-hot me-2"></i>Consumos</h2>
    <hr>

    <!-- Acciones -->
    <div class="row g-3 mb-4">
      <!-- Generación mensual -->
      <div class="col-md-5">
        <div class="card h-100">
          <div class="card-header bg-success text-white">
            <i class="bi bi-calendar-check me-1"></i>Generar consumos mensuales
          </div>
          <div class="card-body">
            <div class="row g-2">
              <div class="col-6">
                <label class="form-label">Año</label>
                <input type="number" class="form-control" [(ngModel)]="genAnio" [value]="anioActual">
              </div>
              <div class="col-6">
                <label class="form-label">Mes</label>
                <select class="form-select" [(ngModel)]="genMes">
                  <option *ngFor="let m of meses; let i = index" [value]="i+1">{{ m }}</option>
                </select>
              </div>
            </div>
            <button class="btn btn-success mt-3 w-100" (click)="generarMensual()" [disabled]="generando">
              <span *ngIf="generando" class="spinner-border spinner-border-sm me-1"></span>
              Generar
            </button>
            <div *ngIf="mensajeGen" class="alert alert-info mt-2 mb-0">{{ mensajeGen }}</div>
          </div>
        </div>
      </div>

      <!-- Importar Excel -->
      <div class="col-md-5">
        <div class="card h-100">
          <div class="card-header bg-primary text-white">
            <i class="bi bi-file-earmark-excel me-1"></i>Importar tickets Excel
          </div>
          <div class="card-body">
            <p class="text-muted small">Formato: ID | FechaHora | RUT | Nombre | Curso</p>
            <input type="file" class="form-control" accept=".xlsx,.xls,.csv" (change)="onFile($event)">
            <button class="btn btn-primary mt-3 w-100" (click)="importar()" [disabled]="!archivoExcel || importando">
              <span *ngIf="importando" class="spinner-border spinner-border-sm me-1"></span>
              Importar
            </button>
            <div *ngIf="importResult" class="mt-2">
              <div class="alert" [ngClass]="importResult.errores > 0 ? 'alert-warning' : 'alert-success'">
                <strong>Procesados:</strong> {{ importResult.procesados }} |
                <strong>Errores:</strong> {{ importResult.errores }}
              </div>
              <ul *ngIf="importResult.mensajes.length" class="small text-muted">
                <li *ngFor="let m of importResult.mensajes">{{ m }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card mb-3">
      <div class="card-body pb-2">
        <div class="row g-2">

          <!-- Fila 1: periodo -->
          <div class="col-md-2">
            <label class="form-label small text-muted mb-1">Mes</label>
            <select class="form-select form-select-sm" [(ngModel)]="filtroMes">
              <option [value]="0">Todos los meses</option>
              <option *ngFor="let m of meses; let i = index" [value]="i+1">{{ m }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small text-muted mb-1">Año</label>
            <input type="number" class="form-control form-control-sm" placeholder="Año" [(ngModel)]="filtroAnio">
          </div>

          <!-- Fila 1: entidades -->
          <div class="col-md-2">
            <label class="form-label small text-muted mb-1">Colegio</label>
            <select class="form-select form-select-sm" [(ngModel)]="filtroColegio" (ngModelChange)="onFiltroColegio($event)">
              <option [ngValue]="undefined">Todos</option>
              <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small text-muted mb-1">Curso</label>
            <select class="form-select form-select-sm" [(ngModel)]="filtroCurso" (ngModelChange)="onFiltroCurso($event)"
                    [disabled]="!filtroColegio">
              <option [ngValue]="undefined">Todos</option>
              <option *ngFor="let c of cursosFiltrados" [ngValue]="c.id">{{ c.nombre }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small text-muted mb-1">Alumno</label>
            <select class="form-select form-select-sm" [(ngModel)]="filtroAlumno"
                    [disabled]="!filtroCurso">
              <option [ngValue]="undefined">Todos</option>
              <option *ngFor="let a of alumnosFiltrados" [ngValue]="a.id">{{ a.nombre }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small text-muted mb-1">Apoderado</label>
            <select class="form-select form-select-sm" [(ngModel)]="filtroApoderado">
              <option [ngValue]="undefined">Todos</option>
              <option *ngFor="let a of apoderados" [ngValue]="a.id">{{ a.nombre }}</option>
            </select>
          </div>

          <!-- Botones -->
          <div class="col-12 d-flex gap-2 mt-1">
            <button class="btn btn-primary btn-sm" (click)="cargar()">
              <i class="bi bi-search me-1"></i>Buscar
            </button>
            <button class="btn btn-outline-secondary btn-sm" (click)="limpiarFiltros()">
              <i class="bi bi-x-circle me-1"></i>Limpiar
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
        <table class="table table-sm table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th>Fecha</th><th>Alumno</th><th>Colegio</th><th>Curso</th>
              <th>Tipo</th><th>Modalidad</th><th>Precio</th><th>Origen</th><th>Pagado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of consumos">
              <td>{{ c.fecha }}</td>
              <td>{{ c.alumno_nombre ?? c.alumno_id }}</td>
              <td>{{ c.colegio_nombre ?? '—' }}</td>
              <td>{{ c.curso_nombre ?? '—' }}</td>
              <td><span class="badge bg-secondary">{{ c.tipo }}</span></td>
              <td><span class="badge bg-info text-dark">{{ c.modalidad }}</span></td>
              <td>\${{ c.precio | number:'1.0-0' }}</td>
              <td><span class="badge" [ngClass]="c.origen === 'EXCEL' ? 'bg-warning text-dark' : 'bg-light text-dark'">{{ c.origen }}</span></td>
              <td>
                <i class="bi" [ngClass]="c.pagado ? 'bi-check-circle-fill text-success' : 'bi-circle text-secondary'"></i>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>
  `,
})
export class ConsumosComponent implements OnInit {
  consumos: Consumo[] = [];
  colegios: Colegio[] = [];
  cursosFiltrados: Curso[] = [];
  alumnosFiltrados: Alumno[] = [];
  todosAlumnos: Alumno[] = [];
  apoderados: Apoderado[] = [];

  archivoExcel?: File;
  importResult?: ImportResult;
  mensajeGen = '';
  generando = false;
  importando = false;

  anioActual = new Date().getFullYear();
  genAnio = this.anioActual;
  genMes = new Date().getMonth() + 1;
  filtroMes = new Date().getMonth() + 1;
  filtroAnio = this.anioActual;
  filtroColegio?: number;
  filtroCurso?: number;
  filtroAlumno?: number;
  filtroApoderado?: number;

  meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getColegios().subscribe(d => this.colegios = d);
    this.api.getAlumnos().subscribe(d => this.todosAlumnos = d);
    this.api.getApoderados().subscribe(d => this.apoderados = d);
    this.cargar();
  }

  onFiltroColegio(colegioId: number | undefined) {
    this.filtroCurso = undefined;
    this.filtroAlumno = undefined;
    this.cursosFiltrados = [];
    this.alumnosFiltrados = [];
    if (colegioId) {
      this.api.getCursosByColegio(colegioId).subscribe(d => this.cursosFiltrados = d);
    }
  }

  onFiltroCurso(cursoId: number | undefined) {
    this.filtroAlumno = undefined;
    this.alumnosFiltrados = cursoId
      ? this.todosAlumnos.filter(a => a.curso_id === cursoId)
      : [];
  }

  limpiarFiltros() {
    this.filtroMes = new Date().getMonth() + 1;
    this.filtroAnio = this.anioActual;
    this.filtroColegio = undefined;
    this.filtroCurso = undefined;
    this.filtroAlumno = undefined;
    this.filtroApoderado = undefined;
    this.cursosFiltrados = [];
    this.alumnosFiltrados = [];
    this.cargar();
  }

  cargar() {
    this.api.getConsumos({
      anio: this.filtroAnio || undefined,
      mes: this.filtroMes || undefined,
      colegio_id: this.filtroColegio,
      curso_id: this.filtroCurso,
      alumno_id: this.filtroAlumno,
      apoderado_id: this.filtroApoderado,
    }).subscribe(data => this.consumos = data);
  }

  generarMensual() {
    this.generando = true;
    this.mensajeGen = '';
    this.api.generarMensual(this.genAnio, this.genMes).subscribe({
      next: (r) => { this.mensajeGen = r.mensaje; this.generando = false; this.cargar(); },
      error: () => { this.mensajeGen = 'Error al generar'; this.generando = false; },
    });
  }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivoExcel = input.files?.[0];
    this.importResult = undefined;
  }

  importar() {
    if (!this.archivoExcel) return;
    this.importando = true;
    this.importResult = undefined;
    this.api.importarExcel(this.archivoExcel)
      .pipe(finalize(() => this.importando = false))
      .subscribe({
        next: (r) => { this.importResult = r; this.cargar(); },
        error: (e) => {
          this.importResult = { procesados: 0, errores: 1, mensajes: [e?.error?.detail ?? 'Error al importar'] };
        },
      });
  }
}
