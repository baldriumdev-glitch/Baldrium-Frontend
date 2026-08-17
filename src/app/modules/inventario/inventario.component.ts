import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormsModule,
  FormBuilder, FormGroup, Validators
} from '@angular/forms';
import {
  InventarioService, Producto, CrearProductoDto,
  AuditoriaInventarioItem, AuditoriaInfoItem, TIPOS_INVENTARIO
} from './inventario.service';

type ModalMode  = 'crear' | 'editar' | null;
type TabActivo  = 'inventario' | 'movimientos' | 'auditoria';

@Component({
  selector:    'app-inventario',
  standalone:  true,
  imports:     [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './inventario.component.html',
  styleUrls:   ['./inventario.component.scss']
})
export class InventarioComponent implements OnInit {

  // ── Datos ──────────────────────────────────────────────────────────
  productos:          Producto[] = [];
  productosFiltrados: Producto[] = [];
  auditoria:          AuditoriaInventarioItem[] = [];
  auditoriaInfo:      AuditoriaInfoItem[] = [];
  tiposInventario     = TIPOS_INVENTARIO;

  // ── Estados ────────────────────────────────────────────────────────
  cargando       = true;
  cargandoModal  = false;
  eliminando     = false;
  error          = '';
  errorModal     = '';
  errorEliminar  = '';

  // ── Tab ───────────────────────────────────────────────────────────
  tabActivo: TabActivo = 'inventario';

  // ── Paginación productos ───────────────────────────────────────────
  paginaActual   = 1;
  itemsPorPagina = 8;

  // ── Paginación auditoría ───────────────────────────────────────────
  paginaAuditoria   = 1;
  itemsAuditoriaPag = 15;

  // ── Búsqueda y filtros productos ───────────────────────────────────
  busqueda       = '';
  mostrarFiltros = false;
  filtroTipo     = '';
  filtroStock    = '';
  filtroOrden    = '';

  // ── Búsqueda y filtros auditoría (movimientos de stock) ─────────────
  busquedaAuditoria       = '';
  mostrarFiltrosAuditoria = false;
  filtroAudTipo           = '';
  filtroAudMotivo         = '';
  filtroAudFechaDesde     = '';
  filtroAudFechaHasta     = '';

  // ── Observaciones expandidas (auditoría) ────────────────────────────
  observacionesExpandidas = new Set<number>();

  // ── Descripciones expandidas (tabla de productos) ───────────────────
  descripcionesProductoExpandidas = new Set<number>();

  // ── Búsqueda y filtros auditoría general (crear/editar/eliminar) ────
  paginaAuditoriaInfo   = 1;
  itemsAuditoriaInfoPag = 15;
  busquedaAuditoriaInfo = '';
  filtroInfoAccion      = '';

  get auditoriaInfoFiltrada(): AuditoriaInfoItem[] {
    let resultado = [...this.auditoriaInfo];

    const q = this.busquedaAuditoriaInfo.toLowerCase().trim();
    if (q) {
      resultado = resultado.filter(a =>
        a.NombreResponsable?.toLowerCase().includes(q) ||
        a.TipoAccion?.toLowerCase().includes(q)         ||
        a.Descripcion?.toLowerCase().includes(q)
      );
    }

    if (this.filtroInfoAccion) {
      resultado = resultado.filter(a => a.TipoAccion === this.filtroInfoAccion);
    }

    return resultado;
  }

  get auditoriaInfoPaginada(): AuditoriaInfoItem[] {
    const inicio = (this.paginaAuditoriaInfo - 1) * this.itemsAuditoriaInfoPag;
    return this.auditoriaInfoFiltrada.slice(inicio, inicio + this.itemsAuditoriaInfoPag);
  }

  get totalPaginasAuditoriaInfo(): number {
    return Math.ceil(this.auditoriaInfoFiltrada.length / this.itemsAuditoriaInfoPag);
  }

  // ── Modal crear/editar ─────────────────────────────────────────────
  modalMode:            ModalMode    = null;
  productoSeleccionado: Producto | null = null;
  form!:                FormGroup;

  // ── Modal eliminar ─────────────────────────────────────────────────
  mostrarConfirmEliminar = false;
  productoAEliminar:     Producto | null = null;

  constructor(
    private svc: InventarioService,
    private fb:  FormBuilder
  ) {}

  // ════════════════════════════════════════════════════════════════════
  //  CICLO DE VIDA
  // ════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.cargarDatos();
  }

  // ════════════════════════════════════════════════════════════════════
  //  CARGA DE DATOS
  // ════════════════════════════════════════════════════════════════════

  cargarDatos(): void {
    this.cargando = true;

    this.svc.listar().subscribe({
      next: (data) => {
        this.productos          = data;
        this.productosFiltrados = data;
        this.cargando           = false;
      },
      error: () => {
        this.error    = 'Error al cargar inventario.';
        this.cargando = false;
      }
    });

    this.svc.listarAuditoria().subscribe({
      next:  (a) => this.auditoria = a,
      error: ()  => {}
    });

    this.svc.listarAuditoriaInfo().subscribe({
      next:  (a) => this.auditoriaInfo = a,
      error: ()  => {}
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  TAB
  // ════════════════════════════════════════════════════════════════════

  cambiarTab(tab: TabActivo): void {
    this.tabActivo = tab;
  }

  // ════════════════════════════════════════════════════════════════════
  //  KPIs
  // ════════════════════════════════════════════════════════════════════

  get totalProductos(): number { return this.productos.length; }
  get enStock(): number        { return this.productos.filter(p => p.Cantidad > 5).length; }
  get bajoStock(): number      { return this.productos.filter(p => p.Cantidad > 0 && p.Cantidad <= 5).length; }
  get sinStock(): number       { return this.productos.filter(p => p.Cantidad === 0).length; }

  get valorTotalInventario(): number {
    return this.productos.reduce((sum, p) => sum + (p.Valor * p.Cantidad), 0);
  }

  // ════════════════════════════════════════════════════════════════════
  //  PAGINACIÓN PRODUCTOS
  // ════════════════════════════════════════════════════════════════════

  get paginados(): Producto[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.productosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.productosFiltrados.length / this.itemsPorPagina);
  }

  paginaAnterior(): void { if (this.paginaActual > 1) this.paginaActual--; }
  paginaSiguiente(): void { if (this.paginaActual < this.totalPaginas) this.paginaActual++; }

  // ════════════════════════════════════════════════════════════════════
  //  PAGINACIÓN AUDITORÍA
  // ════════════════════════════════════════════════════════════════════

  get auditoriaFiltrada(): AuditoriaInventarioItem[] {
    let resultado = [...this.auditoria];

    const q = this.busquedaAuditoria.toLowerCase().trim();
    if (q) {
      resultado = resultado.filter(a =>
        a.NombreProducto?.toLowerCase().includes(q)    ||
        a.NombreResponsable?.toLowerCase().includes(q) ||
        a.TipoMovimiento?.toLowerCase().includes(q)    ||
        a.Motivo?.toLowerCase().includes(q)
      );
    }

    if (this.filtroAudTipo) {
      resultado = resultado.filter(a => a.TipoMovimiento === this.filtroAudTipo);
    }

    if (this.filtroAudMotivo) {
      resultado = resultado.filter(a => a.Motivo === this.filtroAudMotivo);
    }

    if (this.filtroAudFechaDesde) {
      const desde = new Date(this.filtroAudFechaDesde).getTime();
      resultado = resultado.filter(a => new Date(a.FechaHora).getTime() >= desde);
    }

    if (this.filtroAudFechaHasta) {
      const hasta = new Date(this.filtroAudFechaHasta + 'T23:59:59').getTime();
      resultado = resultado.filter(a => new Date(a.FechaHora).getTime() <= hasta);
    }

    return resultado;
  }

  get auditoriaPaginada(): AuditoriaInventarioItem[] {
    const inicio = (this.paginaAuditoria - 1) * this.itemsAuditoriaPag;
    return this.auditoriaFiltrada.slice(inicio, inicio + this.itemsAuditoriaPag);
  }

  get totalPaginasAuditoria(): number {
    return Math.ceil(this.auditoriaFiltrada.length / this.itemsAuditoriaPag);
  }

  get filtrosAuditoriaActivos(): number {
    return [this.filtroAudTipo, this.filtroAudMotivo,
            this.filtroAudFechaDesde, this.filtroAudFechaHasta]
      .filter(f => f !== '').length;
  }

  // ════════════════════════════════════════════════════════════════════
  //  FILTROS PRODUCTOS
  // ════════════════════════════════════════════════════════════════════

  onBuscar(): void { this.aplicarFiltros(); }

  toggleFiltros(): void { this.mostrarFiltros = !this.mostrarFiltros; }

  get filtrosActivos(): number {
    return [this.filtroTipo, this.filtroStock, this.filtroOrden]
      .filter(f => f !== '').length;
  }

  aplicarFiltros(): void {
    let resultado = [...this.productos];

    const q = this.busqueda.toLowerCase().trim();
    if (q) {
      resultado = resultado.filter(p =>
        String(p.ID).includes(q.replace('#', '')) ||
        p.Nombre.toLowerCase().includes(q)         ||
        p.Tipo.toLowerCase().includes(q)
      );
    }

    if (this.filtroTipo) {
      resultado = resultado.filter(p => p.Tipo === this.filtroTipo);
    }

    if (this.filtroStock === 'disponible') {
      resultado = resultado.filter(p => p.Cantidad > 5);
    } else if (this.filtroStock === 'bajo') {
      resultado = resultado.filter(p => p.Cantidad > 0 && p.Cantidad <= 5);
    } else if (this.filtroStock === 'sin') {
      resultado = resultado.filter(p => p.Cantidad === 0);
    }

    if (this.filtroOrden === 'nombre-asc') {
      resultado.sort((a, b) => a.Nombre.localeCompare(b.Nombre));
    } else if (this.filtroOrden === 'nombre-desc') {
      resultado.sort((a, b) => b.Nombre.localeCompare(a.Nombre));
    } else if (this.filtroOrden === 'cantidad-asc') {
      resultado.sort((a, b) => a.Cantidad - b.Cantidad);
    } else if (this.filtroOrden === 'cantidad-desc') {
      resultado.sort((a, b) => b.Cantidad - a.Cantidad);
    } else if (this.filtroOrden === 'valor-desc') {
      resultado.sort((a, b) => b.Valor - a.Valor);
    }

    this.productosFiltrados = resultado;
    this.paginaActual       = 1;
  }

  limpiarFiltros(): void {
    this.filtroTipo  = '';
    this.filtroStock = '';
    this.filtroOrden = '';
    this.busqueda    = '';
    this.aplicarFiltros();
  }

  toggleFiltrosAuditoria(): void {
    this.mostrarFiltrosAuditoria = !this.mostrarFiltrosAuditoria;
  }

  limpiarFiltrosAuditoria(): void {
    this.filtroAudTipo       = '';
    this.filtroAudMotivo     = '';
    this.filtroAudFechaDesde = '';
    this.filtroAudFechaHasta = '';
    this.busquedaAuditoria   = '';
    this.paginaAuditoria     = 1;
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL CREAR / EDITAR
  // ════════════════════════════════════════════════════════════════════

  abrirCrear(): void {
    this.modalMode            = 'crear';
    this.productoSeleccionado = null;
    this.errorModal           = '';
    this.form = this.fb.group({
      Nombre:           ['', Validators.required],
      Descripcion:      [''],
      Tipo:             ['', Validators.required],
      Valor:            [0,  [Validators.required, Validators.min(0)]],
      Cantidad:         [0,  [Validators.required, Validators.min(0)]],
      FechaVencimiento: ['']
    });
    this._observarTipoParaVencimiento();
  }

  abrirEditar(p: Producto): void {
    this.modalMode            = 'editar';
    this.productoSeleccionado = p;
    this.errorModal           = '';
    this.form = this.fb.group({
      Nombre:           [p.Nombre,      Validators.required],
      Descripcion:      [p.Descripcion || ''],
      Tipo:             [p.Tipo,        Validators.required],
      Valor:            [p.Valor,       [Validators.required, Validators.min(0)]],
      Cantidad:         [p.Cantidad,    [Validators.required, Validators.min(0)]],
      FechaVencimiento: [p.FechaVencimiento ? p.FechaVencimiento.slice(0, 10) : '']
    });
    this._observarTipoParaVencimiento();
  }

  // La fecha de vencimiento solo aplica (y es obligatoria) para Tipo = 'Alimentacion';
  // para cualquier otro tipo se limpia y deja de validarse.
  private _observarTipoParaVencimiento(): void {
    const tipoCtrl = this.form.get('Tipo');
    const vencCtrl = this.form.get('FechaVencimiento');
    if (!tipoCtrl || !vencCtrl) return;

    const actualizar = (tipo: string) => {
      if (tipo === 'Alimentacion') {
        vencCtrl.setValidators([Validators.required]);
      } else {
        vencCtrl.setValidators([]);
        vencCtrl.setValue('');
      }
      vencCtrl.updateValueAndValidity();
    };

    tipoCtrl.valueChanges.subscribe(actualizar);
    actualizar(tipoCtrl.value);
  }

  get esAlimentacion(): boolean {
    return this.form?.get('Tipo')?.value === 'Alimentacion';
  }

  cerrarModal(): void {
    this.modalMode  = null;
    this.errorModal = '';
  }

  ajustarCantidad(delta: number): void {
    const ctrl = this.form.get('Cantidad');
    if (!ctrl) return;
    const nuevo = Math.max(0, (ctrl.value || 0) + delta);
    ctrl.setValue(nuevo);
  }

  guardar(): void {
    if (this.form.invalid || this.cargandoModal) return;
    this.cargandoModal = true;
    this.errorModal    = '';

    const dto: CrearProductoDto = this.form.getRawValue();

    if (this.modalMode === 'crear') {
      this.svc.crear(dto).subscribe({
        next: () => { this.cargandoModal = false; this.cerrarModal(); this.cargarDatos(); },
        error: (err: any) => {
          this.cargandoModal = false;
          this.errorModal    = err?.error?.error || 'Error al crear producto.';
        }
      });
    } else if (this.modalMode === 'editar' && this.productoSeleccionado) {
      this.svc.actualizar(this.productoSeleccionado.ID, dto).subscribe({
        next: () => { this.cargandoModal = false; this.cerrarModal(); this.cargarDatos(); },
        error: (err: any) => {
          this.cargandoModal = false;
          this.errorModal    = err?.error?.error || 'Error al actualizar producto.';
        }
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  ELIMINAR
  // ════════════════════════════════════════════════════════════════════

  abrirConfirmEliminar(p: Producto, event: Event): void {
    event.stopPropagation();
    this.productoAEliminar      = p;
    this.mostrarConfirmEliminar = true;
    this.errorEliminar          = '';
  }

  cerrarConfirmEliminar(): void {
    this.mostrarConfirmEliminar = false;
    this.productoAEliminar      = null;
    this.errorEliminar          = '';
  }

  ejecutarEliminar(): void {
    if (!this.productoAEliminar) return;
    this.eliminando = true;
    this.svc.eliminar(this.productoAEliminar.ID).subscribe({
      next: () => {
        this.eliminando = false;
        this.cerrarConfirmEliminar();
        this.cargarDatos();
      },
      error: (err: any) => {
        this.eliminando    = false;
        this.errorEliminar = err?.error?.error || 'No se pudo eliminar el producto.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  EXPORTAR PDF
  // ════════════════════════════════════════════════════════════════════

  exportarPDF(): void {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then((autoTable) => {
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Baldrium Group S.A.S', 14, 20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Reporte de Inventario', 14, 28);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 34);

        autoTable.default(doc, {
          head: [['ID', 'Nombre', 'Tipo', 'Valor Unitario', 'Cantidad', 'Stock', 'Vencimiento']],
          body: this.productos.map(p => [
            `#${p.ID}`,
            p.Nombre,
            p.Tipo,
            `$${p.Valor.toLocaleString('es-CO')}`,
            p.Cantidad,
            this.getEstadoStock(p.Cantidad),
            this.formatearFechaCorta(p.FechaVencimiento)
          ]),
          startY:     42,
          theme:      'grid',
          headStyles: { fillColor: [15, 25, 35], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 249, 251] }
        });

        doc.save(`inventario-baldrium-${new Date().toISOString().slice(0,10)}.pdf`);
      });
    });
  }

  exportarAuditoriaPDF(): void {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then((autoTable) => {
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Baldrium Group S.A.S', 14, 20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Auditoría de Movimientos de Inventario', 14, 28);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 34);

        autoTable.default(doc, {
          head: [['Fecha', 'Producto', 'Responsable', 'Movimiento', 'Cant. Ant.', 'Movimiento', 'Cant. Post.', 'Motivo']],
          body: this.auditoriaFiltrada.map(a => [
            this.formatearFecha(a.FechaHora),
            a.NombreProducto,
            a.NombreResponsable,
            a.TipoMovimiento,
            a.CantidadAnterior,
            a.CantidadMovimiento,
            a.CantidadPosterior,
            a.Motivo
          ]),
          startY:     42,
          theme:      'grid',
          headStyles: { fillColor: [15, 25, 35], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 7 },
          alternateRowStyles: { fillColor: [248, 249, 251] }
        });

        doc.save(`auditoria-inventario-${new Date().toISOString().slice(0,10)}.pdf`);
      });
    });
  }

  exportarAuditoriaInfoPDF(): void {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then((autoTable) => {
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Baldrium Group S.A.S', 14, 20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Auditoría de Productos', 14, 28);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 34);

        autoTable.default(doc, {
          head: [['Fecha y Hora', 'Acción', 'Responsable', 'Cédula', 'Resultado', 'Descripción']],
          body: this.auditoriaInfoFiltrada.map(a => [
            this.formatearFecha(a.FechaHora),
            a.TipoAccion,
            a.NombreResponsable,
            a.CedulaResponsable,
            a.Resultado,
            a.Descripcion
          ]),
          startY:     42,
          theme:      'grid',
          headStyles: { fillColor: [15, 25, 35], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 7 },
          alternateRowStyles: { fillColor: [248, 249, 251] },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 25 },
            2: { cellWidth: 40 },
            3: { cellWidth: 28 },
            4: { cellWidth: 25 },
            5: { cellWidth: 'auto' }
          }
        });

        doc.save(`auditoria-productos-${new Date().toISOString().slice(0,10)}.pdf`);
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════════════

  getEstadoStock(cantidad: number): string {
    if (cantidad === 0) return 'Sin Stock';
    if (cantidad <= 5)  return 'Bajo Stock';
    return 'Disponible';
  }

  getEstadoStockClass(cantidad: number): string {
    if (cantidad === 0) return 'sin-stock';
    if (cantidad <= 5)  return 'bajo-stock';
    return 'disponible';
  }

  // ── Vencimiento (solo productos Tipo = 'Alimentacion') ──────────────
  estaVencido(p: Producto): boolean {
    if (!p.FechaVencimiento) return false;
    return new Date(p.FechaVencimiento).getTime() < new Date(new Date().toDateString()).getTime();
  }

  estaPorVencer(p: Producto): boolean {
    if (!p.FechaVencimiento || this.estaVencido(p)) return false;
    const dias = (new Date(p.FechaVencimiento).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000;
    return dias <= 7;
  }

  getVencimientoClass(p: Producto): string {
    if (this.estaVencido(p))   return 'venc-vencido';
    if (this.estaPorVencer(p)) return 'venc-proximo';
    return 'venc-ok';
  }

  formatearFechaCorta(fecha: string | null): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  }

  getTipoClass(tipo: string): string {
    const map: Record<string, string> = {
      'Beneficio':           'tipo-beneficio',
      'Inventario de cocina':'tipo-cocina',
      'Alimentacion':        'tipo-alimentacion'
    };
    return map[tipo] ?? 'tipo-default';
  }

  getMovimientoClass(tipo: string): string {
    return tipo === 'ENTRADA' ? 'mov-entrada' : 'mov-salida';
  }

  getAccionClass(accion: string): string {
    const map: Record<string, string> = {
      'CREAR':    'accion-crear',
      'EDITAR':   'accion-editar',
      'ELIMINAR': 'accion-eliminar'
    };
    return map[accion] ?? 'accion-default';
  }

  getMotivoClass(motivo: string): string {
    const map: Record<string, string> = {
      'AJUSTE_POSITIVO': 'motivo-positivo',
      'AJUSTE_NEGATIVO': 'motivo-negativo',
      'BAJA':            'motivo-baja',
      'VENTA':           'motivo-venta',
      'COMPRA':          'motivo-compra'
    };
    return map[motivo] ?? 'motivo-default';
  }

  formatearFecha(fechaHora: string): string {
    if (!fechaHora) return '—';
    const d = new Date(fechaHora);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  toggleObservacion(id: number): void {
    if (this.observacionesExpandidas.has(id)) this.observacionesExpandidas.delete(id);
    else this.observacionesExpandidas.add(id);
  }

  esObservacionLarga(texto: string): boolean {
    return (texto?.length ?? 0) > 40;
  }

  toggleDescripcionProducto(id: number): void {
    if (this.descripcionesProductoExpandidas.has(id)) this.descripcionesProductoExpandidas.delete(id);
    else this.descripcionesProductoExpandidas.add(id);
  }

  esDescripcionLarga(texto: string | null): boolean {
    return (texto?.length ?? 0) > 40;
  }

  formatearPrecio(valor: number): string {
    return `$${Number(valor).toLocaleString('es-CO')}`;
  }

  getInicialesResponsable(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  getPrimeraLetra(nombre: string): string {
    if (!nombre) return 'A';
    return nombre[0].toUpperCase();
  }
}
