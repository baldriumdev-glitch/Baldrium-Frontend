import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoBeneficio = 'Revision' | 'Aceptado' | 'Rechazado';

export interface BeneficioRevision {
  ID:              number;
  CompraID:        number;
  InventarioID:    number | null;
  EstadoBeneficio: EstadoBeneficio;
  CedulaCliente:   string;
  NombreCliente:   string;
  TotalCompra:     string;
  FechaCompra:     string;
  EstadoCompra:    string;
  NombreProducto:  string | null;
}

export interface ProductoBeneficio {
  ID:       number;
  Nombre:   string;
  Valor:    string;
  Cantidad: number;
}

export type DecisionBeneficio = 'Aceptado' | 'Rechazado';

export interface CambiarEstadoBeneficioDto {
  estado:        DecisionBeneficio;
  motivo:        string;
  inventarioId?: number;
}

export interface BeneficioResuelto {
  ID:               number;
  CompraID:         number;
  InventarioID:     number | null;
  EstadoBeneficio:  DecisionBeneficio;
  MotivoResolucion: string;
  FechaResolucion:  string;
  CedulaCliente:    string;
  NombreCliente:    string;
  TotalCompra:      string;
  FechaCompra:      string;
  EstadoCompra:     string;
  NombreProducto:   string | null;
}

export interface KpiBeneficiosRecientes {
  TotalAprobados:  string | number;
  TotalRechazados: string | number;
}

export type EstadoReferido = 'Visitado' | 'Pendiente' | 'Contactado' | 'No responde' | 'Agendado';

export interface ReferidoCompraAuxiliar {
  ID:                 number;
  Nombre:             string;
  Celular:            number | string;
  Direccion:          string | null;
  Estado:             EstadoReferido;
  CompraPropiaID:     number | null;
  CompraPropiaTotal:  string | null;
  CompraPropiaEstado: string | null;
  CompraPropiaFecha:  string | null;
}

@Injectable({ providedIn: 'root' })
export class AprobarBeneficiosService {

  private base = `${environment.apiUrl}/auxiliar-administrativo/aprobar-beneficios`;

  constructor(private http: HttpClient) {}

  listar(): Observable<BeneficioRevision[]> {
    return this.http.get<BeneficioRevision[]>(this.base);
  }

  productos(): Observable<ProductoBeneficio[]> {
    return this.http.get<ProductoBeneficio[]>(`${this.base}/productos`);
  }

  cambiarEstado(id: number, dto: CambiarEstadoBeneficioDto): Observable<any> {
    return this.http.post(`${this.base}/${id}/estado`, dto);
  }

  referidosDeCompra(compraId: number): Observable<ReferidoCompraAuxiliar[]> {
    return this.http.get<ReferidoCompraAuxiliar[]>(`${this.base}/compras/${compraId}/referidos`);
  }

  private paramsDias(dias?: number): { [k: string]: string } {
    const params: { [k: string]: string } = {};
    if (dias) params['dias'] = String(dias);
    return params;
  }

  aprobadosRecientes(dias?: number): Observable<BeneficioResuelto[]> {
    return this.http.get<BeneficioResuelto[]>(`${this.base}/aprobados-recientes`, { params: this.paramsDias(dias) });
  }

  rechazadosRecientes(dias?: number): Observable<BeneficioResuelto[]> {
    return this.http.get<BeneficioResuelto[]>(`${this.base}/rechazados-recientes`, { params: this.paramsDias(dias) });
  }

  kpiRecientes(dias?: number): Observable<KpiBeneficiosRecientes> {
    return this.http.get<KpiBeneficiosRecientes>(`${this.base}/kpi-recientes`, { params: this.paramsDias(dias) });
  }

  buscarRevision(q: string): Observable<BeneficioRevision[]> {
    return this.http.get<BeneficioRevision[]>(`${this.base}/buscar`, { params: { q } });
  }

  buscarAprobados(q: string): Observable<BeneficioResuelto[]> {
    return this.http.get<BeneficioResuelto[]>(`${this.base}/aprobados-recientes/buscar`, { params: { q } });
  }

  buscarRechazados(q: string): Observable<BeneficioResuelto[]> {
    return this.http.get<BeneficioResuelto[]>(`${this.base}/rechazados-recientes/buscar`, { params: { q } });
  }
}
