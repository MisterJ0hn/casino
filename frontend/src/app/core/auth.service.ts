import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'casino_token';
  private readonly USER_KEY  = 'casino_user';
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<void> {
    return this.http
      .post<{ access_token: string }>(`${this.base}/auth/login`, { username, password })
      .pipe(
        tap(r => {
          localStorage.setItem(this.TOKEN_KEY, r.access_token);
          localStorage.setItem(this.USER_KEY, username);
        }),
        map(() => undefined),
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUsername(): string {
    return localStorage.getItem(this.USER_KEY) ?? '';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
