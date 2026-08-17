import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Producto {
  ID:                number;
  Nombre:            string;
  Descripcion:       string | null;
  Tipo:              string;
  Valor:             number;
  Cantidad:          number;
  FechaVencimiento:  string | null;
  UpdatedAt?:        string;
}

export interface CrearProductoDto {
  Nombre:            string;
  Descripcion:       string | null;
  Tipo:              string;
  Valor:             number;
  Cantidad:          number;
  FechaVencimiento:  string | null;
}

export interface AuditoriaInventarioItem {
  ID:                  number;
  InventarioID:        number;
  NombreProducto:      string;
  CedulaResponsable:   string;
  NombreResponsable:   string;
  TipoMovimiento:      string;
  CantidadAnterior:    number;
  CantidadMovimiento:  number;
  CantidadPosterior:   number;
  ValorUnitario:       number;
  Motivo:              string;
  Observaciones:       string;
  FechaHora:           string;
}

// Historial general (crear/editar/eliminar producto) — distinto de los
// movimientos de stock: existe aunque la edición no haya cambiado la cantidad.
export interface AuditoriaInfoItem {
  ID:                 number;
  RegistroAfectadoID: number;
  CedulaResponsable:  string;
  NombreResponsable:  string;
  TipoAccion:         string;
  Descripcion:        string;
  ValorAnterior:      any;
  ValorNuevo:         any;
  DireccionIP:        string;
  Dispositivo:        string;
  Resultado:          string;
  FechaHora:          string;
}

export const TIPOS_INVENTARIO = [
  'Beneficio',
  'Inventario de cocina',
  'Alimentacion'
];

@Injectable({ providedIn: 'root' })
export class InventarioService {

  private base = `${environment.apiUrl}/Inventario`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.base);
  }

  listarAuditoria(): Observable<AuditoriaInventarioItem[]> {
    return this.http.get<AuditoriaInventarioItem[]>(`${this.base}/auditoria`);
  }

  listarAuditoriaInfo(): Observable<AuditoriaInfoItem[]> {
    return this.http.get<AuditoriaInfoItem[]>(`${this.base}/auditoria/info`);
  }

  crear(datos: CrearProductoDto): Observable<any> {
    return this.http.post(this.base, datos);
  }

  actualizar(id: number, datos: CrearProductoDto): Observable<any> {
    return this.http.put(`${this.base}/${id}`, datos);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
