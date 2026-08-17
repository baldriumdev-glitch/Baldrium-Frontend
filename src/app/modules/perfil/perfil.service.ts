import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
 
export interface PerfilData {
  cedula:           string;
  codigoTrabajador: string;
  nombre:           string;
  celular:          string;
  telefono:         string | null;
  correo:           string;
  direccion:        string;
  roles:            string[];
}
 
export interface ActualizarPerfilDto {
  Nombre:            string;
  Celular:           string;
  Telefono:          string | null;
  CorreoElectronico: string;
  Direccion:         string;
}
 
export interface CambiarContrasenaDto {
  contrasenaActual: string;
  nuevaContrasena:  string;
}
 
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private base = `${environment.apiUrl}/perfil`;
 
  constructor(private http: HttpClient) {}
 
  obtener(): Observable<PerfilData> {
    return this.http.get<PerfilData>(this.base);
  }
 
  actualizar(dto: ActualizarPerfilDto): Observable<{ mensaje: string }> {
    return this.http.put<{ mensaje: string }>(this.base, dto);
  }
 
  cambiarContrasena(dto: CambiarContrasenaDto): Observable<{ mensaje: string; token?: string }> {
    return this.http.patch<{ mensaje: string; token?: string }>(`${this.base}/contrasena`, dto);
  }
}