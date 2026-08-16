import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoCompra = 'Pendiente' | 'Confirmado' | 'Rechazado';

export interface CompraResolucion {
  ID:                number;
  FechaCompra:       string;
  TotalCompra:       string;
  EstadoCompra:       EstadoCompra;
  FormaPago:          string;
  Notas:              string | null;
  MotivoResolucion:   string | null;
  CedulaCliente:      string;
  NombreCliente:      string;
  CedulaTrabajador:   string;
  NombreTrabajador:   string;
  Productos:          string | null;
}

export type DecisionCompra = 'Confirmado' | 'Rechazado';

export interface CambiarEstadoCompraDto {
  estado: DecisionCompra;
  motivo: string;
}

@Injectable({ providedIn: 'root' })
export class AprobarComprasService {

  private base = `${environment.apiUrl}/auxiliar-administrativo/aprobar-compras`;

  constructor(private http: HttpClient) {}

  private paramsDias(dias?: number): { [k: string]: string } {
    const params: { [k: string]: string } = {};
    if (dias) params['dias'] = String(dias);
    return params;
  }

  pendientes(dias?: number): Observable<CompraResolucion[]> {
    return this.http.get<CompraResolucion[]>(`${this.base}/pendientes`, { params: this.paramsDias(dias) });
  }

  aprobadas(dias?: number): Observable<CompraResolucion[]> {
    return this.http.get<CompraResolucion[]>(`${this.base}/aprobadas`, { params: this.paramsDias(dias) });
  }

  rechazadas(dias?: number): Observable<CompraResolucion[]> {
    return this.http.get<CompraResolucion[]>(`${this.base}/rechazadas`, { params: this.paramsDias(dias) });
  }

  buscarPendientes(q: string): Observable<CompraResolucion[]> {
    return this.http.get<CompraResolucion[]>(`${this.base}/pendientes/buscar`, { params: { q } });
  }

  buscarAprobadas(q: string): Observable<CompraResolucion[]> {
    return this.http.get<CompraResolucion[]>(`${this.base}/aprobadas/buscar`, { params: { q } });
  }

  buscarRechazadas(q: string): Observable<CompraResolucion[]> {
    return this.http.get<CompraResolucion[]>(`${this.base}/rechazadas/buscar`, { params: { q } });
  }

  cambiarEstado(id: number, dto: CambiarEstadoCompraDto): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/${id}/estado`, dto);
  }
}
