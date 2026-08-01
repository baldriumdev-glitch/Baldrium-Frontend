import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TelemercadeoService, Prospecto, VisitaAgendada } from './telemercadeo.service';

type TabActivo = 'prospectos' | 'visitas';

@Component({
  selector:    'app-telemercadeo',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './telemercadeo.component.html',
  styleUrls:   ['./telemercadeo.component.scss']
})
export class TelemercadeoComponent implements OnInit {

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

  paginaVisitadas    = 1;
  paginaPorGestionar = 1;

  constructor(private svc: TelemercadeoService) {}

  ngOnInit(): void {
    this.cargarPendientes();
    this.cargarEnGestion();
    this.cargarVisitadas();
    this.cargarPorGestionar();
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

  // ════════════════════════════════════════════════════════════════════
  //  BÚSQUEDA Y PAGINACIÓN
  // ════════════════════════════════════════════════════════════════════

  private filtrar(lista: Prospecto[], q: string): Prospecto[] {
    const query = q.toLowerCase().trim();
    if (!query) return lista;
    return lista.filter(p =>
      p.Nombre?.toLowerCase().includes(query) ||
      p.Celular?.toString().includes(query)   ||
      p.Direccion?.toLowerCase().includes(query)
    );
  }

  get pendientesFiltrados(): Prospecto[] { return this.filtrar(this.pendientes, this.busquedaPendientes); }
  get enGestionFiltrados(): Prospecto[]  { return this.filtrar(this.enGestion,  this.busquedaEnGestion); }

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

  private filtrarVisitas(lista: VisitaAgendada[], q: string): VisitaAgendada[] {
    const query = q.toLowerCase().trim();
    if (!query) return lista;
    return lista.filter(v =>
      v.NombrePersona?.toLowerCase().includes(query)   ||
      v.NombreTrabajador?.toLowerCase().includes(query) ||
      v.Celular?.toString().includes(query)             ||
      v.Direccion?.toLowerCase().includes(query)
    );
  }

  get visitadasFiltradas(): VisitaAgendada[]    { return this.filtrarVisitas(this.visitadas,    this.busquedaVisitadas); }
  get porGestionarFiltradas(): VisitaAgendada[] { return this.filtrarVisitas(this.porGestionar, this.busquedaPorGestionar); }

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
      'Re agendada':  'estado-reagendada'
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
