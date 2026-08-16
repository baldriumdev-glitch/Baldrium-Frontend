import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  AprobarBeneficiosService, BeneficioRevision, ProductoBeneficio, ReferidoCompraAuxiliar,
  BeneficioResuelto, KpiBeneficiosRecientes, DecisionBeneficio
} from './aprobar-beneficios.service';

type TabActivo = 'revision' | 'aprobados' | 'rechazados';

@Component({
  selector:    'app-aprobar-beneficios',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './aprobar-beneficios.component.html',
  styleUrls:   ['./aprobar-beneficios.component.scss']
})
export class AprobarBeneficiosComponent implements OnInit, OnDestroy {

  // ── Tab ────────────────────────────────────────────────────────────
  tabActivo: TabActivo = 'revision';

  itemsPorPagina = 8;

  // ── En revisión ───────────────────────────────────────────────────
  beneficios: BeneficioRevision[] = [];
  cargando = true;
  error    = '';

  busqueda = '';
  resultadosBusquedaRevision: BeneficioRevision[] | null = null;
  buscandoRevision = false;
  paginaActual     = 1;

  // ── KPI + filtro de ventana (días) ────────────────────────────────
  kpi: KpiBeneficiosRecientes = { TotalAprobados: 0, TotalRechazados: 0 };
  cargandoKpi                 = true;

  filtroDias = 30;

  // ── Aprobados recientes ───────────────────────────────────────────
  aprobados:        BeneficioResuelto[] = [];
  cargandoAprobados = true;
  errorAprobados    = '';
  busquedaAprobados = '';
  resultadosBusquedaAprobados: BeneficioResuelto[] | null = null;
  buscandoAprobados = false;
  paginaAprobados   = 1;

  // ── Rechazados recientes ──────────────────────────────────────────
  rechazados:        BeneficioResuelto[] = [];
  cargandoRechazados = true;
  errorRechazados    = '';
  busquedaRechazados = '';
  resultadosBusquedaRechazados: BeneficioResuelto[] | null = null;
  buscandoRechazados = false;
  paginaRechazados   = 1;

  private busqueda$          = new Subject<string>();
  private busquedaAprobados$ = new Subject<string>();
  private busquedaRechazados$ = new Subject<string>();
  private destroy$            = new Subject<void>();

  // ── Modal resolver (aprobar / rechazar, ambos piden motivo) ──────────
  mostrarModalResolucion = false;
  decisionActual: DecisionBeneficio = 'Aceptado';
  beneficioParaResolver: BeneficioRevision | null = null;

  productos:         ProductoBeneficio[] = [];
  cargandoProductos  = false;
  inventarioIdSeleccionado: number | null = null;
  motivoResolucion   = '';

  guardandoResolucion = false;
  errorModal          = '';
  intentoGuardar       = false;

  // ── Modal referidos de una compra ───────────────────────────────────
  mostrarModalReferidos = false;
  clienteParaReferidos  = '';
  referidos:              ReferidoCompraAuxiliar[] = [];
  cargandoReferidos       = false;
  errorReferidos          = '';

  constructor(private svc: AprobarBeneficiosService) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarAprobados();
    this.cargarRechazados();
    this.cargarKpi();

    this.busqueda$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.ejecutarBusquedaRevision(q));

    this.busquedaAprobados$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.ejecutarBusquedaAprobados(q));

    this.busquedaRechazados$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.ejecutarBusquedaRechazados(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
  //  VENTANA RECIENTE: KPI + APROBADOS + RECHAZADOS
  // ════════════════════════════════════════════════════════════════════

  get totalAprobados(): number { return Number(this.kpi.TotalAprobados); }
  get totalRechazados(): number { return Number(this.kpi.TotalRechazados); }

  cargarKpi(): void {
    this.cargandoKpi = true;
    this.svc.kpiRecientes(this.filtroDias).subscribe({
      next:  k => { this.kpi = k; this.cargandoKpi = false; },
      error: () => { this.cargandoKpi = false; }
    });
  }

  cargarAprobados(): void {
    this.cargandoAprobados = true;
    this.errorAprobados    = '';
    this.svc.aprobadosRecientes(this.filtroDias).subscribe({
      next: data => {
        this.aprobados         = data;
        this.cargandoAprobados = false;
        this.paginaAprobados   = 1;
      },
      error: (err: any) => {
        this.cargandoAprobados = false;
        this.errorAprobados    = err?.error?.error || 'Error al cargar los beneficios aprobados.';
      }
    });
  }

  cargarRechazados(): void {
    this.cargandoRechazados = true;
    this.errorRechazados    = '';
    this.svc.rechazadosRecientes(this.filtroDias).subscribe({
      next: data => {
        this.rechazados         = data;
        this.cargandoRechazados = false;
        this.paginaRechazados   = 1;
      },
      error: (err: any) => {
        this.cargandoRechazados = false;
        this.errorRechazados    = err?.error?.error || 'Error al cargar los beneficios rechazados.';
      }
    });
  }

  aplicarFiltroDias(): void {
    this.cargarKpi();
    this.cargarAprobados();
    this.cargarRechazados();
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

  onBuscarRevisionInput(): void {
    this.paginaActual = 1;
    this.busqueda$.next(this.busqueda);
  }

  onBuscarAprobadosInput(): void {
    this.paginaAprobados = 1;
    this.busquedaAprobados$.next(this.busquedaAprobados);
  }

  onBuscarRechazadosInput(): void {
    this.paginaRechazados = 1;
    this.busquedaRechazados$.next(this.busquedaRechazados);
  }

  private ejecutarBusquedaRevision(q: string): void {
    const query = q.trim();
    if (!query) {
      this.resultadosBusquedaRevision = null;
      this.buscandoRevision           = false;
      return;
    }
    this.buscandoRevision = true;
    this.svc.buscarRevision(query).subscribe({
      next: data => {
        this.resultadosBusquedaRevision = data;
        this.buscandoRevision           = false;
      },
      error: (err: any) => {
        this.buscandoRevision = false;
        this.error             = err?.error?.error || 'Error al buscar beneficios.';
      }
    });
  }

  private ejecutarBusquedaAprobados(q: string): void {
    const query = q.trim();
    if (!query) {
      this.resultadosBusquedaAprobados = null;
      this.buscandoAprobados           = false;
      return;
    }
    this.buscandoAprobados = true;
    this.svc.buscarAprobados(query).subscribe({
      next: data => {
        this.resultadosBusquedaAprobados = data;
        this.buscandoAprobados           = false;
      },
      error: (err: any) => {
        this.buscandoAprobados = false;
        this.errorAprobados    = err?.error?.error || 'Error al buscar beneficios.';
      }
    });
  }

  private ejecutarBusquedaRechazados(q: string): void {
    const query = q.trim();
    if (!query) {
      this.resultadosBusquedaRechazados = null;
      this.buscandoRechazados           = false;
      return;
    }
    this.buscandoRechazados = true;
    this.svc.buscarRechazados(query).subscribe({
      next: data => {
        this.resultadosBusquedaRechazados = data;
        this.buscandoRechazados           = false;
      },
      error: (err: any) => {
        this.buscandoRechazados = false;
        this.errorRechazados    = err?.error?.error || 'Error al buscar beneficios.';
      }
    });
  }

  private refrescarRevision(): void {
    this.cargar();
    if (this.busqueda.trim()) this.ejecutarBusquedaRevision(this.busqueda);
  }

  private refrescarAprobadosYRechazados(): void {
    this.cargarAprobados();
    this.cargarRechazados();
    this.cargarKpi();
    if (this.busquedaAprobados.trim())  this.ejecutarBusquedaAprobados(this.busquedaAprobados);
    if (this.busquedaRechazados.trim()) this.ejecutarBusquedaRechazados(this.busquedaRechazados);
  }

  get beneficiosFiltrados(): BeneficioRevision[] { return this.resultadosBusquedaRevision ?? this.beneficios; }

  get beneficiosPaginados(): BeneficioRevision[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.beneficiosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.beneficiosFiltrados.length / this.itemsPorPagina);
  }

  get aprobadosFiltrados(): BeneficioResuelto[]  { return this.resultadosBusquedaAprobados  ?? this.aprobados; }
  get rechazadosFiltrados(): BeneficioResuelto[] { return this.resultadosBusquedaRechazados ?? this.rechazados; }

  get aprobadosPaginados(): BeneficioResuelto[] {
    const inicio = (this.paginaAprobados - 1) * this.itemsPorPagina;
    return this.aprobadosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }
  get totalPaginasAprobados(): number {
    return Math.ceil(this.aprobadosFiltrados.length / this.itemsPorPagina);
  }

  get rechazadosPaginados(): BeneficioResuelto[] {
    const inicio = (this.paginaRechazados - 1) * this.itemsPorPagina;
    return this.rechazadosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }
  get totalPaginasRechazados(): number {
    return Math.ceil(this.rechazadosFiltrados.length / this.itemsPorPagina);
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL RESOLVER (aprobar / rechazar — ambos piden motivo)
  // ════════════════════════════════════════════════════════════════════

  abrirResolucion(b: BeneficioRevision, decision: DecisionBeneficio): void {
    this.beneficioParaResolver    = b;
    this.decisionActual           = decision;
    this.inventarioIdSeleccionado = null;
    this.motivoResolucion         = '';
    this.errorModal               = '';
    this.intentoGuardar           = false;
    this.mostrarModalResolucion   = true;

    if (decision === 'Aceptado' && this.productos.length === 0) {
      this.cargandoProductos = true;
      this.svc.productos().subscribe({
        next:  data => { this.productos = data; this.cargandoProductos = false; },
        error: () => { this.cargandoProductos = false; }
      });
    }
  }

  cerrarResolucion(): void {
    this.mostrarModalResolucion  = false;
    this.beneficioParaResolver   = null;
  }

  confirmarResolucion(): void {
    this.intentoGuardar = true;
    if (!this.motivoResolucion.trim() || !this.beneficioParaResolver || this.guardandoResolucion) return;
    if (this.decisionActual === 'Aceptado' && !this.inventarioIdSeleccionado) return;

    this.guardandoResolucion = true;
    this.errorModal          = '';

    this.svc.cambiarEstado(this.beneficioParaResolver.ID, {
      estado: this.decisionActual,
      motivo: this.motivoResolucion.trim(),
      ...(this.decisionActual === 'Aceptado' ? { inventarioId: this.inventarioIdSeleccionado! } : {})
    }).subscribe({
      next: () => {
        this.guardandoResolucion = false;
        this.cerrarResolucion();
        this.refrescarRevision();
        this.refrescarAprobadosYRechazados();
      },
      error: (err: any) => {
        this.guardandoResolucion = false;
        const accion = this.decisionActual === 'Aceptado' ? 'aprobar' : 'rechazar';
        this.errorModal = err?.error?.error || `Error al ${accion} el beneficio.`;
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL REFERIDOS
  // ════════════════════════════════════════════════════════════════════

  abrirReferidos(compraId: number, nombreCliente: string): void {
    this.clienteParaReferidos  = nombreCliente;
    this.mostrarModalReferidos = true;
    this.referidos             = [];
    this.cargandoReferidos     = true;
    this.errorReferidos        = '';

    this.svc.referidosDeCompra(compraId).subscribe({
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
    this.clienteParaReferidos  = '';
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

  getEstadoCompraClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente':  'estado-pendiente',
      'Confirmado': 'estado-aceptado',
      'Rechazado':  'estado-rechazado'
    };
    return map[estado] ?? 'estado-default';
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

  formatearFechaHora(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
  }

  getPrimeraLetra(nombre: string): string {
    return nombre?.[0]?.toUpperCase() ?? 'A';
  }
}
