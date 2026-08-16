import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  AprobarComprasService, CompraResolucion, DecisionCompra
} from './aprobar-compras.service';

type TabActivo = 'pendientes' | 'aprobadas' | 'rechazadas';

@Component({
  selector:    'app-aprobar-compras',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './aprobar-compras.component.html',
  styleUrls:   ['./aprobar-compras.component.scss']
})
export class AprobarComprasComponent implements OnInit, OnDestroy {

  // ── Tab ────────────────────────────────────────────────────────────
  tabActivo: TabActivo = 'pendientes';

  // ── Ventana de días (compartida) ────────────────────────────────────
  filtroDias = 30;

  itemsPorPagina = 8;

  // ── Pendientes ────────────────────────────────────────────────────
  pendientes:        CompraResolucion[] = [];
  cargandoPendientes = true;
  errorPendientes    = '';
  busquedaPendientes = '';
  resultadosBusquedaPendientes: CompraResolucion[] | null = null;
  buscandoPendientes = false;
  paginaPendientes   = 1;

  // ── Aprobadas ─────────────────────────────────────────────────────
  aprobadas:        CompraResolucion[] = [];
  cargandoAprobadas = true;
  errorAprobadas    = '';
  busquedaAprobadas = '';
  resultadosBusquedaAprobadas: CompraResolucion[] | null = null;
  buscandoAprobadas = false;
  paginaAprobadas   = 1;

  // ── Rechazadas ────────────────────────────────────────────────────
  rechazadas:        CompraResolucion[] = [];
  cargandoRechazadas = true;
  errorRechazadas    = '';
  busquedaRechazadas = '';
  resultadosBusquedaRechazadas: CompraResolucion[] | null = null;
  buscandoRechazadas = false;
  paginaRechazadas   = 1;

  private busquedaPendientes$ = new Subject<string>();
  private busquedaAprobadas$  = new Subject<string>();
  private busquedaRechazadas$ = new Subject<string>();
  private destroy$            = new Subject<void>();

  // ── Modal resolver (aprobar / rechazar, ambos piden motivo) ──────────
  mostrarModalResolucion = false;
  decisionActual: DecisionCompra = 'Confirmado';
  compraParaResolver: CompraResolucion | null = null;
  motivoResolucion    = '';

  guardandoResolucion = false;
  errorModal          = '';
  intentoGuardar       = false;

  constructor(private svc: AprobarComprasService) {}

  ngOnInit(): void {
    this.cargarPendientes();
    this.cargarAprobadas();
    this.cargarRechazadas();

    this.busquedaPendientes$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.ejecutarBusquedaPendientes(q));

    this.busquedaAprobadas$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.ejecutarBusquedaAprobadas(q));

    this.busquedaRechazadas$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.ejecutarBusquedaRechazadas(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ════════════════════════════════════════════════════════════════════
  //  CARGA
  // ════════════════════════════════════════════════════════════════════

  cargarPendientes(): void {
    this.cargandoPendientes = true;
    this.errorPendientes    = '';
    this.svc.pendientes(this.filtroDias).subscribe({
      next: data => {
        this.pendientes         = data;
        this.cargandoPendientes = false;
        this.paginaPendientes   = 1;
      },
      error: (err: any) => {
        this.cargandoPendientes = false;
        this.errorPendientes    = err?.error?.error || 'Error al cargar las compras pendientes.';
      }
    });
  }

  cargarAprobadas(): void {
    this.cargandoAprobadas = true;
    this.errorAprobadas    = '';
    this.svc.aprobadas(this.filtroDias).subscribe({
      next: data => {
        this.aprobadas         = data;
        this.cargandoAprobadas = false;
        this.paginaAprobadas   = 1;
      },
      error: (err: any) => {
        this.cargandoAprobadas = false;
        this.errorAprobadas    = err?.error?.error || 'Error al cargar las compras aprobadas.';
      }
    });
  }

  cargarRechazadas(): void {
    this.cargandoRechazadas = true;
    this.errorRechazadas    = '';
    this.svc.rechazadas(this.filtroDias).subscribe({
      next: data => {
        this.rechazadas         = data;
        this.cargandoRechazadas = false;
        this.paginaRechazadas   = 1;
      },
      error: (err: any) => {
        this.cargandoRechazadas = false;
        this.errorRechazadas    = err?.error?.error || 'Error al cargar las compras rechazadas.';
      }
    });
  }

  aplicarFiltroDias(): void {
    this.cargarPendientes();
    this.cargarAprobadas();
    this.cargarRechazadas();
  }

  // ════════════════════════════════════════════════════════════════════
  //  TAB
  // ════════════════════════════════════════════════════════════════════

  cambiarTab(tab: TabActivo): void {
    this.tabActivo = tab;
  }

  // ════════════════════════════════════════════════════════════════════
  //  BÚSQUEDA (backend, sin límite de días) Y PAGINACIÓN
  // ════════════════════════════════════════════════════════════════════

  onBuscarPendientesInput(): void {
    this.paginaPendientes = 1;
    this.busquedaPendientes$.next(this.busquedaPendientes);
  }

  onBuscarAprobadasInput(): void {
    this.paginaAprobadas = 1;
    this.busquedaAprobadas$.next(this.busquedaAprobadas);
  }

  onBuscarRechazadasInput(): void {
    this.paginaRechazadas = 1;
    this.busquedaRechazadas$.next(this.busquedaRechazadas);
  }

  private ejecutarBusquedaPendientes(q: string): void {
    const query = q.trim();
    if (!query) {
      this.resultadosBusquedaPendientes = null;
      this.buscandoPendientes           = false;
      return;
    }
    this.buscandoPendientes = true;
    this.svc.buscarPendientes(query).subscribe({
      next: data => {
        this.resultadosBusquedaPendientes = data;
        this.buscandoPendientes           = false;
      },
      error: (err: any) => {
        this.buscandoPendientes = false;
        this.errorPendientes    = err?.error?.error || 'Error al buscar compras.';
      }
    });
  }

  private ejecutarBusquedaAprobadas(q: string): void {
    const query = q.trim();
    if (!query) {
      this.resultadosBusquedaAprobadas = null;
      this.buscandoAprobadas           = false;
      return;
    }
    this.buscandoAprobadas = true;
    this.svc.buscarAprobadas(query).subscribe({
      next: data => {
        this.resultadosBusquedaAprobadas = data;
        this.buscandoAprobadas           = false;
      },
      error: (err: any) => {
        this.buscandoAprobadas = false;
        this.errorAprobadas    = err?.error?.error || 'Error al buscar compras.';
      }
    });
  }

  private ejecutarBusquedaRechazadas(q: string): void {
    const query = q.trim();
    if (!query) {
      this.resultadosBusquedaRechazadas = null;
      this.buscandoRechazadas           = false;
      return;
    }
    this.buscandoRechazadas = true;
    this.svc.buscarRechazadas(query).subscribe({
      next: data => {
        this.resultadosBusquedaRechazadas = data;
        this.buscandoRechazadas           = false;
      },
      error: (err: any) => {
        this.buscandoRechazadas = false;
        this.errorRechazadas    = err?.error?.error || 'Error al buscar compras.';
      }
    });
  }

  private refrescarPendientes(): void {
    this.cargarPendientes();
    if (this.busquedaPendientes.trim()) this.ejecutarBusquedaPendientes(this.busquedaPendientes);
  }

  private refrescarAprobadas(): void {
    this.cargarAprobadas();
    if (this.busquedaAprobadas.trim()) this.ejecutarBusquedaAprobadas(this.busquedaAprobadas);
  }

  private refrescarRechazadas(): void {
    this.cargarRechazadas();
    if (this.busquedaRechazadas.trim()) this.ejecutarBusquedaRechazadas(this.busquedaRechazadas);
  }

  get pendientesFiltradas(): CompraResolucion[] { return this.resultadosBusquedaPendientes ?? this.pendientes; }
  get aprobadasFiltradas(): CompraResolucion[]  { return this.resultadosBusquedaAprobadas  ?? this.aprobadas; }
  get rechazadasFiltradas(): CompraResolucion[] { return this.resultadosBusquedaRechazadas ?? this.rechazadas; }

  get pendientesPaginadas(): CompraResolucion[] {
    const inicio = (this.paginaPendientes - 1) * this.itemsPorPagina;
    return this.pendientesFiltradas.slice(inicio, inicio + this.itemsPorPagina);
  }
  get totalPaginasPendientes(): number {
    return Math.ceil(this.pendientesFiltradas.length / this.itemsPorPagina);
  }

  get aprobadasPaginadas(): CompraResolucion[] {
    const inicio = (this.paginaAprobadas - 1) * this.itemsPorPagina;
    return this.aprobadasFiltradas.slice(inicio, inicio + this.itemsPorPagina);
  }
  get totalPaginasAprobadas(): number {
    return Math.ceil(this.aprobadasFiltradas.length / this.itemsPorPagina);
  }

  get rechazadasPaginadas(): CompraResolucion[] {
    const inicio = (this.paginaRechazadas - 1) * this.itemsPorPagina;
    return this.rechazadasFiltradas.slice(inicio, inicio + this.itemsPorPagina);
  }
  get totalPaginasRechazadas(): number {
    return Math.ceil(this.rechazadasFiltradas.length / this.itemsPorPagina);
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL RESOLVER (aprobar / rechazar — ambos piden motivo)
  // ════════════════════════════════════════════════════════════════════

  abrirResolucion(c: CompraResolucion, decision: DecisionCompra): void {
    this.compraParaResolver     = c;
    this.decisionActual         = decision;
    this.motivoResolucion       = '';
    this.errorModal             = '';
    this.intentoGuardar         = false;
    this.mostrarModalResolucion = true;
  }

  cerrarResolucion(): void {
    this.mostrarModalResolucion = false;
    this.compraParaResolver     = null;
  }

  confirmarResolucion(): void {
    this.intentoGuardar = true;
    if (!this.motivoResolucion.trim() || !this.compraParaResolver || this.guardandoResolucion) return;

    this.guardandoResolucion = true;
    this.errorModal          = '';

    this.svc.cambiarEstado(this.compraParaResolver.ID, {
      estado: this.decisionActual,
      motivo: this.motivoResolucion.trim()
    }).subscribe({
      next: () => {
        this.guardandoResolucion = false;
        this.cerrarResolucion();
        this.refrescarPendientes();
        this.refrescarAprobadas();
        this.refrescarRechazadas();
      },
      error: (err: any) => {
        this.guardandoResolucion = false;
        const accion = this.decisionActual === 'Confirmado' ? 'aprobar' : 'rechazar';
        this.errorModal = err?.error?.error || `Error al ${accion} la compra.`;
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════════════

  getEstadoCompraClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente':  'estado-pendiente',
      'Confirmado': 'estado-aceptado',
      'Rechazado':  'estado-rechazado'
    };
    return map[estado] ?? 'estado-default';
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
