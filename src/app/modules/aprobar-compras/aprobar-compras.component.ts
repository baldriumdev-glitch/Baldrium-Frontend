import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AprobarComprasService } from './aprobar-compras.service';

@Component({
  selector:    'app-aprobar-compras',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './aprobar-compras.component.html',
  styleUrls:   ['./aprobar-compras.component.scss']
})
export class AprobarComprasComponent implements OnInit {

  cargando = true;
  error    = '';
  mensaje  = '';

  constructor(private svc: AprobarComprasService) {}

  ngOnInit(): void {
    this.svc.obtener().subscribe({
      next: res => {
        this.mensaje  = res.mensaje;
        this.cargando = false;
      },
      error: (err: any) => {
        this.cargando = false;
        this.error    = err?.error?.error || 'Error al cargar la sección de aprobar compras.';
      }
    });
  }
}
