import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AprobarBeneficiosService } from './aprobar-beneficios.service';

@Component({
  selector:    'app-aprobar-beneficios',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './aprobar-beneficios.component.html',
  styleUrls:   ['./aprobar-beneficios.component.scss']
})
export class AprobarBeneficiosComponent implements OnInit {

  cargando = true;
  error    = '';
  mensaje  = '';

  constructor(private svc: AprobarBeneficiosService) {}

  ngOnInit(): void {
    this.svc.obtener().subscribe({
      next: res => {
        this.mensaje  = res.mensaje;
        this.cargando = false;
      },
      error: (err: any) => {
        this.cargando = false;
        this.error    = err?.error?.error || 'Error al cargar la sección de aprobar beneficios.';
      }
    });
  }
}
