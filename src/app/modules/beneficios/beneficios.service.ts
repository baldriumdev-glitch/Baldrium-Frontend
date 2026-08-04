import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PlaceholderResponse {
  ok:      boolean;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class BeneficiosService {

  private base = `${environment.apiUrl}/telemercadeo`;

  constructor(private http: HttpClient) {}

  obtener(): Observable<PlaceholderResponse> {
    return this.http.get<PlaceholderResponse>(`${this.base}/beneficios`);
  }
}
