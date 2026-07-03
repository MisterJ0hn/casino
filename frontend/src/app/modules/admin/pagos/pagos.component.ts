import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { Apoderado, PagoList, PagoDetalle } from '../../../core/models';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2><i class="bi bi-cash-coin me-2"></i>Pagos</h2>
      <button class="btn btn-success" (click)="showForm = !showForm">
        <i class="bi bi-plus-circle me-1"></i>Registrar pago
      </button>
    </div>

    <!-- Formulario registrar pago (colapsable) -->
    <div *ngIf="showForm" class="card mb-4">
      <div class="card-header bg-success text-white">
        <i class="bi bi-plus-circle me-1"></i>Nuevo pago
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label fw-semibold">Apoderado <span class="text-danger">*</span></label>
            <select class="form-select" [(ngModel)]="apoderadoId" (change)="verDeuda()">
              <option value="">Seleccionar…</option>
              <option *ngFor="let a of apoderados" [value]="a.id">
                {{ a.nombre }} — {{ a.rut }}
              </option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label fw-semibold">Monto <span class="text-danger">*</span></label>
            <input type="number" class="form-control" [(ngModel)]="monto" placeholder="0" min="1">
          </div>
          <div class="col-md-2">
            <label class="form-label fw-semibold">Fecha</label>
            <input type="date" class="form-control" [(ngModel)]="fecha">
          </div>
          <div class="col-md-4 d-flex align-items-end gap-2">
            <div *ngIf="deuda !== null"
                 class="badge fs-6 px-3 py-2"
                 [class.bg-danger]="deuda > 0"
                 [class.bg-success]="deuda <= 0">
              Deuda: \${{ deuda | number:'1.0-0' }}
            </div>
            <button class="btn btn-success ms-auto"
                    (click)="registrar()"
                    [disabled]="!apoderadoId || !monto">
              <i class="bi bi-check-circle me-1"></i>Aplicar (FIFO)
            </button>
          </div>
        </div>
        <div *ngIf="mensajeExito" class="alert alert-success mt-3 mb-0 d-flex gap-2">
          <i class="bi bi-check-circle-fill mt-1"></i>
          <span>{{ mensajeExito }}</span>
          <button type="button" class="btn-close ms-auto" (click)="mensajeExito=null"></button>
        </div>
      </div>
    </div>

    <!-- Tabla de pagos -->
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th style="width:110px">N° Trans.</th>
              <th>RUT</th>
              <th>Apoderado</th>
              <th class="text-end">Monto</th>
              <th>Fecha</th>
              <th style="width:120px"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of pagos">
              <td class="font-monospace text-muted">#{{ p.id | number:'6.0-0' }}</td>
              <td>{{ p.apoderado_rut }}</td>
              <td>{{ p.apoderado_nombre }}</td>
              <td class="text-end fw-semibold">\${{ p.monto | number:'1.0-0' }}</td>
              <td>{{ p.fecha }}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-1"
                        (click)="verDetalle(p)"
                        title="Ver detalle">
                  <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger"
                        (click)="anular(p)"
                        title="Anular pago">
                  <i class="bi bi-x-circle"></i>
                </button>
              </td>
            </tr>
            <tr *ngIf="pagos.length === 0">
              <td colspan="6" class="text-center text-muted py-3">Sin pagos registrados</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

    <!-- Modal detalle -->
    <div class="modal fade show d-block" *ngIf="detalle" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-receipt me-2"></i>
              Detalle — Transacción #{{ detalle.id | number:'6.0-0' }}
            </h5>
            <button class="btn-close" (click)="detalle = null"></button>
          </div>
          <div class="modal-body">
            <div class="row g-2 mb-3">
              <div class="col-sm-6">
                <small class="text-muted">Apoderado</small>
                <div class="fw-semibold">{{ detalle.apoderado_nombre }}</div>
              </div>
              <div class="col-sm-3">
                <small class="text-muted">Fecha</small>
                <div>{{ detalle.fecha }}</div>
              </div>
              <div class="col-sm-3">
                <small class="text-muted">Monto total</small>
                <div class="fw-semibold text-success">\${{ detalle.monto | number:'1.0-0' }}</div>
              </div>
            </div>

            <h6 class="text-muted mb-2">Consumos cubiertos</h6>
            <table class="table table-sm table-bordered mb-0">
              <thead class="table-light">
                <tr>
                  <th>Fecha consumo</th>
                  <th>Tipo</th>
                  <th>Modalidad</th>
                  <th class="text-end">Precio</th>
                  <th class="text-end">Aplicado</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of detalle.items">
                  <td>{{ item.fecha_consumo }}</td>
                  <td><span class="badge bg-secondary">{{ item.tipo }}</span></td>
                  <td><span class="badge bg-info text-dark">{{ item.modalidad }}</span></td>
                  <td class="text-end">\${{ item.precio_consumo | number:'1.0-0' }}</td>
                  <td class="text-end text-success fw-semibold">
                    \${{ item.monto_aplicado | number:'1.0-0' }}
                  </td>
                </tr>
                <tr *ngIf="detalle.items.length === 0">
                  <td colspan="5" class="text-center text-muted">Sin consumos asociados</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="detalle = null">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PagosComponent implements OnInit {
  pagos: PagoList[] = [];
  apoderados: Apoderado[] = [];
  detalle: PagoDetalle | null = null;

  showForm = false;
  apoderadoId: number | '' = '';
  monto?: number;
  fecha = new Date().toISOString().split('T')[0];
  deuda: number | null = null;
  mensajeExito: string | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getApoderados().subscribe(d => this.apoderados = d);
    this.cargar();
  }

  cargar() {
    this.api.getPagos().subscribe(d => this.pagos = d);
  }

  verDeuda() {
    if (!this.apoderadoId) { this.deuda = null; return; }
    this.api.getDeuda(+this.apoderadoId).subscribe(d => this.deuda = d.deuda);
  }

  registrar() {
    if (!this.apoderadoId || !this.monto) return;
    this.api.registrarPago({
      apoderado_id: +this.apoderadoId,
      monto: this.monto,
      fecha: this.fecha,
    }).subscribe(() => {
      this.mensajeExito = `Pago de $${this.monto!.toLocaleString('es-CL')} registrado y aplicado exitosamente.`;
      this.monto = undefined;
      this.showForm = false;
      this.verDeuda();
      this.cargar();
    });
  }

  verDetalle(pago: PagoList) {
    this.api.getPagoDetalle(pago.id).subscribe(d => this.detalle = d);
  }

  anular(pago: PagoList) {
    if (!confirm(
      `¿Anular la transacción #${pago.id} de $${Number(pago.monto).toLocaleString('es-CL')} ` +
      `del apoderado ${pago.apoderado_nombre}?\n\n` +
      `Los consumos cubiertos por este pago quedarán como no pagados.`
    )) return;

    this.api.anularPago(pago.id).subscribe(() => {
      this.cargar();
    });
  }
}
