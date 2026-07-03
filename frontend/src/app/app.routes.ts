import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./modules/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/admin/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'colegios',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/admin/colegios/colegios.component').then(m => m.ColegiosComponent),
  },
  {
    path: 'cursos',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/admin/cursos/cursos.component').then(m => m.CursosComponent),
  },
  {
    path: 'alumnos',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/admin/alumnos/alumnos.component').then(m => m.AlumnosComponent),
  },
  {
    path: 'apoderados',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/admin/apoderados/apoderados.component').then(m => m.ApoderadosComponent),
  },
  {
    path: 'consumos',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/admin/consumos/consumos.component').then(m => m.ConsumosComponent),
  },
  {
    path: 'pagos',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/admin/pagos/pagos.component').then(m => m.PagosComponent),
  },
  {
    path: 'configuracion',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/admin/configuracion/configuracion.component').then(m => m.ConfiguracionComponent),
  },
  {
    path: 'dias-libres',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/admin/dias-libres/dias-libres.component').then(m => m.DiasLibresComponent),
  },
  {
    path: 'usuarios',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/admin/usuarios/usuarios.component').then(m => m.UsuariosComponent),
  },
  {
    path: 'portal/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/apoderado/portal/portal.component').then(m => m.PortalComponent),
  },
  { path: '**', redirectTo: '/dashboard' },
];
