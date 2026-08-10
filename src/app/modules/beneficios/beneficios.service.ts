import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoBeneficio = 'Revision' | 'Aceptado' | 'Rechazado';

export interface CompraElegible {
  ID:                 number;
  CedulaCliente:      string;
  NombreCliente:      string;
  TotalCompra:        string;
  FechaCompra:        string;
  EstadoCompra:       string;
  ReferidosVisitados: number;
  TotalReferidos:     number;
  BeneficioActual:    EstadoBeneficio | null;
}

export interface CrearBeneficioDto {
  compraId: number;
}

export interface CrearBeneficioResponse {
  beneficioId: number;
  compraId:    number;
  estado:      string;
}

@Injectable({ providedIn: 'root' })
export class BeneficiosService {

  private base = `${environment.apiUrl}/telemercadeo/beneficios`;

  constructor(private http: HttpClient) {}

  comprasElegibles(): Observable<CompraElegible[]> {
    return this.http.get<CompraElegible[]>(`${this.base}/compras-elegibles`);
  }

  crear(dto: CrearBeneficioDto): Observable<CrearBeneficioResponse> {
    return this.http.post<CrearBeneficioResponse>(this.base, dto);
  }
}
