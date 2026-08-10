import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  ClientesService, ProductoCocina, Referido, NuevaCompraDto
} from '../clientes/clientes.service';

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

  // ── Modal Nueva venta ─────────────────────────────────────────────
  mostrarModalCompra = false;

  compraCedula          = '';
  compraCorreo          = '';
  compraDireccion       = '';
  nombreVentaLibre      = '';
  celularVentaLibre     = '';

  inventarioCocina:     ProductoCocina[] = [];
  inventarioFiltrado:   ProductoCocina[] = [];
  busquedaProducto      = '';
  mostrarBuscarProducto = false;
  itemsCompra:          { productoId: number; nombre: string; cantidad: number; precio: number }[] = [];

  compraFormaPago      = '';
  compraNotas          = '';
  aplicarBeneficio     = false;
  referidos:           Referido[] = [];

  guardandoCompra      = false;
  errorCompra          = '';
  intentoGuardarCompra = false;

  // Valores coinciden exactamente con el ENUM de la DB (guiones bajos)
  readonly FORMAS_PAGO = [
    'Efectivo', 'Tarjeta_Credito', 'Tarjeta_Debito',
    'Transferencia_Bancaria', 'Nequi', 'Daviplata',
    'Bold', 'Wompi', 'PSE', 'Bancolombia_App',
    'Rappipay', 'Dale', 'Movii', 'Contraentrega'
  ];

  readonly FORMAS_PAGO_LABELS: Record<string, string> = {
    'Efectivo':               'Efectivo',
    'Tarjeta_Credito':        'Tarjeta Crédito',
    'Tarjeta_Debito':         'Tarjeta Débito',
    'Transferencia_Bancaria': 'Transferencia Bancaria',
    'Nequi':                  'Nequi',
    'Daviplata':              'Daviplata',
    'Bold':                   'Bold',
    'Wompi':                  'Wompi',
    'PSE':                    'PSE',
    'Bancolombia_App':        'Bancolombia App',
    'Rappipay':               'Rappipay',
    'Dale':                   'Dale',
    'Movii':                  'Movii',
    'Contraentrega':          'Contraentrega',
  };

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
    this.svc.kpiComprasMes().subscribe({
      next: k => {
        this.kpi         = k;
        this.cargandoKpi = false;
      },
      error: () => {
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

  cargarTodo(): void {
    this.cargarSemana();
    this.cargarMes();
    this.cargarKpi();
    if (this.tabActivo === 'buscar' && this.busqueda.trim()) this._ejecutarBusqueda(this.busqueda);
  }

  // ════════════════════════════════════════════════════════════════
  //  TAB
  // ════════════════════════════════════════════════════════════════

  cambiarTab(tab: TabActivo): void {
    this.tabActivo  = tab;
    this.errorTabla = '';
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
    this.svc.buscarCompras(q).subscribe({
      next: r => {
        this.resultadosBusqueda = r;
        this.buscando           = false;
      },
      error: () => {
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
    this._resetCompra();
    this.mostrarModalCompra = true;

    this.svc.inventarioCocina().subscribe({
      next: items => { this.inventarioCocina = items; this.inventarioFiltrado = items; },
      error: () => {}
    });
  }

  private _resetCompra(): void {
    this.compraCedula          = '';
    this.compraCorreo          = '';
    this.compraDireccion       = '';
    this.nombreVentaLibre      = '';
    this.celularVentaLibre     = '';
    this.itemsCompra           = [];
    this.compraFormaPago       = '';
    this.compraNotas           = '';
    this.aplicarBeneficio      = false;
    this.referidos             = [];
    this.busquedaProducto      = '';
    this.mostrarBuscarProducto = false;
    this.errorCompra           = '';
    this.intentoGuardarCompra  = false;
    this.inventarioCocina      = [];
    this.inventarioFiltrado    = [];
  }

  cerrarCompra(): void {
    this.mostrarModalCompra = false;
  }

  toggleBuscarProducto(): void {
    this.mostrarBuscarProducto = !this.mostrarBuscarProducto;
    if (this.mostrarBuscarProducto) this.busquedaProducto = '';
  }

  filtrarProductos(): void {
    const q = this.busquedaProducto.toLowerCase();
    this.inventarioFiltrado = q
      ? this.inventarioCocina.filter(p => p.Nombre.toLowerCase().includes(q))
      : this.inventarioCocina;
  }

  agregarProducto(p: ProductoCocina): void {
    const existe = this.itemsCompra.find(i => i.productoId === p.ID);
    if (existe) { existe.cantidad++; }
    else {
      this.itemsCompra.push({
        productoId: p.ID, nombre: p.Nombre, cantidad: 1, precio: p.Valor
      });
    }
    this.mostrarBuscarProducto = false;
    this.busquedaProducto      = '';
  }

  ajustarCantidadItem(idx: number, delta: number): void {
    this.itemsCompra[idx].cantidad += delta;
    if (this.itemsCompra[idx].cantidad <= 0) this.itemsCompra.splice(idx, 1);
  }

  quitarItem(idx: number): void { this.itemsCompra.splice(idx, 1); }

  get totalCompra(): number {
    return this.itemsCompra.reduce((s, i) => s + i.precio * i.cantidad, 0);
  }

  agregarReferido(): void { this.referidos.push({ nombre: '', celular: '', direccion: '' }); }
  quitarReferido(idx: number): void { this.referidos.splice(idx, 1); }

  get referidosValidos(): boolean {
    return this.referidos.every(r => r.nombre.trim() && r.celular.trim());
  }

  async guardarCompra(): Promise<void> {
    this.intentoGuardarCompra = true;

    if (!this.compraCedula.trim())     { this.errorCompra = 'La cédula es obligatoria.'; return; }
    if (!this.compraFormaPago)         { this.errorCompra = 'Selecciona una forma de pago.'; return; }
    if (this.itemsCompra.length === 0) { this.errorCompra = 'Agrega al menos un producto.'; return; }
    if (this.aplicarBeneficio) {
      if (this.referidos.length < 10) {
        this.errorCompra = `Se necesitan mínimo 10 referidos para el beneficio 4x14. Tienes ${this.referidos.length}.`; return;
      }
      if (!this.referidosValidos) {
        this.errorCompra = 'Completa nombre y celular de todos los referidos.'; return;
      }
    }

    this.guardandoCompra = true;
    this.errorCompra     = '';

    // Venta libre: crear o reutilizar cliente por cédula
    const clienteLibreDto = {
      cedula:            this.compraCedula.trim(),
      nombre:            this.nombreVentaLibre.trim()  || null,
      celular:           this.celularVentaLibre.trim() || null,
      correoElectronico: this.compraCorreo.trim()      || '',
      direccion:         this.compraDireccion.trim()   || '',
    };
    try {
      await this.svc.registrarClienteLibre(clienteLibreDto).toPromise();
    } catch (err: any) {
      this.guardandoCompra = false;
      this.errorCompra     = err?.error?.error || 'Error al registrar el cliente.';
      return;
    }

    const dto: NuevaCompraDto = {
      cedulaCliente: this.compraCedula.trim(),
      formaPago:     this.compraFormaPago,
      notas:         this.compraNotas.trim() || null,
      items:         this.itemsCompra.map(i => ({ inventarioId: i.productoId, cantidad: i.cantidad })),
      referidos:     this.aplicarBeneficio ? this.referidos : []
    };

    this.svc.crearCompra(dto).subscribe({
      next: () => {
        this.guardandoCompra = false;
        this.cerrarCompra();
        this.cargarTodo();
      },
      error: (err: any) => {
        this.guardandoCompra = false;
        this.errorCompra     = err?.error?.error || 'Error al registrar la compra.';
      }
    });
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
