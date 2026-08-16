import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BeneficiosService, CompraElegible, ReferidoCompra } from './beneficios.service';

@Component({
  selector:    'app-beneficios',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './beneficios.component.html',
  styleUrls:   ['./beneficios.component.scss']
})
export class BeneficiosComponent implements OnInit {

  // ── Datos ──────────────────────────────────────────────────────────
  compras: CompraElegible[] = [];

  cargando = true;
  error    = '';

  busqueda = '';
  paginaActual   = 1;
  itemsPorPagina = 8;

  // ── Crear beneficio (acción directa, sin selección de producto) ─────
  procesandoId = null as number | null;
  errorAccion  = '';

  // ── Modal referidos de una compra ───────────────────────────────────
  mostrarModalReferidos = false;
  compraParaReferidos: CompraElegible | null = null;
  referidos:           ReferidoCompra[] = [];
  cargandoReferidos    = false;
  errorReferidos       = '';

  constructor(private svc: BeneficiosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error    = '';
    this.svc.comprasElegibles().subscribe({
      next: data => {
        this.compras       = data;
        this.cargando      = false;
        this.paginaActual  = 1;
      },
      error: (err: any) => {
        this.cargando = false;
        this.error    = err?.error?.error || 'Error al cargar las compras elegibles.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  BÚSQUEDA Y PAGINACIÓN
  // ════════════════════════════════════════════════════════════════════

  get comprasFiltradas(): CompraElegible[] {
    const q = this.busqueda.toLowerCase().trim();
    if (!q) return this.compras;
    return this.compras.filter(c =>
      c.NombreCliente?.toLowerCase().includes(q) ||
      c.CedulaCliente?.toLowerCase().includes(q)
    );
  }

  get comprasPaginadas(): CompraElegible[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.comprasFiltradas.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.comprasFiltradas.length / this.itemsPorPagina);
  }

  // ════════════════════════════════════════════════════════════════════
  //  CREAR BENEFICIO
  // ════════════════════════════════════════════════════════════════════

  puedeCrearBeneficio(c: CompraElegible): boolean {
    return c.BeneficioActual !== 'Revision' && c.BeneficioActual !== 'Aceptado';
  }

  crearBeneficio(c: CompraElegible): void {
    if (this.procesandoId === c.ID) return;
    this.procesandoId = c.ID;
    this.errorAccion  = '';

    this.svc.crear({ compraId: c.ID }).subscribe({
      next: () => {
        this.procesandoId = null;
        this.cargar();
      },
      error: (err: any) => {
        this.procesandoId = null;
        this.errorAccion  = err?.error?.error || 'Error al crear el beneficio.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL REFERIDOS
  // ════════════════════════════════════════════════════════════════════

  abrirReferidos(c: CompraElegible): void {
    this.compraParaReferidos    = c;
    this.mostrarModalReferidos  = true;
    this.referidos              = [];
    this.cargandoReferidos      = true;
    this.errorReferidos         = '';

    this.svc.referidosDeCompra(c.ID).subscribe({
      next: data => {
        this.referidos         = data;
        this.cargandoReferidos = false;
      },
      error: (err: any) => {
        this.cargandoReferidos = false;
        this.errorReferidos    = err?.error?.error || 'Error al cargar los referidos de la compra.';
      }
    });
  }

  cerrarReferidos(): void {
    this.mostrarModalReferidos = false;
    this.compraParaReferidos   = null;
  }

  getEstadoReferidoClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente':   'estado-pendiente',
      'No responde': 'estado-no-responde',
      'Contactado':  'estado-contactado',
      'Agendado':    'estado-agendado',
      'Visitado':    'estado-visitado'
    };
    return map[estado] ?? 'estado-default';
  }

  // ════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════════════

  getEstadoBeneficioClass(estado: string | null): string {
    const map: Record<string, string> = {
      'Revision':  'estado-revision',
      'Aceptado':  'estado-aceptado',
      'Rechazado': 'estado-rechazado'
    };
    return estado ? (map[estado] ?? 'estado-default') : 'estado-sin-beneficio';
  }

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
