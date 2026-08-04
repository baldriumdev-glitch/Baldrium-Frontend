import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  TelemercadeoService, Prospecto, VisitaAgendada,
  Asesor, AgendarVisitaDto, EstadoProspectoEditable, EditarVisitaDto,
  EstadoVisitaEditable, CambiarEstadoVisitaDto
} from './telemercadeo.service';

type TabActivo = 'prospectos' | 'visitas';

@Component({
  selector:    'app-telemercadeo',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './telemercadeo.component.html',
  styleUrls:   ['./telemercadeo.component.scss']
})
export class TelemercadeoComponent implements OnInit, OnDestroy {

  // ── Tab ────────────────────────────────────────────────────────────
  tabActivo: TabActivo = 'prospectos';

  // ── Datos: prospectos ──────────────────────────────────────────────
  pendientes: Prospecto[] = [];
  enGestion:  Prospecto[] = [];

  cargandoPendientes = true;
  cargandoEnGestion  = true;
  errorPendientes    = '';
  errorEnGestion     = '';

  busquedaPendientes = '';
  busquedaEnGestion  = '';

  // null = sin búsqueda activa (se muestra la cola normal de 14 días);
  // array = resultados del backend para el texto buscado (sin límite de fecha)
  resultadosBusquedaPendientes: Prospecto[] | null = null;
  resultadosBusquedaEnGestion:  Prospecto[] | null = null;
  buscandoPendientes = false;
  buscandoEnGestion  = false;

  private busquedaPendientes$ = new Subject<string>();
  private busquedaEnGestion$  = new Subject<string>();
  private destroy$            = new Subject<void>();

  paginaPendientes = 1;
  paginaEnGestion  = 1;
  itemsPorPagina   = 8;

  // ── Datos: visitas agendadas (semana actual) ───────────────────────
  visitadas:    VisitaAgendada[] = [];
  porGestionar: VisitaAgendada[] = [];

  cargandoVisitadas    = true;
  cargandoPorGestionar = true;
  errorVisitadas       = '';
  errorPorGestionar    = '';

  busquedaVisitadas    = '';
  busquedaPorGestionar = '';

  resultadosBusquedaVisitadas:    VisitaAgendada[] | null = null;
  resultadosBusquedaPorGestionar: VisitaAgendada[] | null = null;
  buscandoVisitadas    = false;
  buscandoPorGestionar = false;

  private busquedaVisitadas$    = new Subject<string>();
  private busquedaPorGestionar$ = new Subject<string>();

  paginaVisitadas    = 1;
  paginaPorGestionar = 1;

  // ── Datos: visitas fallidas (Rechaza / Cancelada, últimas 2 semanas) ──
  fallidas: VisitaAgendada[] = [];
  cargandoFallidas = true;
  errorFallidas    = '';

  busquedaFallidas = '';
  resultadosBusquedaFallidas: VisitaAgendada[] | null = null;
  buscandoFallidas = false;
  private busquedaFallidas$ = new Subject<string>();

  paginaFallidas = 1;

  totalFallidas    = 0;
  cargandoKpiFallidas = true;

  // ── Modal agendar visita ───────────────────────────────────────────
  mostrarModalAgendar   = false;
  prospectoParaAgendar: Prospecto | null = null;

  agendarNombre           = '';
  agendarCelular          = '';
  agendarDireccion        = '';
  agendarCedulaTrabajador = '';
  agendarFechaVisita      = '';
  agendarCantidadPersonas = 1;
  agendarNotas            = '';

  asesores:         Asesor[] = [];
  cargandoAsesores  = false;
  guardandoAgendar  = false;
  errorAgendar      = '';
  intentoAgendar    = false;

  // ── Cambio de estado inline (Pendiente / Contactado / No responde) ──
  readonly ESTADOS_EDITABLES: EstadoProspectoEditable[] = ['Pendiente', 'Contactado', 'No responde'];
  actualizandoEstadoId: number | null = null;
  errorActualizarEstado = '';

  // ── Modal editar visita ──────────────────────────────────────────────
  mostrarModalEditarVisita = false;
  visitaParaEditar: VisitaAgendada | null = null;
  cargandoDetalleEditar     = false;
  errorDetalleEditar        = '';

  editCedulaTrabajador = '';
  editFechaVisita      = '';
  editCantidadPersonas = 1;
  editNotas            = '';

  guardandoEditarVisita = false;
  errorEditarVisita     = '';
  intentoEditarVisita   = false;

  // ── Modal cancelar visita ────────────────────────────────────────────
  mostrarModalCancelarVisita = false;
  visitaParaCancelar: VisitaAgendada | null = null;
  motivoCancelar = '';

  cancelandoVisita     = false;
  errorCancelarVisita  = '';
  intentoCancelarVisita = false;

  // ── Modal cambiar estado visita (Pendiente / No contesta / Re agendada) ──
  readonly ESTADOS_VISITA_EDITABLES: EstadoVisitaEditable[] = ['Pendiente', 'No contesta', 'Re agendada'];
  mostrarModalEstadoVisita = false;
  visitaParaEstado: VisitaAgendada | null = null;
  nuevoEstadoVisita: EstadoVisitaEditable = 'Pendiente';
  notasEstadoVisita = '';

  cambiandoEstadoVisita = false;
  errorEstadoVisita     = '';
  intentoEstadoVisita   = false;

  constructor(private svc: TelemercadeoService) {}

  ngOnInit(): void {
    this.cargarPendientes();
    this.cargarEnGestion();
    this.cargarVisitadas();
    this.cargarPorGestionar();
    this.cargarFallidas();
    this.cargarKpiFallidas();

    this.busquedaPendientes$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.ejecutarBusquedaPendientes(q));

    this.busquedaEnGestion$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.ejecutarBusquedaEnGestion(q));

    this.busquedaVisitadas$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.ejecutarBusquedaVisitadas(q));

    this.busquedaPorGestionar$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.ejecutarBusquedaPorGestionar(q));

    this.busquedaFallidas$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.ejecutarBusquedaFallidas(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cambiarTab(tab: TabActivo): void {
    this.tabActivo = tab;
  }

  // ════════════════════════════════════════════════════════════════════
  //  CARGA
  // ════════════════════════════════════════════════════════════════════

  cargarPendientes(): void {
    this.cargandoPendientes = true;
    this.errorPendientes    = '';
    this.svc.pendientes().subscribe({
      next: data => {
        this.pendientes         = data;
        this.cargandoPendientes = false;
        this.paginaPendientes   = 1;
      },
      error: (err: any) => {
        this.cargandoPendientes = false;
        this.errorPendientes    = err?.error?.error || 'Error al cargar la cola de prospectos.';
      }
    });
  }

  cargarEnGestion(): void {
    this.cargandoEnGestion = true;
    this.errorEnGestion    = '';
    this.svc.enGestion().subscribe({
      next: data => {
        this.enGestion         = data;
        this.cargandoEnGestion = false;
        this.paginaEnGestion   = 1;
      },
      error: (err: any) => {
        this.cargandoEnGestion = false;
        this.errorEnGestion    = err?.error?.error || 'Error al cargar los prospectos en gestión.';
      }
    });
  }

  cargarVisitadas(): void {
    this.cargandoVisitadas = true;
    this.errorVisitadas    = '';
    this.svc.visitasSemanaVisitadas().subscribe({
      next: data => {
        this.visitadas         = data;
        this.cargandoVisitadas = false;
        this.paginaVisitadas   = 1;
      },
      error: (err: any) => {
        this.cargandoVisitadas = false;
        this.errorVisitadas    = err?.error?.error || 'Error al cargar las visitas de la semana.';
      }
    });
  }

  cargarPorGestionar(): void {
    this.cargandoPorGestionar = true;
    this.errorPorGestionar    = '';
    this.svc.visitasSemanaPorGestionar().subscribe({
      next: data => {
        this.porGestionar         = data;
        this.cargandoPorGestionar = false;
        this.paginaPorGestionar   = 1;
      },
      error: (err: any) => {
        this.cargandoPorGestionar = false;
        this.errorPorGestionar    = err?.error?.error || 'Error al cargar las visitas por gestionar.';
      }
    });
  }

  cargarFallidas(): void {
    this.cargandoFallidas = true;
    this.errorFallidas    = '';
    this.svc.visitasFallidas().subscribe({
      next: data => {
        this.fallidas         = data;
        this.cargandoFallidas = false;
        this.paginaFallidas   = 1;
      },
      error: (err: any) => {
        this.cargandoFallidas = false;
        this.errorFallidas    = err?.error?.error || 'Error al cargar las visitas fallidas.';
      }
    });
  }

  cargarKpiFallidas(): void {
    this.cargandoKpiFallidas = true;
    this.svc.kpiVisitasFallidas().subscribe({
      next:  kpi => { this.totalFallidas = kpi.TotalFallidas; this.cargandoKpiFallidas = false; },
      error: ()  => { this.cargandoKpiFallidas = false; }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL AGENDAR VISITA
  // ════════════════════════════════════════════════════════════════════

  abrirAgendar(p: Prospecto): void {
    this.prospectoParaAgendar    = p;
    this.agendarNombre           = p.Nombre ?? '';
    this.agendarCelular          = p.Celular != null ? String(p.Celular) : '';
    this.agendarDireccion        = p.Direccion ?? '';
    this.agendarCedulaTrabajador = '';
    this.agendarFechaVisita      = '';
    this.agendarCantidadPersonas = 1;
    this.agendarNotas            = '';
    this.errorAgendar            = '';
    this.intentoAgendar          = false;
    this.mostrarModalAgendar     = true;

    this.cargarAsesoresSiFaltan();
  }

  private cargarAsesoresSiFaltan(): void {
    if (this.asesores.length > 0) return;
    this.cargandoAsesores = true;
    this.svc.asesores().subscribe({
      next:  data => { this.asesores = data; this.cargandoAsesores = false; },
      error: () => { this.cargandoAsesores = false; }
    });
  }

  cerrarAgendar(): void {
    this.mostrarModalAgendar  = false;
    this.prospectoParaAgendar = null;
  }

  get agendarValido(): boolean {
    return !!this.agendarNombre.trim()    &&
           !!this.agendarCelular.trim()   &&
           !!this.agendarDireccion.trim() &&
           !!this.agendarCedulaTrabajador &&
           !!this.agendarFechaVisita      &&
           this.agendarCantidadPersonas > 0;
  }

  guardarAgendar(): void {
    this.intentoAgendar = true;
    if (!this.agendarValido || !this.prospectoParaAgendar || this.guardandoAgendar) return;

    this.guardandoAgendar = true;
    this.errorAgendar     = '';

    const dto: AgendarVisitaDto = {
      nombre:           this.agendarNombre.trim(),
      celular:          this.agendarCelular.trim(),
      direccion:        this.agendarDireccion.trim(),
      cedulaTrabajador: this.agendarCedulaTrabajador,
      fechaVisita:      this.formatearFechaParaBackend(this.agendarFechaVisita),
      cantidadPersonas: this.agendarCantidadPersonas,
      notas:            this.agendarNotas.trim() || undefined
    };

    this.svc.agendarVisita(this.prospectoParaAgendar.ID, dto).subscribe({
      next: () => {
        this.guardandoAgendar = false;
        this.cerrarAgendar();
        this.refrescarProspectos();
        this.refrescarPorGestionar();
      },
      error: (err: any) => {
        this.guardandoAgendar = false;
        this.errorAgendar     = err?.error?.error || 'Error al agendar la visita.';
      }
    });
  }

  private formatearFechaParaBackend(valorDatetimeLocal: string): string {
    return `${valorDatetimeLocal.replace('T', ' ')}:00`;
  }

  private fechaAInputLocal(fechaIso: string): string {
    if (!fechaIso) return '';
    const d   = new Date(fechaIso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL EDITAR VISITA
  // ════════════════════════════════════════════════════════════════════

  abrirEditarVisita(v: VisitaAgendada): void {
    this.visitaParaEditar      = v;
    this.mostrarModalEditarVisita = true;
    this.cargandoDetalleEditar = true;
    this.errorDetalleEditar    = '';
    this.errorEditarVisita     = '';
    this.intentoEditarVisita   = false;

    this.cargarAsesoresSiFaltan();

    this.svc.detalleVisita(v.ID).subscribe({
      next: detalle => {
        this.visitaParaEditar      = detalle;
        this.editCedulaTrabajador  = detalle.CedulaTrabajador ?? '';
        this.editFechaVisita       = this.fechaAInputLocal(detalle.FechaVisita);
        this.editCantidadPersonas  = detalle.CantidadPersonas ?? 1;
        this.editNotas             = detalle.Notas ?? '';
        this.cargandoDetalleEditar = false;
      },
      error: (err: any) => {
        this.cargandoDetalleEditar = false;
        this.errorDetalleEditar    = err?.error?.error || 'Error al cargar el detalle de la visita.';
      }
    });
  }

  cerrarEditarVisita(): void {
    this.mostrarModalEditarVisita = false;
    this.visitaParaEditar         = null;
  }

  get editarVisitaValido(): boolean {
    return !!this.editCedulaTrabajador &&
           !!this.editFechaVisita      &&
           this.editCantidadPersonas > 0 &&
           !!this.editNotas.trim();
  }

  guardarEditarVisita(): void {
    this.intentoEditarVisita = true;
    if (!this.editarVisitaValido || !this.visitaParaEditar || this.guardandoEditarVisita) return;

    this.guardandoEditarVisita = true;
    this.errorEditarVisita     = '';

    const dto: EditarVisitaDto = {
      cedulaTrabajador: this.editCedulaTrabajador,
      fechaVisita:      this.formatearFechaParaBackend(this.editFechaVisita),
      cantidadPersonas: this.editCantidadPersonas,
      notas:            this.editNotas.trim()
    };

    this.svc.editarVisita(this.visitaParaEditar.ID, dto).subscribe({
      next: () => {
        this.guardandoEditarVisita = false;
        this.cerrarEditarVisita();
        this.refrescarPorGestionar();
      },
      error: (err: any) => {
        this.guardandoEditarVisita = false;
        this.errorEditarVisita     = err?.error?.error || 'Error al editar la visita.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL CANCELAR VISITA
  // ════════════════════════════════════════════════════════════════════

  abrirCancelarVisita(v: VisitaAgendada): void {
    this.visitaParaCancelar       = v;
    this.motivoCancelar           = '';
    this.errorCancelarVisita      = '';
    this.intentoCancelarVisita    = false;
    this.mostrarModalCancelarVisita = true;
  }

  cerrarCancelarVisita(): void {
    this.mostrarModalCancelarVisita = false;
    this.visitaParaCancelar         = null;
  }

  confirmarCancelarVisita(): void {
    this.intentoCancelarVisita = true;
    if (!this.motivoCancelar.trim() || !this.visitaParaCancelar || this.cancelandoVisita) return;

    this.cancelandoVisita    = true;
    this.errorCancelarVisita = '';

    this.svc.cancelarVisita(this.visitaParaCancelar.ID, this.motivoCancelar.trim()).subscribe({
      next: () => {
        this.cancelandoVisita = false;
        this.cerrarCancelarVisita();
        this.refrescarPorGestionar();
        this.refrescarFallidas();
      },
      error: (err: any) => {
        this.cancelandoVisita    = false;
        this.errorCancelarVisita = err?.error?.error || 'Error al cancelar la visita.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL CAMBIAR ESTADO VISITA
  // ════════════════════════════════════════════════════════════════════

  abrirCambiarEstadoVisita(v: VisitaAgendada): void {
    this.visitaParaEstado    = v;
    this.nuevoEstadoVisita   = (this.ESTADOS_VISITA_EDITABLES as string[]).includes(v.Estado)
      ? (v.Estado as EstadoVisitaEditable)
      : 'Pendiente';
    this.notasEstadoVisita   = '';
    this.errorEstadoVisita   = '';
    this.intentoEstadoVisita = false;
    this.mostrarModalEstadoVisita = true;
  }

  cerrarCambiarEstadoVisita(): void {
    this.mostrarModalEstadoVisita = false;
    this.visitaParaEstado         = null;
  }

  guardarCambiarEstadoVisita(): void {
    this.intentoEstadoVisita = true;
    if (!this.notasEstadoVisita.trim() || !this.visitaParaEstado || this.cambiandoEstadoVisita) return;

    this.cambiandoEstadoVisita = true;
    this.errorEstadoVisita     = '';

    const dto: CambiarEstadoVisitaDto = {
      estado: this.nuevoEstadoVisita,
      notas:  this.notasEstadoVisita.trim()
    };

    this.svc.cambiarEstadoVisita(this.visitaParaEstado.ID, dto).subscribe({
      next: () => {
        this.cambiandoEstadoVisita = false;
        this.cerrarCambiarEstadoVisita();
        this.refrescarPorGestionar();
      },
      error: (err: any) => {
        this.cambiandoEstadoVisita = false;
        this.errorEstadoVisita     = err?.error?.error || 'Error al cambiar el estado de la visita.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  CAMBIO DE ESTADO INLINE (PROSPECTOS)
  // ════════════════════════════════════════════════════════════════════

  cambiarEstadoProspecto(p: Prospecto, nuevoEstado: string): void {
    if (nuevoEstado === p.Estado || this.actualizandoEstadoId === p.ID) return;

    this.actualizandoEstadoId  = p.ID;
    this.errorActualizarEstado = '';

    this.svc.cambiarEstadoProspecto(p.ID, nuevoEstado as EstadoProspectoEditable).subscribe({
      next: () => {
        this.actualizandoEstadoId = null;
        this.refrescarProspectos();
      },
      error: (err: any) => {
        this.actualizandoEstadoId  = null;
        this.errorActualizarEstado = err?.error?.error || 'Error al cambiar el estado del prospecto.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  BÚSQUEDA (backend, sin límite de 14 días) Y PAGINACIÓN
  // ════════════════════════════════════════════════════════════════════

  onBuscarPendientesInput(): void {
    this.paginaPendientes = 1;
    this.busquedaPendientes$.next(this.busquedaPendientes);
  }

  onBuscarEnGestionInput(): void {
    this.paginaEnGestion = 1;
    this.busquedaEnGestion$.next(this.busquedaEnGestion);
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
        this.errorPendientes    = err?.error?.error || 'Error al buscar prospectos.';
      }
    });
  }

  private ejecutarBusquedaEnGestion(q: string): void {
    const query = q.trim();
    if (!query) {
      this.resultadosBusquedaEnGestion = null;
      this.buscandoEnGestion           = false;
      return;
    }
    this.buscandoEnGestion = true;
    this.svc.buscarEnGestion(query).subscribe({
      next: data => {
        this.resultadosBusquedaEnGestion = data;
        this.buscandoEnGestion           = false;
      },
      error: (err: any) => {
        this.buscandoEnGestion = false;
        this.errorEnGestion    = err?.error?.error || 'Error al buscar prospectos.';
      }
    });
  }

  // Refresca las colas base y, si hay una búsqueda activa, también sus resultados
  private refrescarProspectos(): void {
    this.cargarPendientes();
    this.cargarEnGestion();
    if (this.busquedaPendientes.trim()) this.ejecutarBusquedaPendientes(this.busquedaPendientes);
    if (this.busquedaEnGestion.trim())  this.ejecutarBusquedaEnGestion(this.busquedaEnGestion);
  }

  get pendientesFiltrados(): Prospecto[] { return this.resultadosBusquedaPendientes ?? this.pendientes; }
  get enGestionFiltrados(): Prospecto[]  { return this.resultadosBusquedaEnGestion  ?? this.enGestion; }

  get pendientesPaginados(): Prospecto[] {
    const inicio = (this.paginaPendientes - 1) * this.itemsPorPagina;
    return this.pendientesFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginasPendientes(): number {
    return Math.ceil(this.pendientesFiltrados.length / this.itemsPorPagina);
  }

  get enGestionPaginados(): Prospecto[] {
    const inicio = (this.paginaEnGestion - 1) * this.itemsPorPagina;
    return this.enGestionFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginasEnGestion(): number {
    return Math.ceil(this.enGestionFiltrados.length / this.itemsPorPagina);
  }

  onBuscarVisitadasInput(): void {
    this.paginaVisitadas = 1;
    this.busquedaVisitadas$.next(this.busquedaVisitadas);
  }

  onBuscarPorGestionarInput(): void {
    this.paginaPorGestionar = 1;
    this.busquedaPorGestionar$.next(this.busquedaPorGestionar);
  }

  onBuscarFallidasInput(): void {
    this.paginaFallidas = 1;
    this.busquedaFallidas$.next(this.busquedaFallidas);
  }

  private ejecutarBusquedaVisitadas(q: string): void {
    const query = q.trim();
    if (!query) {
      this.resultadosBusquedaVisitadas = null;
      this.buscandoVisitadas           = false;
      return;
    }
    this.buscandoVisitadas = true;
    this.svc.buscarVisitasSemanaVisitadas(query).subscribe({
      next: data => {
        this.resultadosBusquedaVisitadas = data;
        this.buscandoVisitadas           = false;
      },
      error: (err: any) => {
        this.buscandoVisitadas = false;
        this.errorVisitadas    = err?.error?.error || 'Error al buscar visitas.';
      }
    });
  }

  private ejecutarBusquedaPorGestionar(q: string): void {
    const query = q.trim();
    if (!query) {
      this.resultadosBusquedaPorGestionar = null;
      this.buscandoPorGestionar           = false;
      return;
    }
    this.buscandoPorGestionar = true;
    this.svc.buscarVisitasSemanaPorGestionar(query).subscribe({
      next: data => {
        this.resultadosBusquedaPorGestionar = data;
        this.buscandoPorGestionar           = false;
      },
      error: (err: any) => {
        this.buscandoPorGestionar = false;
        this.errorPorGestionar    = err?.error?.error || 'Error al buscar visitas.';
      }
    });
  }

  private ejecutarBusquedaFallidas(q: string): void {
    const query = q.trim();
    if (!query) {
      this.resultadosBusquedaFallidas = null;
      this.buscandoFallidas           = false;
      return;
    }
    this.buscandoFallidas = true;
    this.svc.buscarVisitasFallidas(query).subscribe({
      next: data => {
        this.resultadosBusquedaFallidas = data;
        this.buscandoFallidas           = false;
      },
      error: (err: any) => {
        this.buscandoFallidas = false;
        this.errorFallidas    = err?.error?.error || 'Error al buscar visitas fallidas.';
      }
    });
  }

  // Refresca "por gestionar" y, si hay una búsqueda activa, también sus resultados
  private refrescarPorGestionar(): void {
    this.cargarPorGestionar();
    if (this.busquedaPorGestionar.trim()) this.ejecutarBusquedaPorGestionar(this.busquedaPorGestionar);
  }

  // Refresca fallidas + su KPI y, si hay una búsqueda activa, también sus resultados
  private refrescarFallidas(): void {
    this.cargarFallidas();
    this.cargarKpiFallidas();
    if (this.busquedaFallidas.trim()) this.ejecutarBusquedaFallidas(this.busquedaFallidas);
  }

  get visitadasFiltradas(): VisitaAgendada[]    { return this.resultadosBusquedaVisitadas    ?? this.visitadas; }
  get porGestionarFiltradas(): VisitaAgendada[] { return this.resultadosBusquedaPorGestionar ?? this.porGestionar; }
  get fallidasFiltradas(): VisitaAgendada[]     { return this.resultadosBusquedaFallidas     ?? this.fallidas; }

  get visitadasPaginadas(): VisitaAgendada[] {
    const inicio = (this.paginaVisitadas - 1) * this.itemsPorPagina;
    return this.visitadasFiltradas.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginasVisitadas(): number {
    return Math.ceil(this.visitadasFiltradas.length / this.itemsPorPagina);
  }

  get porGestionarPaginadas(): VisitaAgendada[] {
    const inicio = (this.paginaPorGestionar - 1) * this.itemsPorPagina;
    return this.porGestionarFiltradas.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginasPorGestionar(): number {
    return Math.ceil(this.porGestionarFiltradas.length / this.itemsPorPagina);
  }

  get fallidasPaginadas(): VisitaAgendada[] {
    const inicio = (this.paginaFallidas - 1) * this.itemsPorPagina;
    return this.fallidasFiltradas.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginasFallidas(): number {
    return Math.ceil(this.fallidasFiltradas.length / this.itemsPorPagina);
  }

  // ════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════════════

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente':   'estado-pendiente',
      'No responde': 'estado-no-responde',
      'Contactado':  'estado-contactado',
      'Agendado':    'estado-agendado'
    };
    return map[estado] ?? 'estado-default';
  }

  getEstadoVisitaClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente':    'estado-pendiente',
      'Visitado':     'estado-visitado',
      'Rechaza':      'estado-rechaza',
      'No contesta':  'estado-no-contesta',
      'Re agendada':  'estado-reagendada',
      'Cancelada':    'estado-cancelada'
    };
    return map[estado] ?? 'estado-default';
  }

  formatearFechaVisita(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  formatearRelativo(fecha: string): string {
    if (!fecha) return '—';
    const diffMs  = Date.now() - new Date(fecha).getTime();
    const minutos = Math.floor(diffMs / 60000);
    if (minutos < 1)  return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24)   return `Hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias === 1)   return 'Ayer';
    return `Hace ${dias} días`;
  }

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
  }

  getPrimeraLetra(nombre: string): string {
    return nombre?.[0]?.toUpperCase() ?? 'A';
  }
}
