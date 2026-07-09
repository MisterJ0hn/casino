import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { PortalOut } from '../../../core/models';

@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="portal">

      <div class="d-flex align-items-center mb-3 gap-3">
        <h2 class="mb-0"><i class="bi bi-person-circle me-2"></i>Portal del Apoderado</h2>
        <span class="badge fs-6 px-3 py-2"
              [class.bg-danger]="portal.deuda_total > 0"
              [class.bg-success]="portal.deuda_total <= 0">
          Deuda total: \${{ portal.deuda_total | number:'1.0-0' }}
        </span>
      </div>
      <hr>

      <div *ngIf="portal.hijos.length === 0" class="alert alert-info">
        No hay alumnos vinculados a este apoderado.
      </div>

      <!-- Card por alumno -->
      <div *ngFor="let hijo of portal.hijos" class="card mb-4 shadow-sm">
        <div class="card-header bg-primary text-white d-flex align-items-center gap-2">
          <i class="bi bi-person-fill"></i>
          <span class="fw-semibold">{{ hijo.nombre }}</span>
          <small class="opacity-75 ms-1">{{ hijo.rut }}</small>
          <span class="badge bg-white text-primary ms-auto">
            <i class="bi bi-journal-text me-1"></i>{{ hijo.curso_nombre }}
          </span>
          <span class="badge bg-white text-primary">
            <i class="bi bi-building me-1"></i>{{ hijo.colegio_nombre }}
          </span>
        </div>

        <div *ngIf="hijo.periodos.length === 0" class="card-body text-muted">
          Sin consumos registrados.
        </div>

        <!-- Accordion de períodos -->
        <div class="accordion accordion-flush" *ngIf="hijo.periodos.length > 0">
          <div *ngFor="let p of hijo.periodos" class="accordion-item">

            <h2 class="accordion-header">
              <button type="button"
                      class="accordion-button py-2"
                      [class.collapsed]="!isOpen(hijo.id, p.anio, p.mes)"
                      style="cursor:pointer"
                      (click)="toggle(hijo.id, p.anio, p.mes)">
                <div class="d-flex flex-wrap align-items-center gap-3 w-100 pe-3">
                  <span class="fw-semibold" style="min-width:160px">
                    {{ p.nombre_mes }} {{ p.anio }}
                    <small class="text-muted fw-normal ms-1">({{ p.consumos.length }} días)</small>
                  </span>
                  <span class="text-muted small">
                    Consumo: <strong>\${{ p.total_consumo | number:'1.0-0' }}</strong>
                  </span>
                  <span class="text-success small">
                    Pagado: <strong>\${{ p.total_pagado | number:'1.0-0' }}</strong>
                  </span>
                  <span *ngIf="p.rebaja && p.rebaja > 0" class="text-info small">
                    Rebaja: <strong>-\${{ p.rebaja | number:'1.0-0' }}</strong>
                  </span>
                  <span class="small fw-semibold ms-auto"
                        [class.text-danger]="p.total_pendiente > 0"
                        [class.text-success]="p.total_pendiente <= 0">
                    Pendiente: \${{ p.total_pendiente | number:'1.0-0' }}
                  </span>
                </div>
              </button>
            </h2>

            <div class="accordion-collapse collapse" [class.show]="isOpen(hijo.id, p.anio, p.mes)">
              <div class="accordion-body pt-2 pb-3">

                <!-- Días libres del período -->
                <div *ngIf="p.dias_libres.length > 0" class="mb-3">
                  <small class="text-muted fw-semibold me-2">
                    <i class="bi bi-calendar-x me-1"></i>Días libres:
                  </small>
                  <span *ngFor="let d of p.dias_libres"
                        class="badge bg-warning text-dark me-1">{{ d }}</span>
                </div>

                <!-- Tabla de consumos -->
                <table class="table table-sm table-hover mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Modalidad</th>
                      <th class="text-end">Precio</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let c of p.consumos">
                      <td>{{ c.fecha }}</td>
                      <td><span class="badge bg-secondary">{{ c.tipo }}</span></td>
                      <td><span class="badge bg-info text-dark">{{ c.modalidad }}</span></td>
                      <td class="text-end">\${{ c.precio | number:'1.0-0' }}</td>
                      <td>
                        <span class="badge"
                              [class.bg-success]="c.pagado"
                              [class.bg-warning]="!c.pagado"
                              [class.text-dark]="!c.pagado">
                          {{ c.pagado ? 'Pagado' : 'Pendiente' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

              </div>
            </div>

          </div>
        </div>
      </div>

    </div>

    <div *ngIf="!portal" class="d-flex justify-content-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>
  `,
})
export class PortalComponent implements OnInit {
  portal?: PortalOut;
  private openKeys = new Set<string>();

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.api.getPortal(id).subscribe(d => this.portal = d);
  }

  private key(hijoId: number, anio: number, mes: number): string {
    return `${hijoId}-${anio}-${mes}`;
  }

  toggle(hijoId: number, anio: number, mes: number) {
    const k = this.key(hijoId, anio, mes);
    if (this.openKeys.has(k)) {
      this.openKeys.delete(k);
    } else {
      this.openKeys.add(k);
    }
  }

  isOpen(hijoId: number, anio: number, mes: number): boolean {
    return this.openKeys.has(this.key(hijoId, anio, mes));
  }
}
