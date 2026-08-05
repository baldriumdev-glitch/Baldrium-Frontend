import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoProspecto = 'Pendiente' | 'No responde' | 'Contactado' | 'Agendado';

export interface Prospecto {
  ID:                 number;
  PersonaID:          number;
  Nombre:             string;
  Celular:            string;
  Direccion:          string;
  Estado:             EstadoProspecto;
  FechaActualizacion: string;
}

export type EstadoVisitaAgendada = 'Pendiente' | 'Visitado' | 'Rechaza' | 'No contesta' | 'Re agendada' | 'Cancelada';

export interface VisitaAgendada {
  ID:                 number;
  PersonaID:          number;
  FechaVisita:        string;
  CantidadPersonas:   number;
  Notas:              string | null;
  CedulaTrabajador:   string;
  NombreTrabajador:   string;
  NombrePersona:      string;
  Celular:            string | number;
  Direccion:          string;
  Estado:             EstadoVisitaAgendada;
  UltimaInteraccion:  string;
}

export interface Asesor {
  cedula: string;
  nombre: string;
}

export interface AgendarVisitaDto {
  nombre?:           string;
  celular?:           string;
  direccion?:         string;
  cedulaTrabajador:   string;
  fechaVisita:        string;
  cantidadPersonas:   number;
  notas?:             string;
}

export interface AgendarVisitaResponse {
  visitaId:    number;
  prospectoId: number;
  nombre:      string;
  celular:     string;
  direccion:   string;
}

export type EstadoProspectoEditable = 'Pendiente' | 'Contactado' | 'No responde';

export interface EditarVisitaDto {
  cedulaTrabajador: string;
  fechaVisita:      string;
  cantidadPersonas: number;
  notas:            string;
}

export type EstadoVisitaEditable = 'Pendiente' | 'No contesta' | 'Re agendada';

export interface CambiarEstadoVisitaDto {
  estado: EstadoVisitaEditable;
  notas:  string;
}

export interface KpiFallidas {
  TotalFallidas: number;
}

export interface NuevaAgendaDto {
  nombre:           string;
  celular:           string;
  direccion:         string;
  cedulaTrabajador:  string;
  fechaVisita:       string;
  cantidadPersonas:  number;
  notas?:            string;
}

export interface NuevaAgendaResponse {
  prospectoId: number;
  personaId:   number;
  visitaId:    number;
  nombre:      string;
  celular:     string;
  direccion:   string;
}

@Injectable({ providedIn: 'root' })
export class TelemercadeoService {

  private base = `${environment.apiUrl}/telemercadeo`;

  constructor(private http: HttpClient) {}

  pendientes(): Observable<Prospecto[]> {
    return this.http.get<Prospecto[]>(`${this.base}/prospectos/pendientes`);
  }

  enGestion(): Observable<Prospecto[]> {
    return this.http.get<Prospecto[]>(`${this.base}/prospectos/en-gestion`);
  }

  buscarPendientes(q: string): Observable<Prospecto[]> {
    return this.http.get<Prospecto[]>(`${this.base}/prospectos/pendientes/buscar`, { params: { q } });
  }

  buscarEnGestion(q: string): Observable<Prospecto[]> {
    return this.http.get<Prospecto[]>(`${this.base}/prospectos/en-gestion/buscar`, { params: { q } });
  }

  visitasSemanaVisitadas(): Observable<VisitaAgendada[]> {
    return this.http.get<VisitaAgendada[]>(`${this.base}/visitas/semana/visitadas`);
  }

  visitasSemanaPorGestionar(): Observable<VisitaAgendada[]> {
    return this.http.get<VisitaAgendada[]>(`${this.base}/visitas/semana/por-gestionar`);
  }

  buscarVisitasSemanaVisitadas(q: string): Observable<VisitaAgendada[]> {
    return this.http.get<VisitaAgendada[]>(`${this.base}/visitas/semana/visitadas/buscar`, { params: { q } });
  }

  buscarVisitasSemanaPorGestionar(q: string): Observable<VisitaAgendada[]> {
    return this.http.get<VisitaAgendada[]>(`${this.base}/visitas/semana/por-gestionar/buscar`, { params: { q } });
  }

  visitasFallidas(): Observable<VisitaAgendada[]> {
    return this.http.get<VisitaAgendada[]>(`${this.base}/visitas/fallidas`);
  }

  buscarVisitasFallidas(q: string): Observable<VisitaAgendada[]> {
    return this.http.get<VisitaAgendada[]>(`${this.base}/visitas/fallidas/buscar`, { params: { q } });
  }

  kpiVisitasFallidas(): Observable<KpiFallidas> {
    return this.http.get<KpiFallidas>(`${this.base}/visitas/fallidas/kpi`);
  }

  asesores(): Observable<Asesor[]> {
    return this.http.get<Asesor[]>(`${this.base}/asesores`);
  }

  agendarVisita(prospectoId: number, dto: AgendarVisitaDto): Observable<AgendarVisitaResponse> {
    return this.http.post<AgendarVisitaResponse>(`${this.base}/prospectos/${prospectoId}/agendar-visita`, dto);
  }

  crearNuevaAgenda(dto: NuevaAgendaDto): Observable<NuevaAgendaResponse> {
    return this.http.post<NuevaAgendaResponse>(`${this.base}/prospectos/nueva-agenda`, dto);
  }

  cambiarEstadoProspecto(prospectoId: number, estado: EstadoProspectoEditable): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/prospectos/${prospectoId}/estado`, { estado });
  }

  detalleVisita(visitaId: number): Observable<VisitaAgendada> {
    return this.http.get<VisitaAgendada>(`${this.base}/visitas/${visitaId}`);
  }

  editarVisita(visitaId: number, dto: EditarVisitaDto): Observable<any> {
    return this.http.put(`${this.base}/visitas/${visitaId}`, dto);
  }

  cancelarVisita(visitaId: number, motivo: string): Observable<any> {
    return this.http.post(`${this.base}/visitas/${visitaId}/cancelar`, { motivo });
  }

  cambiarEstadoVisita(visitaId: number, dto: CambiarEstadoVisitaDto): Observable<any> {
    return this.http.post(`${this.base}/visitas/${visitaId}/estado`, dto);
  }
}
