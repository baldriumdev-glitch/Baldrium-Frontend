import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BeneficiosService, CompraElegible } from './beneficios.service';

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
