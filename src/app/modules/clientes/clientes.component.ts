import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ClientesService, Visita, KpiSemana,
  DetallePersona, HistorialCompra, HistorialVisita,
  ProductoAlimentacion, ProductoCocina, ClientePorPersona,
  ItemCompra, Referido, CambiarEstadoDto, NuevaCompraDto, CrearClienteDto
} from './clientes.service';

type EstadoVisita = 'Pendiente' | 'Visitado' | 'Rechaza' | 'No contesta' | 'Re agendada';
type Periodo      = 'semana' | 'mes' | 'personalizado';

@Component({
  selector:    'app-clientes',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './clientes.component.html',
  styleUrls:   ['./clientes.component.scss']
})
export class ClientesComponent implements OnInit {

  // ── KPIs ──────────────────────────────────────────────────────────
  kpi: KpiSemana = { TotalVisitas: 0, VisitasConfirmadas: 0, VisitasNoEfectivas: 0, PersonasTotales: 0 };
  cargandoKpi    = true;

  // ── Datos ─────────────────────────────────────────────────────────
  todasLasVisitas: Visita[]               = [];
  alimentacion:    ProductoAlimentacion[] = [];

  // ── Estado de carga ───────────────────────────────────────────────
  cargando   = true;
  errorTabla = '';

  // ── Búsqueda ──────────────────────────────────────────────────────
  busqueda = '';

  // ── Filtros ───────────────────────────────────────────────────────
  mostrarFiltros    = false;
  filtroPeriodo:    Periodo = 'semana';
  filtroFechaDesde  = '';
  filtroFechaHasta  = '';
  filtroEstado      = '';
  filtroTipo        = '';

  // ── Paginación ────────────────────────────────────────────────────
  paginaActual   = 1;
  itemsPorPagina = 10;

  // ── Modal detalle ─────────────────────────────────────────────────
  mostrarModalDetalle  = false;
  visitaSeleccionada:  Visita | null          = null;
  detallePersona:      DetallePersona | null  = null;
  historialCompras:    HistorialCompra[]       = [];
  historialVisitas:    HistorialVisita[]       = [];
  cargandoDetalle      = false;

  editCedula    = '';
  editCorreo    = '';
  editTelefono  = '';
  editDireccion = '';
  guardandoDetalle    = false;
  errorGuardarDetalle = '';

  // ── Modal cambio estado ───────────────────────────────────────────
  mostrarModalEstado  = false;
  visitaParaEstado:   Visita | null = null;
  nuevoEstado:        EstadoVisita  = 'Pendiente';
  notasEstado         = '';
  suplementosSeleccionados: { productoId: number; cantidad: number }[] = [];
  guardandoEstado     = false;
  errorModal          = '';
  intentoGuardar      = false;

  readonly ESTADOS: EstadoVisita[] = ['Pendiente', 'Visitado', 'Rechaza', 'No contesta', 'Re agendada'];

  // ── Modal nueva compra ────────────────────────────────────────────
  mostrarModalCompra    = false;
  modoVentaLibre        = false;
  visitaParaCompra:     Visita | null            = null;
  clienteInfo:          ClientePorPersona | null = null;
  cargandoCliente       = false;
  esProspecto           = false;

  nombreVentaLibre  = '';
  celularVentaLibre = '';
  buscandoCliente   = false;

  compraCedula          = '';
  compraCorreo          = '';
  compraDireccion       = '';
  inventarioCocina:     ProductoCocina[] = [];
  inventarioFiltrado:   ProductoCocina[] = [];
  busquedaProducto      = '';
  mostrarBuscarProducto = false;
  itemsCompra:          { productoId: number; nombre: string; cantidad: number; precio: number }[] = [];
  compraFormaPago       = '';
  compraNotas           = '';
  aplicarBeneficio      = false;
  referidos:            Referido[]   = [];
  guardandoCompra       = false;
  errorCompra           = '';
  intentoGuardarCompra  = false;

  // Valores coinciden exactamente con el ENUM de la DB (guiones bajos)
  readonly FORMAS_PAGO = [
    'Efectivo', 'Tarjeta_Credito', 'Tarjeta_Debito',
    'Transferencia_Bancaria', 'Nequi', 'Daviplata',
    'Bold', 'Wompi', 'PSE', 'Bancolombia_App',
    'Rappipay', 'Dale', 'Movii', 'Contraentrega'
  ];

  // Labels legibles para mostrar en el select
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

  ngOnInit(): void { this.cargarTodo(); }

  // ════════════════════════════════════════════════════════════════════
  //  CARGA
  // ════════════════════════════════════════════════════════════════════

  cargarTodo(): void {
    this.cargarVisitas();
    this.svc.obtenerAlimentacion().subscribe({
      next: a => { this.alimentacion = a; },
      error: () => {}
    });
  }

  cargarVisitas(): void {
    this.cargando   = true;
    this.errorTabla = '';

    if (this.filtroPeriodo === 'semana') {
      this.cargandoKpi = true;
      this.svc.listarSemana().subscribe({
        next: ({ visitas, kpi }) => {
          this.todasLasVisitas = visitas;
          this.kpi             = kpi;
          this.cargandoKpi     = false;
          this.cargando        = false;
          this.paginaActual    = 1;
        },
        error: () => {
          this.errorTabla  = 'Error al cargar visitas.';
          this.cargando    = false;
          this.cargandoKpi = false;
        }
      });
    } else {
      this.svc.listarMes().subscribe({
        next: v => { this.todasLasVisitas = v; this.cargando = false; this.paginaActual = 1; },
        error: () => { this.errorTabla = 'Error al cargar visitas.'; this.cargando = false; }
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  FILTROS Y PAGINACIÓN
  // ════════════════════════════════════════════════════════════════════

  toggleFiltros(): void { this.mostrarFiltros = !this.mostrarFiltros; }

  get filtrosActivos(): number {
    return [
      this.filtroEstado,
      this.filtroTipo,
      this.filtroPeriodo !== 'semana' ? this.filtroPeriodo : '',
      this.filtroFechaDesde,
      this.filtroFechaHasta
    ].filter(f => f !== '').length;
  }

  onCambiarPeriodo(): void { this.paginaActual = 1; this.cargarVisitas(); }
  aplicarFiltros(): void   { this.paginaActual = 1; }
  limpiarBusqueda(): void  { this.busqueda = ''; this.paginaActual = 1; }

  limpiarFiltros(): void {
    this.busqueda = ''; this.filtroEstado = ''; this.filtroTipo = '';
    this.filtroFechaDesde = ''; this.filtroFechaHasta = '';
    this.filtroPeriodo = 'semana'; this.paginaActual = 1;
    this.cargarVisitas();
  }

  get visitasFiltradas(): Visita[] {
    let r = [...this.todasLasVisitas];
    const q = this.busqueda.toLowerCase().trim();
    if (q) r = r.filter(v =>
      v.NombrePersona?.toLowerCase().includes(q) ||
      v.Celular?.toString().includes(q) ||
      v.Direccion?.toLowerCase().includes(q)
    );
    if (this.filtroEstado) r = r.filter(v => v.Estado === this.filtroEstado);
    if (this.filtroTipo)   r = r.filter(v => v.TipoPersona === this.filtroTipo);
    if (this.filtroPeriodo === 'personalizado') {
      if (this.filtroFechaDesde) {
        const desde = new Date(this.filtroFechaDesde).getTime();
        r = r.filter(v => new Date(v.FechaVisita).getTime() >= desde);
      }
      if (this.filtroFechaHasta) {
        const hasta = new Date(this.filtroFechaHasta + 'T23:59:59').getTime();
        r = r.filter(v => new Date(v.FechaVisita).getTime() <= hasta);
      }
    }
    return r;
  }

  get visitasPaginadas(): Visita[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.visitasFiltradas.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.visitasFiltradas.length / this.itemsPorPagina);
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL DETALLE
  // ════════════════════════════════════════════════════════════════════

  abrirDetalle(v: Visita): void {
    this.visitaSeleccionada  = v;
    this.mostrarModalDetalle = true;
    this.detallePersona      = null;
    this.historialCompras    = [];
    this.historialVisitas    = [];
    this.cargandoDetalle     = true;
    this.errorGuardarDetalle = '';
    this.editCedula = ''; this.editCorreo = '';
    this.editTelefono = ''; this.editDireccion = '';

    this.svc.detallePersona(v.PersonaID).subscribe({
      next: d => {
        this.detallePersona  = d;
        this.editCedula    = (d as any).Cedula            ?? '';
        this.editCorreo    = (d as any).CorreoElectronico ?? '';
        this.editTelefono  = (d as any).Telefono          ?? '';
        this.editDireccion = (d as any).Direccion         ?? '';
        this.cargandoDetalle = false;
      },
      error: () => { this.cargandoDetalle = false; }
    });

    this.svc.historialCompras(v.PersonaID).subscribe({
      next: c  => this.historialCompras = c, error: () => {}
    });
    this.svc.historialVisitas(v.PersonaID).subscribe({
      next: hv => this.historialVisitas = hv, error: () => {}
    });
  }

  cerrarDetalle(): void { this.mostrarModalDetalle = false; this.visitaSeleccionada = null; }

  guardarDetalle(): void { this.cerrarDetalle(); }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL CAMBIO ESTADO
  // ════════════════════════════════════════════════════════════════════

  abrirCambioEstado(v: Visita, event: Event): void {
    event.stopPropagation();
    this.visitaParaEstado         = v;
    this.nuevoEstado              = v.Estado as EstadoVisita;
    this.notasEstado              = v.Notas ?? '';
    this.suplementosSeleccionados = [];
    this.errorModal               = '';
    this.intentoGuardar           = false;
    this.mostrarModalEstado       = true;
  }

  cerrarCambioEstado(): void { this.mostrarModalEstado = false; this.visitaParaEstado = null; }

  getCantidadSuplemento(productoId: number): number {
    return this.suplementosSeleccionados.find(s => s.productoId === productoId)?.cantidad ?? 0;
  }

  setCantidadSuplemento(productoId: number, cantidad: number): void {
    // Nunca deja pedir más de lo que hay en stock (evita el error del backend
    // por descontar de más, y le muestra el límite al usuario al momento).
    const stock = this.alimentacion.find(p => p.ID === productoId)?.Cantidad ?? 0;
    const cantidadTope = Math.min(cantidad, stock);

    const idx = this.suplementosSeleccionados.findIndex(s => s.productoId === productoId);
    if (cantidadTope <= 0) { if (idx > -1) this.suplementosSeleccionados.splice(idx, 1); }
    else if (idx > -1) { this.suplementosSeleccionados[idx].cantidad = cantidadTope; }
    else               { this.suplementosSeleccionados.push({ productoId, cantidad: cantidadTope }); }
  }

  guardarEstado(): void {
    this.intentoGuardar = true;
    if (!this.notasEstado.trim() || !this.visitaParaEstado || this.guardandoEstado) return;
    this.guardandoEstado = true;
    this.errorModal      = '';

    const dto: CambiarEstadoDto = {
      visitaId:    this.visitaParaEstado.ID,
      estado:      this.nuevoEstado,
      notas:       this.notasEstado.trim(),
      suplementos: this.nuevoEstado === 'Visitado'
        ? this.suplementosSeleccionados.map(s => ({ inventarioId: s.productoId, cantidad: s.cantidad }))
        : []
    };

    this.svc.cambiarEstado(dto).subscribe({
      next: () => {
        this.guardandoEstado = false;
        this.intentoGuardar  = false;
        this.cerrarCambioEstado();
        this.cargarTodo();
      },
      error: (err: any) => {
        this.guardandoEstado = false;
        this.errorModal = err?.error?.error || 'Error al cambiar estado.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL NUEVA COMPRA — desde visita
  // ════════════════════════════════════════════════════════════════════

  abrirCompra(v: Visita, event: Event): void {
    event.stopPropagation();
    this._resetCompra();
    this.visitaParaCompra   = v;
    this.modoVentaLibre     = false;
    this.mostrarModalCompra = true;

    this.svc.inventarioCocina().subscribe({
      next: items => { this.inventarioCocina = items; this.inventarioFiltrado = items; },
      error: () => {}
    });

    this.cargandoCliente = true;
    this.svc.clientePorPersona(v.PersonaID).subscribe({
      next: (info: any) => {
        this.clienteInfo   = info;
        this.cargandoCliente = false;

        // Detectar prospecto por TipoPersona de la visita O por flag del endpoint
        const esNuevo = !info || (info.esNuevo ?? info.EsNuevo ?? false);
        this.esProspecto = esNuevo || v.TipoPersona === 'Prospecto';

        // Prospecto: cédula vacía y editable para que el asesor la ingrese
        // Cliente:   cédula prellenada y readonly
        this.compraCedula      = this.esProspecto ? '' : (info?.cedula ?? info?.Cedula ?? '');
        this.compraCorreo      = info?.correo ?? info?.Correo ?? info?.CorreoElectronico ?? '';
        this.nombreVentaLibre  = String(info?.nombre ?? info?.Nombre ?? v.NombrePersona ?? '');
        this.celularVentaLibre = String(info?.celular ?? info?.Celular ?? v.Celular ?? '');
        this.compraDireccion   = String(info?.direccion ?? info?.Direccion ?? '');

        console.log('[Compra] clientePorPersona:', { esProspecto: this.esProspecto, cedula: this.compraCedula });
      },
      error: () => {
        // Fallo = no existe en tabla cliente = es prospecto
        this.esProspecto       = true;
        this.compraCedula      = '';
        this.nombreVentaLibre  = v.NombrePersona ?? '';
        this.celularVentaLibre = String(v.Celular ?? '');
        this.compraDireccion   = '';
        this.cargandoCliente   = false;
      }
    });
  }

  // ── Nueva venta libre (desde botón header) ────────────────────────
  abrirNuevaVenta(): void {
    this._resetCompra();
    this.modoVentaLibre     = true;
    this.esProspecto        = false;
    this.mostrarModalCompra = true;

    this.svc.inventarioCocina().subscribe({
      next: items => { this.inventarioCocina = items; this.inventarioFiltrado = items; },
      error: () => {}
    });
  }

  private _resetCompra(): void {
    this.visitaParaCompra      = null;
    this.clienteInfo           = null;
    this.esProspecto           = false;
    this.modoVentaLibre        = false;
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
    this.cargandoCliente       = false;
    this.buscandoCliente       = false;
  }

  cerrarCompra(): void {
    this.mostrarModalCompra = false;
    this.visitaParaCompra   = null;
    this.modoVentaLibre     = false;
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

  // ── FIX 1: usar p.Valor en lugar de p.Precio (columna real en DB) ──
  // Nunca deja agregar/incrementar más de lo que hay en stock (evita el
  // error del backend por comprar de más, y le muestra el límite al
  // usuario al momento).
  agregarProducto(p: ProductoCocina): void {
    if (p.Cantidad === 0) return;

    const existe = this.itemsCompra.find(i => i.productoId === p.ID);
    if (existe) {
      if (existe.cantidad < p.Cantidad) existe.cantidad++;
    } else {
      this.itemsCompra.push({
        productoId: p.ID, nombre: p.Nombre, cantidad: 1, precio: p.Valor
      });
    }
    this.mostrarBuscarProducto = false;
    this.busquedaProducto      = '';
  }

  ajustarCantidadItem(idx: number, delta: number): void {
    const item  = this.itemsCompra[idx];
    const stock = this.stockDisponible(item.productoId);
    item.cantidad = Math.min(item.cantidad + delta, stock);
    if (item.cantidad <= 0) this.itemsCompra.splice(idx, 1);
  }

  stockDisponible(productoId: number): number {
    return this.inventarioCocina.find(p => p.ID === productoId)?.Cantidad ?? Infinity;
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

    if (!this.compraCedula.trim()) {
      this.errorCompra = this.esProspecto
        ? 'Debes ingresar la cédula del prospecto para registrarlo como cliente.'
        : 'La cédula es obligatoria.';
      return;
    }

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

    // Si es prospecto → crear cliente primero
    if (this.esProspecto && this.visitaParaCompra) {
      const crearDto: CrearClienteDto = {
        personaId:         this.visitaParaCompra.PersonaID,
        cedula:            this.compraCedula.trim(),
        correoElectronico: this.compraCorreo.trim()        || '',
        nombre:            String(this.nombreVentaLibre ?? '').trim()    || '',
        celular:           String(this.celularVentaLibre ?? '').trim()   || '',
        telefono:          '',
        direccion:         String(this.compraDireccion ?? '').trim()     || '',
      };
      try {
        await this.svc.crearClienteDesdeProspecto(crearDto).toPromise();
      } catch (err: any) {
        this.guardandoCompra = false;
        this.errorCompra = err?.error?.error || 'Error al crear cliente.';
        return;
      }
    }

    // ── Cliente existente desde visita: actualizar datos si los cambió ──
    if (!this.esProspecto && this.visitaParaCompra) {
      const clienteDto = {
        nombre:            String(this.nombreVentaLibre ?? '').trim()  || null,
        celular:           String(this.celularVentaLibre ?? '').trim() || null,
        correoElectronico: this.compraCorreo.trim()                    || null,
        direccion:         String(this.compraDireccion ?? '').trim()   || null,
      };
      try {
        await this.svc.actualizarCliente(this.compraCedula.trim(), clienteDto).toPromise();
      } catch (err: any) {
        console.warn('[Compra] Advertencia al actualizar datos cliente:', err);
      }
    }

    // ── Venta libre: crear o reutilizar cliente ──
    if (this.modoVentaLibre) {
      const clienteLibreDto = {
        cedula:            this.compraCedula.trim(),
        nombre:            String(this.nombreVentaLibre ?? '').trim()  || null,
        celular:           String(this.celularVentaLibre ?? '').trim() || null,
        correoElectronico: this.compraCorreo.trim()                    || '',
        direccion:         String(this.compraDireccion ?? '').trim()   || '',
      };
      try {
        await this.svc.registrarClienteLibre(clienteLibreDto).toPromise();
      } catch (err: any) {
        this.guardandoCompra = false;
        this.errorCompra = err?.error?.error || 'Error al registrar el cliente.';
        return;
      }
    }

    const dto: NuevaCompraDto = {
      cedulaCliente: this.compraCedula.trim(),
      formaPago:     this.compraFormaPago,
      notas:         this.compraNotas.trim() || null,
      items:         this.itemsCompra.map(i => ({ inventarioId: i.productoId, cantidad: i.cantidad })),
      referidos:     this.aplicarBeneficio ? this.referidos : []
    };

    console.log('[Compra] Enviando dto:', dto);

    this.svc.crearCompra(dto).subscribe({
      next: (res) => {
        console.log('[Compra] Guardada exitosamente:', res);
        this.guardandoCompra = false;
        this.cerrarCompra();
        this.cargarTodo();
      },
      error: (err: any) => {
        console.error('[Compra] Error al guardar:', err);
        this.guardandoCompra = false;
        this.errorCompra = err?.error?.error || 'Error al registrar la compra.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════════════

  formatearFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha), hoy = new Date(), ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === hoy.toDateString())
      return `HOY · ${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`;
    if (d.toDateString() === ayer.toDateString())
      return `AYER · ${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`;
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  formatearFechaCorta(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  formatearFechaHora(fecha: string): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente': 'estado-pendiente',   'Visitado':     'estado-visitado',
      'Rechaza':   'estado-rechaza',     'No contesta':  'estado-nocontesta',
      'Re agendada': 'estado-reagendada'
    };
    return map[estado] ?? 'estado-default';
  }

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
  }

  getPrimeraLetra(nombre: string): string {
    return nombre?.[0]?.toUpperCase() ?? 'A';
  }

  formatearPesos(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(valor);
  }

  get hayCambiosDetalle(): boolean {
    if (!this.detallePersona) return false;
    const d = this.detallePersona as any;
    return (
      this.editCorreo    !== (d.CorreoElectronico ?? '') ||
      this.editTelefono  !== (d.Telefono          ?? '') ||
      this.editDireccion !== (d.Direccion         ?? '') ||
      (this.detallePersona.tipo === 'Prospecto' &&
       this.editCedula   !== (d.Cedula            ?? ''))
    );
  }
}