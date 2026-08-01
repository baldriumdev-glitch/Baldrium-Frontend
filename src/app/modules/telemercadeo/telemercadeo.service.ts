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

export type EstadoVisitaAgendada = 'Pendiente' | 'Visitado' | 'Rechaza' | 'No contesta' | 'Re agendada';

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

  visitasSemanaVisitadas(): Observable<VisitaAgendada[]> {
    return this.http.get<VisitaAgendada[]>(`${this.base}/visitas/semana/visitadas`);
  }

  visitasSemanaPorGestionar(): Observable<VisitaAgendada[]> {
    return this.http.get<VisitaAgendada[]>(`${this.base}/visitas/semana/por-gestionar`);
  }
}
