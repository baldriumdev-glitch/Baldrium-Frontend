import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Visitas ───────────────────────────────────────────────────────
export interface Visita {
  ID:                number;
  FechaVisita:       string;
  Estado:            'Pendiente' | 'Visitado' | 'Rechaza' | 'No contesta';
  Notas:             string | null;
  PersonaID:         number;
  NombrePersona:     string;
  TipoPersona:       'Cliente' | 'Prospecto';
  Celular:           string;
  Direccion:         string;
  CantidadPersonas:  number;
  UltimaInteraccion: string | null;
}

export interface KpiSemana {
  TotalVisitas:       number;
  VisitasConfirmadas: number | string;
  VisitasNoEfectivas: number | string;
  PersonasTotales:    number | string;
}

export interface SemanaResponse {
  visitas: Visita[];
  kpi:     KpiSemana;
}

export interface DetallePersona {
  Cedula:            string | null;
  Nombre:            string;
  tipo:              string;
  Celular:           number | string;
  Telefono:          string | null;
  CorreoElectronico: string | null;
  Direccion:         string;
}

export interface HistorialCompra {
  ID:           number;
  FechaCompra:  string;
  Productos:    string;
  TotalCompra:  string;
  EstadoCompra: string;
}

export interface HistorialVisita {
  ID:               number;
  FechaVisita:      string;
  Estado:           string;
  Notas:            string | null;
  Asesor:           string | null;
  CantidadPersonas: number;
}

export interface ProductoAlimentacion {
  ID:       number;
  Nombre:   string;
  Valor:    number;
  Cantidad: number;
}


export interface ProductoCocina {
  ID:       number;
  Nombre:   string;
  Valor:    number;
  Cantidad: number;
}
 

export interface ClientePorPersona {
  cedula:  string | null;
  nombre:  string;
  correo:  string | null;
  celular: string;
  esNuevo: boolean;          // true = es prospecto sin cédula aún
}

export interface ItemCompra {
  inventarioId: number;
  cantidad:     number;
}
 

export interface Referido {
  nombre:    string;
  celular:   string;
  direccion: string;
}

export interface NuevaCompraDto {
  cedulaCliente: string;
  formaPago:     string;
  notas:         string | null;
  items:         ItemCompra[];
  referidos:     Referido[];
}

export interface CrearClienteDto {
  personaId:         number;
  cedula:            string;
  correoElectronico: string;   
  nombre:            string;   
  celular?:          string;
  telefono?:         string;
  direccion?:        string;   
}
 
 

export interface CambiarEstadoDto {
  visitaId:     number;
  estado:       string;
  suplementos?: { productoId: number; cantidad: number }[];
  notas?:       string | null;
}


export interface CompraResumen {
  ID:              number;
  NombreCliente:   string;
  CedulaCliente:   string;
  Productos:       string;
  FechaCompra:     string;
  TotalCompra:     string | number;
  EstadoCompra:    string;
  EstadoBeneficio: string | null;
  FormaPago:       string;
}
export interface KpiComprasMes {
  NumeroVentas:           number;
  ValorVentasConfirmadas: number | string;
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private base = environment.apiUrl + '/telemercadeo';

  constructor(private http: HttpClient) {}

  // ── Visitas ─────────────────────────────────────────────────────
  listarSemana(): Observable<SemanaResponse> {
    return this.http.get<SemanaResponse>(`${this.base}/visitas/semana`);
  }

  listarMes(): Observable<Visita[]> {
    return this.http.get<Visita[]>(`${this.base}/visitas/mes`);
  }

  buscar(q: string): Observable<Visita[]> {
    return this.http.get<Visita[]>(`${this.base}/visitas/buscar`, { params: { q } });
  }

  obtenerAlimentacion(): Observable<ProductoAlimentacion[]> {
    return this.http.get<ProductoAlimentacion[]>(`${this.base}/visitas/alimentacion`);
  }

  cambiarEstado(dto: CambiarEstadoDto): Observable<void> {
    return this.http.post<void>(`${this.base}/visitas/estado`, dto);
  }

  // ── Persona ─────────────────────────────────────────────────────
  detallePersona(personaId: number): Observable<DetallePersona> {
    return this.http.get<DetallePersona>(`${this.base}/persona/detalle`, { params: { personaId } });
  }

  historialCompras(personaId: number): Observable<HistorialCompra[]> {
    return this.http.get<HistorialCompra[]>(`${this.base}/persona/compras`, { params: { personaId } });
  }

  historialVisitas(personaId: number): Observable<HistorialVisita[]> {
    return this.http.get<HistorialVisita[]>(`${this.base}/persona/visitas`, { params: { personaId } });
  }

  // ── Compras ─────────────────────────────────────────────────────
  inventarioCocina(): Observable<ProductoCocina[]> {
    return this.http.get<ProductoCocina[]>(`${this.base}/compras/inventario-cocina`);
  }

  clientePorPersona(personaId: number): Observable<ClientePorPersona> {
    return this.http.get<ClientePorPersona>(`${this.base}/compras/cliente-por-persona`, { params: { personaId } });
  }

  crearClienteDesdeProspecto(dto: CrearClienteDto): Observable<any> {
    return this.http.post(`${this.base}/compras/crear-cliente`, dto);
  }

  crearCompra(dto: NuevaCompraDto): Observable<any> {
    return this.http.post(`${this.base}/compras/nueva`, dto);
  }








listarComprasSemana(): Observable<CompraResumen[]> {
  const url = `${this.base}/compras/mis-compras/semana`;
  console.log('[Service] listarComprasSemana URL:', url);
  return this.http.get<CompraResumen[]>(url);
}
 
listarComprasMes(): Observable<CompraResumen[]> {
  const url = `${this.base}/compras/mis-compras/mes`;
  console.log('[Service] listarComprasMes URL:', url);
  return this.http.get<CompraResumen[]>(url);
}
 
kpiComprasMes(): Observable<KpiComprasMes> {
  const url = `${this.base}/compras/mis-compras/kpi-mes`;  // ← era /compras/kpi-mes, faltaba mis-compras
  console.log('[Service] kpiComprasMes URL:', url);
  return this.http.get<KpiComprasMes>(url);
}
 
buscarCompras(q: string): Observable<CompraResumen[]> {
  const url = `${this.base}/compras/mis-compras/buscar`;
  console.log('[Service] buscarCompras URL:', url, '| q:', q);
  return this.http.get<CompraResumen[]>(url, { params: { q } });
}
 
registrarClienteLibre(datos: { cedula: string; nombre?: string | null; celular?: string | null; correo?: string | null; correoElectronico?: string; direccion?: string }): Observable<any> {
  return this.http.post(`${this.base}/compras/cliente-libre`, datos);
}
 
actualizarCliente(cedula: string, datos: {
  nombre?:            string | null;
  celular?:           string | null;
  correoElectronico?: string | null;
  direccion?:         string | null;
}): Observable<any> {
  return this.http.put(`${this.base}/compras/cliente/${encodeURIComponent(cedula)}`, datos);
}
 
 
}