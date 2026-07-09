import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { ApoderadoDeuda, Colegio } from '../../../core/models';

@Component({
  selector: 'app-deudas',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
              <th>RUT</th><th>Apoderado</th><th class="text-end">Deuda</th><th style="width:120px"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of apoderadosFiltrados">
              <td>{{ a.rut }}</td>
              <td>{{ a.nombre }}</td>
              <td class="text-end fw-semibold" [class.text-danger]="a.deuda > 0">\${{ a.deuda | number:'1.0-0' }}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" (click)="descargarPdf(a)" [disabled]="descargando === a.id">
                  <span *ngIf="descargando === a.id" class="spinner-border spinner-border-sm me-1"></span>
                  <i class="bi bi-file-earmark-pdf me-1"></i>PDF
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
