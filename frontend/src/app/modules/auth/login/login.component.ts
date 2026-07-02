import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center"
         style="background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)">
      <div class="card shadow-lg border-0" style="width:380px">

        <div class="card-header bg-white text-center py-4 border-0">
          <i class="bi bi-building text-primary" style="font-size:2.5rem"></i>
          <h4 class="mt-2 mb-0 fw-bold">Casino Escolar</h4>
          <small class="text-muted">Sistema de gestión</small>
        </div>

        <div class="card-body px-4 pb-4">
          <div class="mb-3">
            <label class="form-label fw-semibold">Usuario</label>
            <div class="input-group">
              <span class="input-group-text bg-light"><i class="bi bi-person text-primary"></i></span>
              <input type="text"
                     class="form-control"
                     [(ngModel)]="username"
                     (keyup.enter)="login()"
                     placeholder="Ingrese su usuario"
                     autocomplete="username"
                     [class.is-invalid]="submitted && !username">
            </div>
          </div>

          <div class="mb-4">
            <label class="form-label fw-semibold">Contraseña</label>
            <div class="input-group">
              <span class="input-group-text bg-light"><i class="bi bi-lock text-primary"></i></span>
              <input [type]="showPass ? 'text' : 'password'"
                     class="form-control"
                     [(ngModel)]="password"
                     (keyup.enter)="login()"
                     placeholder="Ingrese su contraseña"
                     autocomplete="current-password"
                     [class.is-invalid]="submitted && !password">
              <button class="btn btn-outline-secondary" type="button"
                      (click)="showPass = !showPass" tabindex="-1">
                <i class="bi" [ngClass]="showPass ? 'bi-eye-slash' : 'bi-eye'"></i>
              </button>
            </div>
          </div>

          <div *ngIf="error" class="alert alert-danger py-2 mb-3 d-flex gap-2 align-items-center">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>{{ error }}</span>
          </div>

          <button class="btn btn-primary w-100 py-2 fw-semibold"
                  (click)="login()"
                  [disabled]="loading">
            <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
            <i *ngIf="!loading" class="bi bi-box-arrow-in-right me-2"></i>
            Ingresar
          </button>
        </div>

      </div>
    </div>
  `,
})
export class LoginComponent {
  username = '';
  password = '';
  showPass = false;
  loading = false;
  submitted = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.submitted = true;
    if (!this.username || !this.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.error = e.error?.detail ?? 'Credenciales inválidas';
        this.loading = false;
      },
    });
  }
}
