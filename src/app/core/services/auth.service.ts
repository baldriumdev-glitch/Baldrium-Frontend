import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Tipos alineados al backend ────────────────────────────────────────
export type RolUsuario =
  | 'Director'
  | 'Coordinador'
  | 'Auxiliar Administrativo'
  | 'Asesor comercial'
  | 'Telemercaderista';

export interface Usuario {
  cedula:           string;
  nombre:           string;
  celular:          string;
  telefono:         string;
  correo:           string;      // ← backend devuelve "correo"
  direccion:        string;
  codigoTrabajador: string;
  roles:            RolUsuario[]; // ← array, no string
}

export interface LoginRequest {
  cedula:    string;
  contrasena: string;             // ← backend espera "contrasena"
}

export interface LoginResponse {
  token:   string;
  usuario: Usuario;
}

// Permisos por módulo (debe coincidir con NAV_ITEMS en sidebar.component.ts)
const PERMISOS: Record<RolUsuario, string[]> = {
  'Director':                ['usuarios'],
  'Coordinador':             ['inventario'],
  'Asesor comercial':        ['clientes','compras'],
  'Telemercaderista':        ['telemercadeo','beneficios'],
  'Auxiliar Administrativo': ['aprobar-compras','aprobar-beneficios']
};

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly TOKEN_KEY   = 'baldrium_token';
  private readonly USUARIO_KEY = 'baldrium_usuario';

  private usuarioSubject = new BehaviorSubject<Usuario | null>(
    this.getUsuarioGuardado()
  );
  usuario$ = this.usuarioSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  // ── Login ─────────────────────────────────────────────────────────
  login(credenciales: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, credenciales)
      .pipe(
        tap(res => {
          localStorage.setItem(this.TOKEN_KEY,   res.token);
          localStorage.setItem(this.USUARIO_KEY, JSON.stringify(res.usuario));
          this.usuarioSubject.next(res.usuario);
        })
      );
  }



  // ── Olvidé contraseña ─────────────────────────────────────────────
  olvideMiContrasena(correo: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(
      `${environment.apiUrl}/auth/olvide-contrasena`,
      { correo }
    );
  }

  // ── Logout ────────────────────────────────────────────────────────
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USUARIO_KEY);
    this.usuarioSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  // ── Getters ───────────────────────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  estaAutenticado(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  getUsuarioActual(): Usuario | null {
    return this.usuarioSubject.value;
  }

  getRoles(): RolUsuario[] {
    return this.getUsuarioActual()?.roles ?? [];
  }

  // Verifica si el usuario tiene AL MENOS uno de los roles dados
  tieneRol(...roles: RolUsuario[]): boolean {
    const misRoles = this.getRoles();
    return roles.some(r => misRoles.includes(r));
  }

  // Verifica permiso de módulo según el primer rol del usuario
  tienePermiso(modulo: string): boolean {
    const roles = this.getRoles();
    return roles.some(r => PERMISOS[r]?.includes(modulo));
  }

  private getUsuarioGuardado(): Usuario | null {
    try {
      const raw = localStorage.getItem(this.USUARIO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  actualizarUsuarioLocal(datos: Partial<Usuario>): void {
  const actual = this.getUsuarioActual();
  if (!actual) return;
  const actualizado = { ...actual, ...datos };
  localStorage.setItem(this.USUARIO_KEY, JSON.stringify(actualizado));
  this.usuarioSubject.next(actualizado);
}


}
