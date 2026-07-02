import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="row g-4">
      <div class="col-12">
        <h2><i class="bi bi-speedometer2 me-2"></i>Dashboard</h2>
        <hr>
      </div>

      <div class="col-md-3">
        <div class="card border-primary h-100">
          <div class="card-body text-center">
            <i class="bi bi-building display-4 text-primary"></i>
            <h3 class="mt-2">{{ stats.colegios }}</h3>
            <p class="text-muted">Colegios</p>
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card border-success h-100">
          <div class="card-body text-center">
            <i class="bi bi-people display-4 text-success"></i>
            <h3 class="mt-2">{{ stats.alumnos }}</h3>
            <p class="text-muted">Alumnos activos</p>
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card border-info h-100">
          <div class="card-body text-center">
            <i class="bi bi-person-badge display-4 text-info"></i>
            <h3 class="mt-2">{{ stats.apoderados }}</h3>
            <p class="text-muted">Apoderados</p>
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card border-warning h-100">
          <div class="card-body text-center">
            <i class="bi bi-cup-hot display-4 text-warning"></i>
            <h3 class="mt-2">{{ stats.consumos }}</h3>
            <p class="text-muted">Consumos del mes</p>
          </div>
        </div>
      </div>

      <div class="col-12 mt-3">
        <h5>Acciones rápidas</h5>
        <div class="d-flex gap-2 flex-wrap">
          <a routerLink="/consumos" class="btn btn-primary">
            <i class="bi bi-upload me-1"></i>Importar Excel
          </a>
          <a routerLink="/consumos" class="btn btn-success">
            <i class="bi bi-calendar-check me-1"></i>Generar mensual
          </a>
          <a routerLink="/pagos" class="btn btn-warning">
            <i class="bi bi-cash me-1"></i>Registrar pago
          </a>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  stats = { colegios: 0, alumnos: 0, apoderados: 0, consumos: 0 };

  constructor(private api: ApiService) {}

  ngOnInit() {
    forkJoin({
      colegios: this.api.getColegios(),
      alumnos: this.api.getAlumnos(),
      apoderados: this.api.getApoderados(),
      consumos: this.api.getConsumos({
        anio: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
      }),
    }).subscribe({
      next: (data) => {
        this.stats.colegios = data.colegios.length;
        this.stats.alumnos = data.alumnos.length;
        this.stats.apoderados = data.apoderados.length;
        this.stats.consumos = data.consumos.length;
      },
    });
  }
}
