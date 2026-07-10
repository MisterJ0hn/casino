import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { ApoderadoDeuda, Colegio } from '../../../core/models';

interface HijoDeuda { id: number; nombre: string; deuda: number; }

@Component({
  selector: 'app-deudas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <h2 class="mb-3"><i class="bi bi-file-earmark-pdf me-2"></i>Deudas</h2>

    <div class="row g-3 align-items-end mb-3">
      <div class="col-md-4">
        <label class="form-label small text-muted mb-1">Colegio</label>
        <select class="form-select" [(ngModel)]="colegioId" (ngModelChange)="cargar()">
          <option [ngValue]="undefined" disabled>Seleccione un colegio</option>
          <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
        </select>
      </div>
      <div class="col-md-4">
        <div class="card bg-light">
          <div class="card-body py-2">
            <div class="small text-muted">Deuda total del colegio</div>
            <div class="h4 mb-0 text-danger">\${{ deudaTotal | number:'1.0-0' }}</div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label small text-muted mb-1">Buscar apoderado</label>
        <div class="input-group">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input class="form-control" placeholder="RUT o nombre…" [(ngModel)]="filtro">
        </div>
      </div>
    </div>

    <div *ngIf="cargando" class="text-muted"><span class="spinner-border spinner-border-sm me-1"></span>Cargando…</div>

    <div class="card" *ngIf="!cargando">
      <div class="card-body p-0">
        <div class="table-responsive">
        <table class="table table-hover mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th>RUT</th><th>Apoderado</th><th class="text-end">Deuda</th><th style="width:170px"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of apoderadosFiltrados">
              <td>{{ a.rut }}</td>
              <td>{{ a.nombre }}</td>
              <td class="text-end fw-semibold" [class.text-danger]="a.deuda > 0">\${{ a.deuda | number:'1.0-0' }}</td>
              <td class="text-end text-nowrap">
                <a [routerLink]="['/portal', a.id]" class="btn btn-sm btn-outline-info me-1" title="Ver detalle en el portal">
                  <i class="bi bi-eye"></i>
                </a>
                <button class="btn btn-sm btn-outline-success me-1" (click)="abrirPago(a)" title="Registrar pago">
                  <i class="bi bi-cash-coin"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" (click)="descargarPdf(a)" [disabled]="descargando === a.id" title="Descargar PDF">
                  <span *ngIf="descargando === a.id" class="spinner-border spinner-border-sm"></span>
                  <i *ngIf="descargando !== a.id" class="bi bi-file-earmark-pdf"></i>
                </button>
              </td>
            </tr>
            <tr *ngIf="apoderadosFiltrados.length === 0">
              <td colspan="4" class="text-center text-muted py-3">Sin resultados</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>
    <div class="small text-muted mt-2" *ngIf="!cargando">{{ apoderadosFiltrados.length }} apoderado(s)</div>

    <!-- Modal pago -->
    <div class="modal fade show d-block" *ngIf="pagarApo" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-cash-coin me-2"></i>Registrar pago</h5>
            <button class="btn-close" (click)="pagarApo=null"></button>
          </div>
          <div class="modal-body">
            <p class="mb-1"><strong>{{ pagarApo.nombre }}</strong> — {{ pagarApo.rut }}</p>
            <p class="text-muted small">
              Deuda actual: <span class="text-danger fw-semibold">\${{ pagarApo.deuda | number:'1.0-0' }}</span>.
              El pago se aplica a los consumos más antiguos primero (FIFO).
            </p>
            <div class="mb-2">
              <label class="form-label small text-muted mb-1">Aplicar el pago a</label>
              <select class="form-select" [(ngModel)]="alumnoPagoId" (ngModelChange)="onAlumnoPago()"
                      [disabled]="cargandoHijos">
                <option [ngValue]="undefined">Todos los alumnos — deuda total (\${{ pagarApo.deuda | number:'1.0-0' }})</option>
                <option *ngFor="let h of hijosPago" [ngValue]="h.id">
                  {{ h.nombre }} (\${{ h.deuda | number:'1.0-0' }})
                </option>
              </select>
              <div class="form-text" *ngIf="cargandoHijos">Cargando alumnos…</div>
              <div class="form-text" *ngIf="!cargandoHijos && alumnoPagoId">Solo se aplicará a los consumos de este alumno.</div>
            </div>
            <div class="row g-2">
              <div class="col-7">
                <label class="form-label small text-muted mb-1">Monto</label>
                <input type="number" min="1" class="form-control" [(ngModel)]="montoPago">
              </div>
              <div class="col-5">
                <label class="form-label small text-muted mb-1">Fecha</label>
                <input type="date" class="form-control" [(ngModel)]="fechaPago">
              </div>
            </div>
            <div *ngIf="errorPago" class="text-danger small mt-2">{{ errorPago }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="pagarApo=null">Cancelar</button>
            <button class="btn btn-success" (click)="guardarPago()"
                    [disabled]="guardandoPago || !montoPago || montoPago <= 0">
              <span *ngIf="guardandoPago" class="spinner-border spinner-border-sm me-1"></span>
              Registrar pago
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DeudasComponent implements OnInit {
  colegios: Colegio[] = [];
  colegioId?: number;
  deudaTotal = 0;
  apoderados: ApoderadoDeuda[] = [];
  filtro = '';
  cargando = false;
  descargando: number | null = null;

  pagarApo: ApoderadoDeuda | null = null;
  montoPago?: number;
  fechaPago = new Date().toISOString().split('T')[0];
  guardandoPago = false;
  errorPago: string | null = null;
  hijosPago: HijoDeuda[] = [];
  alumnoPagoId?: number;
  cargandoHijos = false;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getColegios().subscribe(d => {
      this.colegios = d;
      if (d.length === 1) { this.colegioId = d[0].id; this.cargar(); }
    });
  }

  get apoderadosFiltrados(): ApoderadoDeuda[] {
    const q = this.filtro.trim().toLowerCase();
    if (!q) return this.apoderados;
    return this.apoderados.filter(a =>
      a.rut.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q));
  }

  cargar() {
    if (!this.colegioId) return;
    this.cargando = true;
    this.api.getDeudasColegio(this.colegioId).subscribe({
      next: (r) => { this.deudaTotal = r.deuda_total; this.apoderados = r.apoderados; this.cargando = false; },
      error: () => { this.cargando = false; },
    });
  }

  abrirPago(a: ApoderadoDeuda) {
    this.pagarApo = a;
    this.montoPago = a.deuda > 0 ? a.deuda : undefined;
    this.fechaPago = new Date().toISOString().split('T')[0];
    this.errorPago = null;
    this.alumnoPagoId = undefined;
    this.hijosPago = [];
    this.cargandoHijos = true;
    // Deuda por alumno para permitir pago dirigido.
    this.api.getPortal(a.id).subscribe({
      next: (p) => {
        this.hijosPago = p.hijos
          .map(h => ({
            id: h.id,
            nombre: h.nombre,
            deuda: h.periodos.reduce((s, per) => s + (per.total_pendiente || 0), 0),
          }))
          .filter(h => h.deuda > 0);
        this.cargandoHijos = false;
      },
      error: () => { this.cargandoHijos = false; },
    });
  }

  onAlumnoPago() {
    if (!this.pagarApo) return;
    if (this.alumnoPagoId == null) {
      this.montoPago = this.pagarApo.deuda > 0 ? this.pagarApo.deuda : undefined;
    } else {
      const h = this.hijosPago.find(x => x.id === this.alumnoPagoId);
      this.montoPago = h && h.deuda > 0 ? h.deuda : undefined;
    }
  }

  guardarPago() {
    if (!this.pagarApo || !this.montoPago || this.montoPago <= 0) return;
    this.guardandoPago = true;
    this.errorPago = null;
    this.api.registrarPago({
      apoderado_id: this.pagarApo.id, monto: this.montoPago, fecha: this.fechaPago,
      alumno_id: this.alumnoPagoId,
    }).subscribe({
      next: () => { this.guardandoPago = false; this.pagarApo = null; this.cargar(); },
      error: (e) => { this.guardandoPago = false; this.errorPago = e?.error?.detail ?? 'No se pudo registrar el pago.'; },
    });
  }

  descargarPdf(a: ApoderadoDeuda) {
    this.descargando = a.id;
    this.api.descargarDeudaPdf(a.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `deuda_${a.rut}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        this.descargando = null;
      },
      error: () => { this.descargando = null; },
    });
  }
}
