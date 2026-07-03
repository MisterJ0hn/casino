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
              <li class="nav-item">
                <a class="nav-link" routerLink="/colegios" routerLinkActive="active">
                  <i class="bi bi-building me-1"></i>Colegios
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/cursos" routerLinkActive="active">
                  <i class="bi bi-journal-text me-1"></i>Cursos
                </a>
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
              <li class="nav-item">
                <a class="nav-link" routerLink="/consumos" routerLinkActive="active">
                  <i class="bi bi-cup-hot me-1"></i>Consumos
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/pagos" routerLinkActive="active">
                  <i class="bi bi-cash-coin me-1"></i>Pagos
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/configuracion" routerLinkActive="active">
                  <i class="bi bi-gear me-1"></i>Configuración
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/dias-libres" routerLinkActive="active">
                  <i class="bi bi-calendar-x me-1"></i>Días Libres
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/usuarios" routerLinkActive="active">
                  <i class="bi bi-people me-1"></i>Usuarios
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
