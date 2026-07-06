import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { Colegio, ConfiguracionConsumo, Modalidad } from '../../../core/models';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2><i class="bi bi-gear me-2"></i>Configuración de Consumo</h2>
      <button class="btn btn-primary" (click)="openModal()">
        <i class="bi bi-plus-circle me-1"></i>Nueva regla
      </button>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th>Colegio</th><th>Nivel desde</th><th>Nivel hasta</th>
              <th>Modalidad</th><th>Precio</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of configs">
              <td>{{ nombreColegio(c.colegio_id) }}</td>
              <td>{{ nivelLabel(c.nivel_desde) }}</td>
              <td>{{ nivelLabel(c.nivel_hasta) }}</td>
              <td><span class="badge bg-primary">{{ c.modalidad }}</span></td>
              <td>\${{ c.precio | number:'1.0-0' }}</td>
              <td>
                <button class="btn btn-sm btn-outline-danger" (click)="eliminar(c.id)">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

    <div class="modal fade show d-block" *ngIf="showModal" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Nueva regla de consumo</h5>
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
            <div class="row">
              <div class="col-6 mb-3">
                <label class="form-label">Nivel desde</label>
                <select class="form-select" [(ngModel)]="form.nivel_desde">
                  <option [ngValue]="undefined" disabled>Seleccione…</option>
                  <option *ngFor="let n of niveles" [ngValue]="n.value">{{ n.label }}</option>
                </select>
              </div>
              <div class="col-6 mb-3">
                <label class="form-label">Nivel hasta</label>
                <select class="form-select" [(ngModel)]="form.nivel_hasta">
                  <option [ngValue]="undefined" disabled>Seleccione…</option>
                  <option *ngFor="let n of niveles" [ngValue]="n.value">{{ n.label }}</option>
                </select>
              </div>
            </div>
            <div class="text-danger small mb-3" *ngIf="form.nivel_desde != null && form.nivel_hasta != null && form.nivel_desde > form.nivel_hasta">
              El "nivel desde" no puede ser mayor que el "nivel hasta".
            </div>
            <div class="mb-3">
              <label class="form-label">Modalidad</label>
              <select class="form-select" [(ngModel)]="form.modalidad">
                <option *ngFor="let m of modalidades" [value]="m">{{ m }}</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Precio</label>
              <input type="number" class="form-control" [(ngModel)]="form.precio">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showModal=false">Cancelar</button>
            <button class="btn btn-primary" (click)="guardar()"
                    [disabled]="!form.colegio_id || form.nivel_desde == null || form.nivel_hasta == null || form.nivel_desde > form.nivel_hasta">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ConfiguracionComponent implements OnInit {
  configs: ConfiguracionConsumo[] = [];
  colegios: Colegio[] = [];
  showModal = false;
  form: Partial<ConfiguracionConsumo> = {};
  modalidades: Modalidad[] = ['MENSUAL', 'TICKET', 'BECADO', 'TERMO'];
  niveles: { value: number; label: string }[] = [
    { value: 1, label: '1° Básico' },
    { value: 2, label: '2° Básico' },
    { value: 3, label: '3° Básico' },
    { value: 4, label: '4° Básico' },
    { value: 5, label: '5° Básico' },
    { value: 6, label: '6° Básico' },
    { value: 7, label: '7° Básico' },
    { value: 8, label: '8° Básico' },
    { value: 9, label: 'I Medio' },
    { value: 10, label: 'II Medio' },
    { value: 11, label: 'III Medio' },
    { value: 12, label: 'IV Medio' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getColegios().subscribe(d => this.colegios = d);
    this.cargar();
  }

  cargar() { this.api.getConfiguraciones().subscribe(d => this.configs = d); }

  nombreColegio(id: number): string {
    return this.colegios.find(c => c.id === id)?.nombre ?? String(id);
  }

  nivelLabel(n: number): string {
    return this.niveles.find(x => x.value === n)?.label ?? String(n);
  }

  openModal() { this.form = { activo: true }; this.showModal = true; }

  guardar() {
    this.api.createConfiguracion(this.form).subscribe(() => {
      this.showModal = false;
      this.cargar();
    });
  }

  eliminar(id: number) {
    if (confirm('¿Eliminar regla?')) {
      this.api.deleteConfiguracion(id).subscribe(() => this.cargar());
    }
  }
}
