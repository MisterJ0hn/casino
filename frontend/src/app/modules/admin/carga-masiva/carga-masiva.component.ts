import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { CargaMasivaResult, Colegio } from '../../../core/models';

@Component({
  selector: 'app-carga-masiva',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2 class="mb-3"><i class="bi bi-upload me-2"></i>Carga Masiva</h2>

    <div class="card mb-4">
      <div class="card-body">
        <p class="text-muted">
          Cargá cursos, alumnos y apoderados desde un archivo <strong>CSV</strong> (separador <code>;</code>)
          o <strong>Excel</strong>. Primero previsualizás (sin afectar la base) y luego confirmás.
        </p>
        <div class="row g-3">
          <div class="col-md-5">
            <label class="form-label fw-semibold">Colegio destino <span class="text-danger">*</span></label>
            <select class="form-select" [(ngModel)]="colegioId" (change)="reset()">
              <option [ngValue]="''">Seleccionar…</option>
              <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
            </select>
          </div>
          <div class="col-md-5">
            <label class="form-label fw-semibold">Archivo <span class="text-danger">*</span></label>
            <input type="file" class="form-control" accept=".csv,.xlsx,.xls" (change)="onFile($event)">
          </div>
          <div class="col-md-2 d-flex align-items-end">
            <button class="btn btn-primary w-100"
                    (click)="previsualizar()"
                    [disabled]="!colegioId || !archivo || cargando">
              <span *ngIf="cargando" class="spinner-border spinner-border-sm me-1"></span>
              Previsualizar
            </button>
          </div>
        </div>
        <div *ngIf="error" class="alert alert-danger mt-3 mb-0 d-flex gap-2">
          <i class="bi bi-exclamation-triangle-fill mt-1"></i>
          <span>{{ error }}</span>
          <button type="button" class="btn-close ms-auto" (click)="error=null"></button>
        </div>
      </div>
    </div>

    <!-- Resultado -->
    <div *ngIf="resultado" class="card">
      <div class="card-header d-flex align-items-center gap-2"
           [class.bg-warning]="!resultado.commit"
           [class.bg-success]="resultado.commit"
           [class.text-white]="resultado.commit">
        <i class="bi" [class.bi-eye]="!resultado.commit" [class.bi-check-circle-fill]="resultado.commit"></i>
        <strong>{{ resultado.commit ? 'Carga confirmada' : 'Previsualización (no se guardó nada)' }}</strong>
      </div>
      <div class="card-body">
        <div class="row text-center g-2 mb-3">
          <div class="col"><div class="border rounded py-2"><div class="h4 mb-0">{{ resultado.filas_ok }}</div><small class="text-muted">Filas OK</small></div></div>
          <div class="col"><div class="border rounded py-2"><div class="h4 mb-0 text-danger">{{ resultado.filas_error }}</div><small class="text-muted">Filas con error</small></div></div>
          <div class="col"><div class="border rounded py-2"><div class="h4 mb-0">{{ resultado.cursos_creados }}</div><small class="text-muted">Cursos creados</small></div></div>
          <div class="col"><div class="border rounded py-2"><div class="h4 mb-0">{{ resultado.alumnos_creados }}</div><small class="text-muted">Alumnos nuevos</small></div></div>
          <div class="col"><div class="border rounded py-2"><div class="h4 mb-0">{{ resultado.alumnos_actualizados }}</div><small class="text-muted">Alumnos actualizados</small></div></div>
          <div class="col"><div class="border rounded py-2"><div class="h4 mb-0">{{ resultado.apoderados_creados }}</div><small class="text-muted">Apoderados nuevos</small></div></div>
          <div class="col"><div class="border rounded py-2"><div class="h4 mb-0">{{ resultado.apoderados_actualizados }}</div><small class="text-muted">Apoderados actualizados</small></div></div>
          <div class="col"><div class="border rounded py-2"><div class="h4 mb-0">{{ resultado.vinculos_creados }}</div><small class="text-muted">Vínculos creados</small></div></div>
        </div>

        <div *ngIf="resultado.errores.length" class="mb-3">
          <h6 class="text-danger"><i class="bi bi-exclamation-circle me-1"></i>Errores / advertencias ({{ resultado.errores.length }})</h6>
          <div class="border rounded p-2 bg-light" style="max-height:220px; overflow:auto">
            <div *ngFor="let e of resultado.errores" class="small font-monospace">{{ e }}</div>
          </div>
        </div>

        <div *ngIf="!resultado.commit" class="d-flex gap-2 align-items-center">
          <button class="btn btn-success"
                  (click)="confirmar()"
                  [disabled]="cargando || resultado.filas_ok === 0">
            <span *ngIf="cargando" class="spinner-border spinner-border-sm me-1"></span>
            <i class="bi bi-check-circle me-1"></i>Confirmar carga ({{ resultado.filas_ok }} filas)
          </button>
          <span class="text-muted small">Revisá el resumen antes de confirmar. Esta acción escribe en la base.</span>
        </div>
        <div *ngIf="resultado.commit" class="alert alert-success mb-0">
          <i class="bi bi-check-circle-fill me-1"></i>Los datos se guardaron correctamente.
        </div>
      </div>
    </div>
  `,
})
export class CargaMasivaComponent implements OnInit {
  colegios: Colegio[] = [];
  colegioId: number | '' = '';
  archivo: File | null = null;
  resultado: CargaMasivaResult | null = null;
  cargando = false;
  error: string | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getColegios().subscribe(d => this.colegios = d);
  }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files?.[0] ?? null;
    this.resultado = null;
  }

  reset() {
    this.resultado = null;
  }

  previsualizar() {
    if (!this.colegioId || !this.archivo) return;
    this.cargando = true;
    this.error = null;
    this.resultado = null;
    this.api.previewCargaMasiva(+this.colegioId, this.archivo).subscribe({
      next: (r) => { this.resultado = r; this.cargando = false; },
      error: (e) => { this.error = e?.error?.detail || 'No se pudo procesar el archivo.'; this.cargando = false; },
    });
  }

  confirmar() {
    if (!this.colegioId || !this.archivo) return;
    this.cargando = true;
    this.error = null;
    this.api.confirmCargaMasiva(+this.colegioId, this.archivo).subscribe({
      next: (r) => { this.resultado = r; this.cargando = false; },
      error: (e) => { this.error = e?.error?.detail || 'No se pudo confirmar la carga.'; this.cargando = false; },
    });
  }
}
