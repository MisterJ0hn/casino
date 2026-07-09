import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <ng-container *ngIf="auth.isLoggedIn()">
      <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container-fluid">
          <a class="navbar-brand fw-bold" routerLink="/dashboard">
            <i class="bi bi-building me-2"></i>Casino Escolar
          </a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navMenu">
            <ul class="navbar-nav me-auto">
              <li class="nav-item">
                <a class="nav-link" routerLink="/dashboard" routerLinkActive="active">
                  <i class="bi bi-speedometer2 me-1"></i>Dashboard
                </a>
              </li>
              <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="bi bi-gear me-1"></i>Configuración
                </a>
                <ul class="dropdown-menu">
                  <li>
                    <a class="dropdown-item" routerLink="/colegios" routerLinkActive="active">
                      <i class="bi bi-building me-2"></i>Colegios
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item" routerLink="/cursos" routerLinkActive="active">
                      <i class="bi bi-journal-text me-2"></i>Cursos
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item" routerLink="/configuracion" routerLinkActive="active">
                      <i class="bi bi-sliders me-2"></i>Reglas de consumo
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item" routerLink="/usuarios" routerLinkActive="active">
                      <i class="bi bi-people me-2"></i>Usuarios
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item" routerLink="/rebaja-tickets" routerLinkActive="active">
                      <i class="bi bi-percent me-2"></i>Rebaja tickets
                    </a>
                  </li>
                </ul>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/alumnos" routerLinkActive="active">
                  <i class="bi bi-people me-1"></i>Alumnos
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/apoderados" routerLinkActive="active">
                  <i class="bi bi-person-badge me-1"></i>Apoderados
                </a>
              </li>
              <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="bi bi-arrow-left-right me-1"></i>Movimientos
                </a>
                <ul class="dropdown-menu">
                  <li>
                    <a class="dropdown-item" routerLink="/pagos" routerLinkActive="active">
                      <i class="bi bi-cash-coin me-2"></i>Pagos
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item" routerLink="/consumos" routerLinkActive="active">
                      <i class="bi bi-cup-hot me-2"></i>Consumos
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item" routerLink="/dias-libres" routerLinkActive="active">
                      <i class="bi bi-calendar-x me-2"></i>Días Libres
                    </a>
                  </li>
                </ul>
              </li>
              <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="bi bi-bar-chart me-1"></i>Informes
                </a>
                <ul class="dropdown-menu">
                  <li>
                    <a class="dropdown-item" routerLink="/deudas" routerLinkActive="active">
                      <i class="bi bi-file-earmark-pdf me-2"></i>Deudas
                    </a>
                  </li>
                </ul>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/carga-masiva" routerLinkActive="active">
                  <i class="bi bi-upload me-1"></i>Carga Masiva
                </a>
              </li>
            </ul>
            <ul class="navbar-nav ms-auto">
              <li class="nav-item d-flex align-items-center gap-2 me-2">
                <i class="bi bi-person-circle text-white-50"></i>
                <span class="text-white-50 small">{{ auth.getUsername() }}</span>
              </li>
              <li class="nav-item">
                <button class="btn btn-outline-light btn-sm" (click)="auth.logout()">
                  <i class="bi bi-box-arrow-right me-1"></i>Salir
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <div class="container-fluid mt-3">
        <router-outlet></router-outlet>
      </div>
    </ng-container>

    <ng-container *ngIf="!auth.isLoggedIn()">
      <router-outlet></router-outlet>
    </ng-container>
  `,
})
export class AppComponent {
  constructor(public auth: AuthService) {}
}
