import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ClientesService } from '../clientes/clientes.service';

export interface CompraResumen {
  ID:              number;
  NombreCliente:   string;
  CedulaCliente:   string;
  Productos:       string;
  FechaCompra:     string;
  TotalCompra:     string | number;
  EstadoCompra:    string;
  EstadoBeneficio: string | null;
  FormaPago:       string;
}

export interface KpiCompras {
  NumeroVentas: number;
  ValorVentasConfirmadas: number | string;
}

type TabActivo = 'semana' | 'mes' | 'buscar';

@Component({
  selector:    'app-compras',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './compras.component.html',
  styleUrls:   ['./compras.component.scss']
})
export class ComprasComponent implements OnInit {

  /** Emite cuando el usuario hace clic en "NUEVA VENTA" */
  @Output() nuevaVenta = new EventEmitter<void>();

  // ── KPI ───────────────────────────────────────────────────────────
  kpi: KpiCompras = { NumeroVentas: 0, ValorVentasConfirmadas: 0 };
  cargandoKpi     = true;

  // ── Listas ────────────────────────────────────────────────────────
  comprasSemana:      CompraResumen[] = [];
  comprasMes:         CompraResumen[] = [];
  resultadosBusqueda: CompraResumen[] = [];

  // ── Estado ────────────────────────────────────────────────────────
  cargandoSemana = false;
  cargandoMes    = false;
  errorTabla     = '';
  buscando       = false;

  get cargando(): boolean {
    return this.cargandoSemana || this.cargandoMes;
  }

  get valorConfirmadas(): number {
    return this.comprasMes
      .filter(c => c.EstadoCompra === 'Confirmado' || c.EstadoCompra === 'Confirmada')
      .reduce((sum, c) => sum + +c.TotalCompra, 0);
  }

  // ── Tab ───────────────────────────────────────────────────────────
  tabActivo: TabActivo = 'semana';

  // ── Búsqueda ──────────────────────────────────────────────────────
  busqueda       = '';
  private busqueda$ = new Subject<string>();

  constructor(private svc: ClientesService) {}

  ngOnInit(): void {
    this.cargarSemana();
    this.cargarMes();
    this.cargarKpi();

    // Debounce búsqueda 350 ms
    this.busqueda$.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(q => this._ejecutarBusqueda(q));
  }

  // ════════════════════════════════════════════════════════════════
  //  CARGA
  // ════════════════════════════════════════════════════════════════

  cargarKpi(): void {
    this.cargandoKpi = true;
    console.log('[Compras] cargarKpi → llamando kpiComprasMes()');
    this.svc.kpiComprasMes().subscribe({
      next: k => {
        console.log('[Compras] kpiComprasMes ✓ respuesta:', k);
        this.kpi         = k;
        this.cargandoKpi = false;
      },
      error: (err) => {
        console.error('[Compras] kpiComprasMes ✗ error:', err);
        this.cargandoKpi = false;
      }
    });
  }

  cargarSemana(): void {
    this.cargandoSemana = true;
    this.errorTabla     = '';
    this.svc.listarComprasSemana().subscribe({
      next: c => {
        this.comprasSemana  = c;
        this.cargandoSemana = false;
      },
      error: () => {
        this.errorTabla     = 'Error al cargar compras.';
        this.cargandoSemana = false;
      }
    });
  }

  cargarMes(): void {
    if (this.comprasMes.length > 0) return;
    this.cargandoMes = true;
    this.errorTabla  = '';
    this.svc.listarComprasMes().subscribe({
      next: c => {
        this.comprasMes  = c;
        this.cargandoMes = false;
      },
      error: () => {
        this.errorTabla  = 'Error al cargar compras.';
        this.cargandoMes = false;
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  TAB
  // ════════════════════════════════════════════════════════════════

  cambiarTab(tab: TabActivo): void {
    console.log('[Compras] cambiarTab →', tab);
    this.tabActivo  = tab;
    this.errorTabla = '';
    if (tab === 'mes')    this.cargarMes();
    if (tab === 'semana') this.cargarSemana();
  }

  // ════════════════════════════════════════════════════════════════
  //  BÚSQUEDA
  // ════════════════════════════════════════════════════════════════

  onBuscar(): void {
    this.busqueda$.next(this.busqueda);
  }

  private _ejecutarBusqueda(q: string): void {
    if (!q.trim()) { this.resultadosBusqueda = []; return; }
    this.buscando = true;
    console.log('[Compras] buscarCompras → q:', q);
    this.svc.buscarCompras(q).subscribe({
      next: r => {
        console.log('[Compras] buscarCompras ✓ resultados:', r.length, r);
        this.resultadosBusqueda = r;
        this.buscando           = false;
      },
      error: (err) => {
        console.error('[Compras] buscarCompras ✗ error:', err);
        this.buscando = false;
      }
    });
  }

  limpiarBusqueda(): void {
    this.busqueda           = '';
    this.resultadosBusqueda = [];
  }

  // ════════════════════════════════════════════════════════════════
  //  NUEVA VENTA
  // ════════════════════════════════════════════════════════════════

  abrirNuevaVenta(): void {
    this.nuevaVenta.emit();
  }

  // ════════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════════

  formatearPesos(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(valor);
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '—';
    const d    = new Date(fecha);
    const hoy  = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === hoy.toDateString())
      return `HOY · ${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`;
    if (d.toDateString() === ayer.toDateString())
      return `AYER · ${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`;
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
  }

  getPrimeraLetra(nombre: string): string {
    return nombre?.[0]?.toUpperCase() ?? 'A';
  }
}