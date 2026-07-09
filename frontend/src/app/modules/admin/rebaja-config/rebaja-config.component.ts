import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { Colegio, ConfiguracionRebaja, RebajaResult } from '../../../core/models';

@Component({
  selector: 'app-rebaja-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2 class="mb-3"><i class="bi bi-percent me-2"></i>Rebaja por tickets frecuentes</h2>
    <p class="text-muted">
      Si un alumno con modalidad <strong>TICKET</strong> alcanza los días mínimos de consumo en el mes,
      se le aplica una rebaja fija ese mes. La configuración es por colegio.
    </p>

    <div class="row g-3">
      <!-- Configuración por colegio -->
      <div class="col-lg-7">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <i class="bi bi-sliders me-1"></i>Configuración por colegio
          </div>
          <div class="card-body">
            <div class="row g-2 align-items-end mb-3">
              <div class="col-md-4">
                <label class="form-label small text-muted mb-1">Colegio</label>
                <select class="form-select form-select-sm" [(ngModel)]="form.colegio_id">
                  <option [ngValue]="undefined" disabled>Seleccione…</option>
                  <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label small text-muted mb-1">Días mínimos</label>
                <input type="number" min="1" class="form-control form-control-sm" [(ngModel)]="form.dias_minimos">
              </div>
              <div class="col-md-3">
                <label class="form-label small text-muted mb-1">Monto rebaja</label>
                <input type="number" min="0" class="form-control form-control-sm" [(ngModel)]="form.monto">
              </div>
              <div class="col-md-2">
                <button class="btn btn-primary btn-sm w-100"
                        (click)="guardar()"
                        [disabled]="!form.colegio_id || !form.dias_minimos || form.monto == null">
                  Guardar
                </button>
              </div>
            </div>

            <table class="table table-sm table-hover mb-0">
              <thead class="table-light">
                <tr><th>Colegio</th><th>Días mín.</th><th>Monto</th><th>Activo</th><th></th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of configs">
                  <td>{{ c.colegio_nombre }}</td>
                  <td>{{ c.dias_minimos }}</td>
                  <td>\${{ c.monto | number:'1.0-0' }}</td>
                  <td>
                    <span class="badge" [class.bg-success]="c.activo" [class.bg-secondary]="!c.activo">
                      {{ c.activo ? 'Sí' : 'No' }}
                    </span>
                  </td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1" (click)="editar(c)" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" (click)="eliminar(c)" title="Eliminar"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>
                <tr *ngIf="configs.length === 0">
                  <td colspan="5" class="text-center text-muted py-3">Sin configuraciones</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Aplicar rebajas -->
      <div class="col-lg-5">
        <div class="card">
          <div class="card-header bg-success text-white">
            <i class="bi bi-calculator me-1"></i>Aplicar rebajas del mes
          </div>
          <div class="card-body">
            <p class="text-muted small">
              Recalcula las rebajas del mes seleccionado según los tickets ya cargados.
              Es seguro re-ejecutarlo (recalcula desde cero ese mes).
            </p>
            <div class="row g-2">
              <div class="col-6">
                <label class="form-label small text-muted mb-1">Mes</label>
                <select class="form-select form-select-sm" [(ngModel)]="mes">
                  <option *ngFor="let m of meses; let i = index" [value]="i+1">{{ m }}</option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label small text-muted mb-1">Año</label>
                <input type="number" class="form-control form-control-sm" [(ngModel)]="anio">
              </div>
            </div>
            <button class="btn btn-success btn-sm mt-3 w-100" (click)="aplicar()" [disabled]="aplicando">
              <span *ngIf="aplicando" class="spinner-border spinner-border-sm me-1"></span>
              Aplicar rebajas
            </button>
            <div *ngIf="resultado" class="alert alert-info mt-3 mb-0">{{ resultado.mensaje }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RebajaConfigComponent implements OnInit {
  colegios: Colegio[] = [];
  configs: ConfiguracionRebaja[] = [];
  form: { colegio_id?: number; dias_minimos?: number; monto?: number; activo: boolean } = { activo: true };

  meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  mes = new Date().getMonth() + 1;
  anio = new Date().getFullYear();
  aplicando = false;
  resultado?: RebajaResult;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getColegios().subscribe(d => this.colegios = d);
    this.cargar();
  }

  cargar() {
    this.api.getRebajaConfigs().subscribe(d => this.configs = d);
  }

  guardar() {
    if (!this.form.colegio_id || !this.form.dias_minimos || this.form.monto == null) return;
    this.api.saveRebajaConfig({
      colegio_id: this.form.colegio_id,
      dias_minimos: this.form.dias_minimos,
      monto: this.form.monto,
      activo: this.form.activo,
    }).subscribe(() => {
      this.form = { activo: true };
      this.cargar();
    });
  }

  editar(c: ConfiguracionRebaja) {
    this.form = { colegio_id: c.colegio_id, dias_minimos: c.dias_minimos, monto: c.monto, activo: c.activo };
  }

  eliminar(c: ConfiguracionRebaja) {
    if (!confirm(`¿Eliminar la configuración de rebaja de ${c.colegio_nombre}?`)) return;
    this.api.deleteRebajaConfig(c.id).subscribe(() => this.cargar());
  }

  aplicar() {
    this.aplicando = true;
    this.resultado = undefined;
    this.api.aplicarRebajas(this.anio, this.mes).subscribe({
      next: (r) => { this.resultado = r; this.aplicando = false; },
      error: () => { this.aplicando = false; },
    });
  }
}
