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
  inventarioId?: number;
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
}
