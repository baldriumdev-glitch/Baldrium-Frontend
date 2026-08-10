import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Rol {
  id:     number;
  nombre: string;
}

export interface Trabajador {
  cedula:           string;
  nombre:           string;
  celular:          string;
  telefono:         string;
  correo:           string;
  direccion:        string;
  codigoTrabajador: string;
  activo:           boolean;
  roles:            Rol[];
  ultimaActividad?: string;
}

export interface CrearTrabajadorDto {
  cedula:            string;
  nombre:            string;
  celular:           string;
  telefono:          string;
  correoElectronico: string;
  direccion:         string;
  codigoTrabajador:  string;
  contrasena:        string;
  roles:             number[];
}

export interface ActualizarTrabajadorDto {
  nombre:            string;
  celular:           string;
  telefono:          string;
  correoElectronico: string;
  direccion:         string;
  codigoTrabajador:  string;
  roles:             number[];
}

export interface ParametrosBeneficio {
  ValorMinimoCompra:        number;
  MinimoReferidosVisitados: number;
  FechaActualizacion:       string;
}

export interface ActualizarParametrosBeneficioDto {
  valorMinimoCompra:        number;
  minimoReferidosVisitados: number;
}

export interface AuditoriaItem {
  ID:               number;
  CedulaTrabajador: string;
  NombreTrabajador: string;
  TipoAccion:       string;
  TablaAfectada:    string;
  DireccionIP:      string;
  Dispositivo:      string;
  Resultado:        string;
  Descripcion:      string;
  FechaHora:        string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {

  private base = `${environment.apiUrl}/Usuario`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Trabajador[]> {
    return this.http.get<Trabajador[]>(this.base);
  }

  listarRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.base}/roles`);
  }

  crear(datos: CrearTrabajadorDto): Observable<any> {
    const { roles, ...rest } = datos;
    // El backend espera PascalCase
    const payload = {
      Cedula:            rest.cedula,
      Nombre:            rest.nombre,
      Celular:           rest.celular,
      Telefono:          rest.telefono          || null,
      CorreoElectronico: rest.correoElectronico,
      Direccion:         rest.direccion         || null,
      CodigoTrabajador:  rest.codigoTrabajador  || null,
      Contrasena:        rest.contrasena,
      roles,
    };
    return this.http.post(this.base, payload);
  }

  actualizar(cedula: string, datos: ActualizarTrabajadorDto): Observable<any> {
    const { roles, ...rest } = datos;
    // El backend (usuarioServicio.js) espera PascalCase
    const payload = {
      Nombre:            rest.nombre,
      Celular:           rest.celular,
      Telefono:          rest.telefono          || null,
      CorreoElectronico: rest.correoElectronico,
      Direccion:         rest.direccion         || null,
      CodigoTrabajador:  rest.codigoTrabajador  || null,
      roles,
    };
    console.log('[UsuariosService] PUT', cedula, payload);
    return this.http.put(`${this.base}/${cedula}`, payload);
  }

  cambiarEstado(cedula: string, activo: boolean): Observable<any> {
    return this.http.patch(`${this.base}/${cedula}/estado`, { activo });
  }

  listarAuditoria(): Observable<AuditoriaItem[]> {
    return this.http.get<AuditoriaItem[]>(`${this.base}/auditoria`);
  }

  eliminar(cedula: string): Observable<any> {
    return this.http.delete(`${this.base}/${cedula}`);
  }

  obtenerParametrosBeneficio(): Observable<ParametrosBeneficio> {
    return this.http.get<ParametrosBeneficio>(`${this.base}/parametros-beneficio`);
  }

  actualizarParametrosBeneficio(dto: ActualizarParametrosBeneficioDto): Observable<any> {
    return this.http.put(`${this.base}/parametros-beneficio`, dto);
  }
}