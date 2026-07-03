import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { Colegio, Usuario } from '../../../core/models';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2><i class="bi bi-people me-2"></i>Usuarios</h2>
      <button class="btn btn-success" (click)="showForm = !showForm">
        <i class="bi bi-plus-circle me-1"></i>Nuevo usuario
      </button>
    </div>

    <!-- Formulario alta (colapsable) -->
    <div *ngIf="showForm" class="card mb-4">
      <div class="card-header bg-success text-white">
        <i class="bi bi-plus-circle me-1"></i>Crear usuario
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-3">
            <label class="form-label fw-semibold">Usuario <span class="text-danger">*</span></label>
            <input class="form-control" [(ngModel)]="nuevo.username" placeholder="usuario">
          </div>
          <div class="col-md-3">
            <label class="form-label fw-semibold">Contraseña <span class="text-danger">*</span></label>
            <input type="password" class="form-control" [(ngModel)]="nuevo.password" placeholder="mín. 6 caracteres">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold">Colegios asignados</label>
            <select multiple class="form-select" [(ngModel)]="nuevo.colegioIds" size="4">
              <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
            </select>
            <small class="text-muted">Sin selección = acceso global</small>
          </div>
          <div class="col-md-2 d-flex align-items-end">
            <button class="btn btn-success w-100"
                    (click)="crear()"
                    [disabled]="!nuevo.username || !nuevo.password || nuevo.password.length < 6">
              <i class="bi bi-check-circle me-1"></i>Crear
            </button>
          </div>
        </div>
        <div *ngIf="mensajeExito" class="alert alert-success mt-3 mb-0 d-flex gap-2">
          <i class="bi bi-check-circle-fill mt-1"></i>
          <span>{{ mensajeExito }}</span>
          <button type="button" class="btn-close ms-auto" (click)="mensajeExito=null"></button>
        </div>
        <div *ngIf="error" class="alert alert-danger mt-3 mb-0 d-flex gap-2">
          <i class="bi bi-exclamation-triangle-fill mt-1"></i>
          <span>{{ error }}</span>
          <button type="button" class="btn-close ms-auto" (click)="error=null"></button>
        </div>
      </div>
    </div>

    <!-- Tabla de usuarios -->
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
        <table class="table table-hover mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th style="width:70px">ID</th>
              <th>Usuario</th>
              <th>Colegios</th>
              <th style="width:100px">Estado</th>
              <th style="width:220px"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of usuarios">
              <td class="text-muted">#{{ u.id }}</td>
              <td class="fw-semibold">{{ u.username }}</td>
              <td>
                <span *ngIf="u.colegios.length === 0" class="text-muted fst-italic">Acceso global</span>
                <span *ngFor="let c of u.colegios" class="badge bg-info text-dark me-1">{{ c.nombre }}</span>
              </td>
              <td>
                <span class="badge" [class.bg-success]="u.activo" [class.bg-secondary]="!u.activo">
                  {{ u.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-1" (click)="abrirEdicion(u)" title="Editar colegios / estado">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" (click)="abrirPassword(u)" title="Cambiar contraseña">
                  <i class="bi bi-key"></i>
                </button>
              </td>
            </tr>
            <tr *ngIf="usuarios.length === 0">
              <td colspan="5" class="text-center text-muted py-3">Sin usuarios</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

    <!-- Modal edición -->
    <div class="modal fade show d-block" *ngIf="editUser" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-pencil me-2"></i>Editar — {{ editUser.username }}</h5>
            <button class="btn-close" (click)="editUser = null"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label fw-semibold">Colegios asignados</label>
              <select multiple class="form-select" [(ngModel)]="editColegioIds" size="5">
                <option *ngFor="let c of colegios" [ngValue]="c.id">{{ c.nombre }}</option>
              </select>
              <small class="text-muted">Sin selección = acceso global</small>
            </div>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" [(ngModel)]="editActivo" id="editActivo">
              <label class="form-check-label" for="editActivo">Usuario activo</label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="editUser = null">Cancelar</button>
            <button class="btn btn-primary" (click)="guardarEdicion()">Guardar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal contraseña -->
    <div class="modal fade show d-block" *ngIf="pwdUser" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-key me-2"></i>Contraseña — {{ pwdUser.username }}</h5>
            <button class="btn-close" (click)="pwdUser = null"></button>
          </div>
          <div class="modal-body">
            <label class="form-label fw-semibold">Nueva contraseña</label>
            <input type="password" class="form-control" [(ngModel)]="nuevaPassword" placeholder="mín. 6 caracteres">
            <small class="text-muted">La contraseña se reemplaza inmediatamente.</small>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="pwdUser = null">Cancelar</button>
            <button class="btn btn-warning" (click)="guardarPassword()" [disabled]="nuevaPassword.length < 6">
              Cambiar contraseña
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class UsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  colegios: Colegio[] = [];

  showForm = false;
  nuevo: { username: string; password: string; colegioIds: number[] } = { username: '', password: '', colegioIds: [] };
  mensajeExito: string | null = null;
  error: string | null = null;

  editUser: Usuario | null = null;
  editColegioIds: number[] = [];
  editActivo = true;

  pwdUser: Usuario | null = null;
  nuevaPassword = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargar();
    this.api.getColegios().subscribe(d => this.colegios = d);
  }

  cargar() {
    this.api.getUsuarios().subscribe(d => this.usuarios = d);
  }

  crear() {
    this.error = null;
    this.api.createUsuario({
      username: this.nuevo.username,
      password: this.nuevo.password,
      activo: true,
      colegio_ids: this.nuevo.colegioIds,
    }).subscribe({
      next: () => {
        this.mensajeExito = `Usuario '${this.nuevo.username}' creado.`;
        this.nuevo = { username: '', password: '', colegioIds: [] };
        this.cargar();
      },
      error: (e) => this.error = e?.error?.detail || 'No se pudo crear el usuario.',
    });
  }

  abrirEdicion(u: Usuario) {
    this.editUser = u;
    this.editColegioIds = u.colegios.map(c => c.id);
    this.editActivo = u.activo;
  }

  guardarEdicion() {
    if (!this.editUser) return;
    this.api.updateUsuario(this.editUser.id, {
      activo: this.editActivo,
      colegio_ids: this.editColegioIds,
    }).subscribe(() => {
      this.editUser = null;
      this.cargar();
    });
  }

  abrirPassword(u: Usuario) {
    this.pwdUser = u;
    this.nuevaPassword = '';
  }

  guardarPassword() {
    if (!this.pwdUser || this.nuevaPassword.length < 6) return;
    this.api.updateUsuarioPassword(this.pwdUser.id, this.nuevaPassword).subscribe(() => {
      this.pwdUser = null;
      this.nuevaPassword = '';
    });
  }
}
