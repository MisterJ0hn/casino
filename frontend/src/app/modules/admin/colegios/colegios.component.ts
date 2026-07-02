import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { Colegio } from '../../../core/models';

@Component({
  selector: 'app-colegios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2><i class="bi bi-building me-2"></i>Colegios</h2>
      <button class="btn btn-primary" (click)="openModal()">
        <i class="bi bi-plus-circle me-1"></i>Nuevo colegio
      </button>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of colegios">
              <td>{{ c.nombre }}</td>
              <td>
                <span class="badge" [ngClass]="c.activo ? 'bg-success' : 'bg-secondary'">
                  {{ c.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-secondary" (click)="openModal(c)">
                  <i class="bi bi-pencil"></i>
                </button>
              </td>
            </tr>
            <tr *ngIf="colegios.length === 0">
              <td colspan="3" class="text-center text-muted py-3">Sin colegios registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal fade show d-block" *ngIf="showModal" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editando ? 'Editar' : 'Nuevo' }} Colegio</h5>
            <button class="btn-close" (click)="showModal=false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Nombre</label>
              <input class="form-control" [(ngModel)]="form.nombre" placeholder="Nombre del colegio">
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="activo" [(ngModel)]="form.activo">
              <label class="form-check-label" for="activo">Activo</label>
            </div>
          </div>
          <div class="modal-footer">
            <span class="text-danger me-auto small" *ngIf="error">{{ error }}</span>
            <button class="btn btn-secondary" (click)="showModal=false">Cancelar</button>
            <button class="btn btn-primary" (click)="guardar()" [disabled]="!form.nombre">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ColegiosComponent implements OnInit {
  colegios: Colegio[] = [];
  showModal = false;
  editando = false;
  form: Partial<Colegio> = {};
  error: string | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() { this.cargar(); }

  cargar() { this.api.getColegios().subscribe(data => this.colegios = data); }

  openModal(c?: Colegio) {
    this.editando = !!c;
    this.form = c ? { ...c } : { activo: true };
    this.error = null;
    this.showModal = true;
  }

  guardar() {
    this.error = null;
    const obs = this.editando
      ? this.api.updateColegio(this.form.id!, this.form)
      : this.api.createColegio(this.form);
    obs.subscribe({
      next: () => { this.showModal = false; this.cargar(); },
      error: (e) => { this.error = e.error?.detail ?? 'Error al guardar'; },
    });
  }
}
