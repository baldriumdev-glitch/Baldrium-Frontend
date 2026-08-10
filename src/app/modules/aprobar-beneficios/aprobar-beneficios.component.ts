import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AprobarBeneficiosService, BeneficioRevision, ProductoBeneficio
} from './aprobar-beneficios.service';

@Component({
  selector:    'app-aprobar-beneficios',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './aprobar-beneficios.component.html',
  styleUrls:   ['./aprobar-beneficios.component.scss']
})
export class AprobarBeneficiosComponent implements OnInit {

  // ── Datos ──────────────────────────────────────────────────────────
  beneficios: BeneficioRevision[] = [];

  cargando = true;
  error    = '';

  busqueda       = '';
  paginaActual   = 1;
  itemsPorPagina = 8;

  // ── Rechazar (acción directa) ────────────────────────────────────────
  procesandoId = null as number | null;
  errorAccion  = '';

  // ── Modal aprobar (requiere elegir producto) ─────────────────────────
  mostrarModalAprobar = false;
  beneficioParaAprobar: BeneficioRevision | null = null;

  productos:         ProductoBeneficio[] = [];
  cargandoProductos  = false;
  inventarioIdSeleccionado: number | null = null;

  guardandoAprobar = false;
  errorModal       = '';
  intentoGuardar   = false;

  constructor(private svc: AprobarBeneficiosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error    = '';
    this.svc.listar().subscribe({
      next: data => {
        this.beneficios    = data;
        this.cargando      = false;
        this.paginaActual  = 1;
      },
      error: (err: any) => {
        this.cargando = false;
        this.error    = err?.error?.error || 'Error al cargar los beneficios por aprobar.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  BÚSQUEDA Y PAGINACIÓN
  // ════════════════════════════════════════════════════════════════════

  get beneficiosFiltrados(): BeneficioRevision[] {
    const q = this.busqueda.toLowerCase().trim();
    if (!q) return this.beneficios;
    return this.beneficios.filter(b =>
      b.NombreCliente?.toLowerCase().includes(q) ||
      b.CedulaCliente?.toLowerCase().includes(q)
    );
  }

  get beneficiosPaginados(): BeneficioRevision[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.beneficiosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.beneficiosFiltrados.length / this.itemsPorPagina);
  }

  // ════════════════════════════════════════════════════════════════════
  //  RECHAZAR (acción directa, no requiere producto)
  // ════════════════════════════════════════════════════════════════════

  rechazar(b: BeneficioRevision): void {
    if (this.procesandoId === b.ID) return;
    this.procesandoId = b.ID;
    this.errorAccion  = '';

    this.svc.cambiarEstado(b.ID, { estado: 'Rechazado' }).subscribe({
      next: () => {
        this.procesandoId = null;
        this.cargar();
      },
      error: (err: any) => {
        this.procesandoId = null;
        this.errorAccion  = err?.error?.error || 'Error al rechazar el beneficio.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL APROBAR (requiere seleccionar el producto a entregar)
  // ════════════════════════════════════════════════════════════════════

  abrirAprobar(b: BeneficioRevision): void {
    this.beneficioParaAprobar     = b;
    this.inventarioIdSeleccionado = null;
    this.errorModal               = '';
    this.intentoGuardar           = false;
    this.mostrarModalAprobar      = true;

    if (this.productos.length === 0) {
      this.cargandoProductos = true;
      this.svc.productos().subscribe({
        next:  data => { this.productos = data; this.cargandoProductos = false; },
        error: () => { this.cargandoProductos = false; }
      });
    }
  }

  cerrarAprobar(): void {
    this.mostrarModalAprobar  = false;
    this.beneficioParaAprobar = null;
  }

  confirmarAprobar(): void {
    this.intentoGuardar = true;
    if (!this.inventarioIdSeleccionado || !this.beneficioParaAprobar || this.guardandoAprobar) return;

    this.guardandoAprobar = true;
    this.errorModal       = '';

    this.svc.cambiarEstado(this.beneficioParaAprobar.ID, {
      estado:       'Aceptado',
      inventarioId: this.inventarioIdSeleccionado
    }).subscribe({
      next: () => {
        this.guardandoAprobar = false;
        this.cerrarAprobar();
        this.cargar();
      },
      error: (err: any) => {
        this.guardandoAprobar = false;
        this.errorModal       = err?.error?.error || 'Error al aprobar el beneficio.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════════════

  formatearPesos(valor: string | number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(Number(valor));
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
  }

  getPrimeraLetra(nombre: string): string {
    return nombre?.[0]?.toUpperCase() ?? 'A';
  }
}
