import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, switchMap } from 'rxjs';
import { User, LoginRequest, RegisterRequest, JwtAuthenticationResponse, RegisterResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private isBrowser: boolean;

  private apiUrl = 'http://localhost:8080/api/auth';
  
  public currentUser = signal<User | null>(null);
  public isLoggedIn = signal<boolean>(false);

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Inicijalizuj signale SAMO na browser strani
    if (this.isBrowser) {
      const user = this.getUserFromStorage();
      const hasToken = this.hasToken();
      
      this.currentUser.set(user);
      this.isLoggedIn.set(hasToken);
      
      console.log('[AuthService] Initialized:', { hasToken, user });
    }
  }

  private getUserFromStorage(): User | null {
    if (!this.isBrowser) {
      return null;
    }
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  private hasToken(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    return !!localStorage.getItem('authToken');
  }

  login(credentials: LoginRequest): Observable<JwtAuthenticationResponse> {
    return this.http.post<JwtAuthenticationResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        console.log('[AuthService] Login response:', response);
        if (response.accessToken && this.isBrowser) {
          localStorage.setItem('authToken', response.accessToken);
        }
      }),
      switchMap(response => {
        // Pozivam /api/auth/me da dobijem prave user podatke sa pravim username-om
        return this.getCurrentUser().pipe(
          tap(user => {
            if (this.isBrowser) {
              localStorage.setItem('currentUser', JSON.stringify(user));
              this.currentUser.set(user);
              this.isLoggedIn.set(true);
              console.log('[AuthService] User logged in:', { user, isLoggedIn: this.isLoggedIn() });
            }
          }),
          switchMap(() => {
            // Vraćam originalni response
            return [response];
          })
        );
      }),
      catchError(error => {
        console.error('[AuthService] Login error:', error);
        return throwError(() => error);
      })
    );
  }

  register(userData: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        console.log('Registration successful:', response.message);
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('[AuthService] Get current user error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    console.log('[AuthService] Logging out...');
    if (this.isBrowser) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
    }
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    console.log('[AuthService] User logged out, isLoggedIn:', this.isLoggedIn());
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem('authToken');
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
}
