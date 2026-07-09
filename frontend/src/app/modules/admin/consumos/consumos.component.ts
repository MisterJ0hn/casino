import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { Colegio, Consumo, ImportResult } from '../../../core/models';

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
          <div class="col-md-4">
            <label class="form-label small text-muted mb-1">Colegio</label>
            <select class="form-select form-select-sm" [(ngModel)]="filtroColegio">
              <option [ngValue]="undefined">Todos</option>
              <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small text-muted mb-1">RUT alumno</label>
            <input class="form-control form-control-sm" placeholder="12345678-9"
                   [(ngModel)]="filtroAlumnoRut"
                   (ngModelChange)="filtroAlumnoRut = formatearRut($event)"
                   (keyup.enter)="buscar()">
          </div>
          <div class="col-md-2">
            <label class="form-label small text-muted mb-1">RUT apoderado</label>
            <input class="form-control form-control-sm" placeholder="12345678-9"
                   [(ngModel)]="filtroApoderadoRut"
                   (ngModelChange)="filtroApoderadoRut = formatearRut($event)"
                   (keyup.enter)="buscar()">
          </div>

          <!-- Botones -->
          <div class="col-12 d-flex gap-2 mt-1">
            <button class="btn btn-primary btn-sm" (click)="buscar()">
              <i class="bi bi-search me-1"></i>Buscar
            </button>
            <button class="btn btn-outline-secondary btn-sm" (click)="limpiarFiltros()">
              <i class="bi bi-x-circle me-1"></i>Limpiar
            </button>
            <button class="btn btn-success btn-sm ms-auto" (click)="exportar()" [disabled]="exportando">
              <span *ngIf="exportando" class="spinner-border spinner-border-sm me-1"></span>
              <i class="bi bi-file-earmark-excel me-1"></i>Exportar
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

    <div class="d-flex justify-content-between align-items-center mt-2">
      <small class="text-muted">{{ total }} resultado(s)</small>
      <div class="btn-group" *ngIf="totalPages > 1">
        <button class="btn btn-sm btn-outline-secondary" [disabled]="page <= 1" (click)="irPagina(page - 1)">Anterior</button>
        <button class="btn btn-sm btn-outline-secondary" disabled>Página {{ page }} de {{ totalPages }}</button>
        <button class="btn btn-sm btn-outline-secondary" [disabled]="page >= totalPages" (click)="irPagina(page + 1)">Siguiente</button>
      </div>
    </div>
  `,
})
export class ConsumosComponent implements OnInit {
  consumos: Consumo[] = [];
  colegios: Colegio[] = [];

  archivoExcel?: File;
  importResult?: ImportResult;
  mensajeGen = '';
  generando = false;
  importando = false;
  exportando = false;

  anioActual = new Date().getFullYear();
  genAnio = this.anioActual;
  genMes = new Date().getMonth() + 1;
  filtroMes = new Date().getMonth() + 1;
  filtroAnio = this.anioActual;
  filtroColegio?: number;
  filtroAlumnoRut = '';
  filtroApoderadoRut = '';

  page = 1;
  pageSize = 100;
  total = 0;

  meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getColegios().subscribe(d => this.colegios = d);
    this.cargar();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  formatearRut(val: string): string {
    let v = (val || '').replace(/[^0-9kK]/g, '').toUpperCase();
    if (v.length > 1) v = v.slice(0, -1) + '-' + v.slice(-1);
    return v;
  }

  private filtros() {
    return {
      anio: this.filtroAnio || undefined,
      mes: this.filtroMes || undefined,
      colegio_id: this.filtroColegio,
      alumno_rut: this.filtroAlumnoRut.trim() || undefined,
      apoderado_rut: this.filtroApoderadoRut.trim() || undefined,
    };
  }

  limpiarFiltros() {
    this.filtroMes = new Date().getMonth() + 1;
    this.filtroAnio = this.anioActual;
    this.filtroColegio = undefined;
    this.filtroAlumnoRut = '';
    this.filtroApoderadoRut = '';
    this.page = 1;
    this.cargar();
  }

  cargar() {
    this.api.getConsumos({ ...this.filtros(), page: this.page, page_size: this.pageSize })
      .subscribe(r => { this.consumos = r.items; this.total = r.total; });
  }

  buscar() {
    this.page = 1;
    this.cargar();
  }

  irPagina(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.cargar();
  }

  exportar() {
    this.exportando = true;
    this.api.exportConsumos(this.filtros()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'consumos.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        this.exportando = false;
      },
      error: () => { this.exportando = false; },
    });
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
