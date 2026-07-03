import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { Colegio, Curso } from '../../../core/models';

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2><i class="bi bi-journal-text me-2"></i>Cursos</h2>
      <button class="btn btn-primary" (click)="openModal()">
        <i class="bi bi-plus-circle me-1"></i>Nuevo curso
      </button>
    </div>

    <div class="d-flex flex-wrap gap-2 mb-3">
      <select class="form-select w-auto" [(ngModel)]="colegioFiltro" (ngModelChange)="onFiltro()">
        <option [ngValue]="null">Todos los colegios</option>
        <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
      </select>
      <div class="input-group" style="max-width:360px">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input class="form-control" placeholder="Buscar por nombre…"
               [(ngModel)]="q" (ngModelChange)="onSearch()">
        <button class="btn btn-outline-secondary" *ngIf="q" (click)="q=''; onSearch()">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th>Nombre</th>
              <th>Nivel</th>
              <th>Colegio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of cursos">
              <td>{{ c.nombre }}</td>
              <td>{{ c.nivel }}</td>
              <td>{{ nombreColegio(c.colegio_id) }}</td>
              <td>
                <button class="btn btn-sm btn-outline-secondary me-1" (click)="openModal(c)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" (click)="eliminar(c.id)">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
            <tr *ngIf="cursos.length === 0">
              <td colspan="4" class="text-center text-muted py-3">Sin resultados</td>
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
            <h5 class="modal-title">{{ editando ? 'Editar' : 'Nuevo' }} Curso</h5>
            <button class="btn-close" (click)="showModal=false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Colegio</label>
              <select class="form-select" [(ngModel)]="form.colegio_id">
                <option [ngValue]="undefined" disabled>Seleccione un colegio</option>
                <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Nombre</label>
              <input class="form-control" [(ngModel)]="form.nombre" placeholder="Ej: 1° A">
            </div>
            <div class="mb-3">
              <label class="form-label">Nivel</label>
              <input type="number" class="form-control" [(ngModel)]="form.nivel" placeholder="Ej: 1">
            </div>
          </div>
          <div class="modal-footer">
            <span class="text-danger me-auto small" *ngIf="error">{{ error }}</span>
            <button class="btn btn-secondary" (click)="showModal=false">Cancelar</button>
            <button class="btn btn-primary" (click)="guardar()" [disabled]="!form.colegio_id || !form.nombre || form.nivel == null">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CursosComponent implements OnInit {
  cursos: Curso[] = [];
  colegios: Colegio[] = [];
  colegioFiltro: number | null = null;
  showModal = false;
  editando = false;
  form: Partial<Curso> = {};
  error: string | null = null;

  q = '';
  page = 1;
  pageSize = 50;
  total = 0;
  private searchTimer: any;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getColegios().subscribe(data => {
      this.colegios = data;
      this.cargar();
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  cargar() {
    this.api.searchCursos(this.q.trim(), this.page, this.pageSize, this.colegioFiltro ?? undefined)
      .subscribe(r => { this.cursos = r.items; this.total = r.total; });
  }

  onFiltro() {
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

  nombreColegio(id: number): string {
    return this.colegios.find(c => c.id === id)?.nombre ?? String(id);
  }

  openModal(c?: Curso) {
    this.editando = !!c;
    this.form = c ? { ...c } : {};
    this.error = null;
    this.showModal = true;
  }

  guardar() {
    this.error = null;
    const obs = this.editando
      ? this.api.updateCurso(this.form.id!, this.form)
      : this.api.createCurso(this.form);
    obs.subscribe({
      next: () => { this.showModal = false; this.cargar(); },
      error: (e) => { this.error = e.error?.detail ?? 'Error al guardar'; },
    });
  }

  eliminar(id: number) {
    if (!confirm('¿Eliminar este curso? Solo es posible si no tiene alumnos activos.')) return;
    this.api.deleteCurso(id).subscribe({
      next: () => this.cargar(),
      error: (e) => alert(e.error?.detail ?? 'No se pudo eliminar el curso'),
    });
  }
}
