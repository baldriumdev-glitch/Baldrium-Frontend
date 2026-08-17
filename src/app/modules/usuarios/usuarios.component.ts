import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormsModule,
  FormBuilder, FormGroup, Validators
} from '@angular/forms';
import {
  UsuariosService, Trabajador, Rol,
  CrearTrabajadorDto, ActualizarTrabajadorDto,
  ParametrosBeneficio
} from './usuarios.service';

type ModalMode = 'crear' | 'editar' | null;
type TabActivo = 'usuarios' | 'auditoria' | 'parametros';

// Deben reflejar exactamente las reglas del backend (usuarioServicio.js)
// para que el formulario nunca deje pasar algo que el API va a rechazar.
const REGEX_NOMBRE        = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü\s'.-]+$/;
const REGEX_SOLO_DIGITOS  = /^\d+$/;
const REGEX_DIGITOS_OPC   = /^\d*$/;

@Component({
  selector:    'app-usuarios',
  standalone:  true,
  imports:     [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls:   ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit {

  // ── Datos ──────────────────────────────────────────────────────────
  trabajadores:          Trabajador[] = [];
  trabajadoresFiltrados: Trabajador[] = [];
  roles:                 Rol[]        = [];
  auditoria:             any[]        = [];

  // ── Estados de carga ───────────────────────────────────────────────
  cargando      = true;
  cargandoModal = false;

  // ── Mensajes de error ──────────────────────────────────────────────
  error      = '';
  errorModal = '';

  // ── Paginación tabla usuarios ──────────────────────────────────────
  paginaActual   = 1;
  itemsPorPagina = 8;

  // ── Paginación tabla auditoría ─────────────────────────────────────
  paginaAuditoria   = 1;
  itemsAuditoriaPag = 15;

  // ── Búsqueda y filtros ─────────────────────────────────────────────
  busqueda       = '';
  busquedaAuditoria = '';
  mostrarFiltros = false;
  filtroRol      = '';
  filtroEstado   = '';
  filtroOrden    = '';

  // ── Filtros auditoría ──────────────────────────────────────────────
  mostrarFiltrosAuditoria = false;
  filtroAudAccion         = '';
  filtroAudResultado      = '';
  filtroAudFechaDesde     = '';
  filtroAudFechaHasta     = '';

  // ── Descripciones expandidas (auditoría) ────────────────────────────
  descripcionesExpandidas = new Set<number>();

  // ── Tab ───────────────────────────────────────────────────────────
  tabActivo: TabActivo = 'usuarios';

  // ── Parámetros de beneficios ─────────────────────────────────────
  parametrosBeneficio:     ParametrosBeneficio | null = null;
  cargandoParametros       = true;
  errorParametros          = '';

  paramValorMinimoCompra         = 0;
  paramMinimoReferidos           = 0;
  paramValorMinimoCompraReferido = 0;

  guardandoParametros      = false;
  errorGuardarParametros   = '';
  exitoGuardarParametros   = false;

  // ── Modal crear/editar ─────────────────────────────────────────────
  modalMode:               ModalMode    = null;
  trabajadorSeleccionado:  Trabajador | null = null;
  rolesSeleccionados:      number[]     = [];
  form!:                   FormGroup;
  mostrarConfirmDesactivar = false;

  constructor(
    private svc: UsuariosService,
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
        this.trabajadores          = data;
        this.trabajadoresFiltrados = data;
        this.cargando              = false;
      },
      error: () => {
        this.error    = 'Error al cargar usuarios.';
        this.cargando = false;
      }
    });

    this.svc.listarRoles().subscribe({
      next: (r) => this.roles = r
    });

    this.svc.listarAuditoria().subscribe({
      next:  (a) => this.auditoria = a,
      error: ()  => {}
    });

    this.cargarParametrosBeneficio();
  }

  cargarParametrosBeneficio(): void {
    this.cargandoParametros = true;
    this.errorParametros    = '';
    this.svc.obtenerParametrosBeneficio().subscribe({
      next: p => {
        this.parametrosBeneficio            = p;
        this.paramValorMinimoCompra         = Number(p.ValorMinimoCompra);
        this.paramMinimoReferidos           = p.MinimoReferidosVisitados;
        this.paramValorMinimoCompraReferido = Number(p.ValorMinimoCompraReferido);
        this.cargandoParametros             = false;
      },
      error: (err: any) => {
        this.cargandoParametros = false;
        this.errorParametros    = err?.error?.error || 'Error al cargar los parámetros de beneficios.';
      }
    });
  }

  guardarParametrosBeneficio(): void {
    if (this.guardandoParametros) return;
    this.guardandoParametros    = true;
    this.errorGuardarParametros = '';
    this.exitoGuardarParametros = false;

    this.svc.actualizarParametrosBeneficio({
      valorMinimoCompra:         this.paramValorMinimoCompra,
      minimoReferidosVisitados:  this.paramMinimoReferidos,
      valorMinimoCompraReferido: this.paramValorMinimoCompraReferido
    }).subscribe({
      next: () => {
        this.guardandoParametros    = false;
        this.exitoGuardarParametros = true;
        this.cargarParametrosBeneficio();
      },
      error: (err: any) => {
        this.guardandoParametros    = false;
        this.errorGuardarParametros = err?.error?.error || 'Error al guardar los parámetros.';
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  TAB
  // ════════════════════════════════════════════════════════════════════

  cambiarTab(tab: TabActivo): void {
    this.tabActivo = tab;
  }

  // ════════════════════════════════════════════════════════════════════
  //  PAGINACIÓN — USUARIOS
  // ════════════════════════════════════════════════════════════════════

  get paginados(): Trabajador[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.trabajadoresFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.trabajadoresFiltrados.length / this.itemsPorPagina);
  }

  paginaAnterior(): void {
    if (this.paginaActual > 1) this.paginaActual--;
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) this.paginaActual++;
  }

  // ════════════════════════════════════════════════════════════════════
  //  PAGINACIÓN — AUDITORÍA
  // ════════════════════════════════════════════════════════════════════

  get auditoriaFiltrada(): any[] {
    let resultado = [...this.auditoria];

    const q = this.busquedaAuditoria.toLowerCase().trim();
    if (q) {
      resultado = resultado.filter(a =>
        a.NombreTrabajador?.toLowerCase().includes(q) ||
        a.TipoAccion?.toLowerCase().includes(q)       ||
        a.Descripcion?.toLowerCase().includes(q)      ||
        a.Resultado?.toLowerCase().includes(q)
      );
    }

    if (this.filtroAudAccion) {
      resultado = resultado.filter(a => a.TipoAccion === this.filtroAudAccion);
    }

    if (this.filtroAudResultado) {
      resultado = resultado.filter(a => a.Resultado === this.filtroAudResultado);
    }

    if (this.filtroAudFechaDesde) {
      const desde = new Date(this.filtroAudFechaDesde).getTime();
      resultado = resultado.filter(a =>
        new Date(a.FechaHora).getTime() >= desde
      );
    }

    if (this.filtroAudFechaHasta) {
      const hasta = new Date(this.filtroAudFechaHasta + 'T23:59:59').getTime();
      resultado = resultado.filter(a =>
        new Date(a.FechaHora).getTime() <= hasta
      );
    }

    return resultado;
  }

  get filtrosAuditoriaActivos(): number {
    return [
      this.filtroAudAccion,
      this.filtroAudResultado,
      this.filtroAudFechaDesde,
      this.filtroAudFechaHasta
    ].filter(f => f !== '').length;
  }

  get auditoriaPaginada(): any[] {
    const inicio = (this.paginaAuditoria - 1) * this.itemsAuditoriaPag;
    return this.auditoriaFiltrada.slice(inicio, inicio + this.itemsAuditoriaPag);
  }

  get totalPaginasAuditoria(): number {
    return Math.ceil(this.auditoriaFiltrada.length / this.itemsAuditoriaPag);
  }

  // ════════════════════════════════════════════════════════════════════
  //  BÚSQUEDA Y FILTROS
  // ════════════════════════════════════════════════════════════════════

  onBuscar(): void {
    this.aplicarFiltros();
  }

  toggleFiltros(): void {
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  get filtrosActivos(): number {
    return [this.filtroRol, this.filtroEstado, this.filtroOrden]
      .filter(f => f !== '').length;
  }

  aplicarFiltros(): void {
    let resultado = [...this.trabajadores];

    const q = this.busqueda.toLowerCase().trim();
    if (q) {
      resultado = resultado.filter(t =>
        t.nombre.toLowerCase().includes(q) ||
        t.cedula.includes(q)               ||
        t.correo.toLowerCase().includes(q)
      );
    }

    if (this.filtroRol) {
      resultado = resultado.filter(t =>
        t.roles.some(r => r.nombre === this.filtroRol)
      );
    }

    if (this.filtroEstado) {
      resultado = resultado.filter(t =>
        this.filtroEstado === 'activo' ? t.activo : !t.activo
      );
    }

    if (this.filtroOrden === 'nombre-asc') {
      resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (this.filtroOrden === 'nombre-desc') {
      resultado.sort((a, b) => b.nombre.localeCompare(a.nombre));
    }

    this.trabajadoresFiltrados = resultado;
    this.paginaActual          = 1;
  }

  limpiarFiltros(): void {
    this.filtroRol    = '';
    this.filtroEstado = '';
    this.filtroOrden  = '';
    this.busqueda     = '';
    this.aplicarFiltros();
  }

  toggleFiltrosAuditoria(): void {
    this.mostrarFiltrosAuditoria = !this.mostrarFiltrosAuditoria;
  }

  limpiarFiltrosAuditoria(): void {
    this.filtroAudAccion     = '';
    this.filtroAudResultado  = '';
    this.filtroAudFechaDesde = '';
    this.filtroAudFechaHasta = '';
    this.busquedaAuditoria   = '';
    this.paginaAuditoria     = 1;
  }

  // ════════════════════════════════════════════════════════════════════
  //  MODAL CREAR / EDITAR
  // ════════════════════════════════════════════════════════════════════

  abrirCrear(): void {
    this.modalMode               = 'crear';
    this.trabajadorSeleccionado  = null;
    this.rolesSeleccionados      = [];
    this.errorModal              = '';
    this.mostrarConfirmDesactivar = false;
    this.form = this.fb.group({
      nombre:            ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(REGEX_NOMBRE)]],
      cedula:            ['', [Validators.required, Validators.pattern(REGEX_SOLO_DIGITOS), Validators.minLength(6), Validators.maxLength(15)]],
      correoElectronico: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      celular:           ['', [Validators.required, Validators.pattern(REGEX_SOLO_DIGITOS), Validators.minLength(7), Validators.maxLength(15)]],
      telefono:          ['', [Validators.pattern(REGEX_DIGITOS_OPC), Validators.maxLength(15)]],
      codigoTrabajador:  ['', [Validators.required, Validators.maxLength(50)]],
      direccion:         ['', [Validators.required, Validators.maxLength(200)]],
      contrasena:        ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  abrirEditar(t: Trabajador): void {
    this.modalMode               = 'editar';
    this.trabajadorSeleccionado  = t;
    this.rolesSeleccionados      = t.roles.map(r => r.id);
    this.errorModal              = '';
    this.mostrarConfirmDesactivar = false;
    this.form = this.fb.group({
      nombre:            [t.nombre,  [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(REGEX_NOMBRE)]],
      cedula:            [{ value: t.cedula, disabled: true }],
      correoElectronico: [t.correo,  [Validators.required, Validators.email, Validators.maxLength(100)]],
      celular:           [t.celular, [Validators.required, Validators.pattern(REGEX_SOLO_DIGITOS), Validators.minLength(7), Validators.maxLength(15)]],
      telefono:          [t.telefono, [Validators.pattern(REGEX_DIGITOS_OPC), Validators.maxLength(15)]],
      codigoTrabajador:  [t.codigoTrabajador, Validators.maxLength(50)],
      direccion:         [t.direccion, Validators.maxLength(200)]
    });
  }

  cerrarModal(): void {
    this.modalMode                = null;
    this.mostrarConfirmDesactivar = false;
    this.errorModal               = '';
  }

  toggleRol(rolId: number): void {
    const idx = this.rolesSeleccionados.indexOf(rolId);
    if (idx > -1) this.rolesSeleccionados.splice(idx, 1);
    else          this.rolesSeleccionados.push(rolId);
  }

  rolSeleccionado(rolId: number): boolean {
    return this.rolesSeleccionados.includes(rolId);
  }

  // Bloquea cualquier tecla que no sea un dígito en Cédula/Celular/Teléfono,
  // para no depender solo de la validación al guardar (evita el Error 500
  // de MySQL por letras en una columna numérica).
  soloNumeros(event: KeyboardEvent): void {
    const permitidas = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'];
    if (permitidas.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^[0-9]$/.test(event.key)) event.preventDefault();
  }

  // ── Mensajes de error específicos por campo (formulario crear/editar) ──
  get errorNombre(): string {
    const c = this.form.get('nombre');
    if (!c || !c.touched || !c.errors) return '';
    if (c.errors['required'])  return 'El nombre es obligatorio.';
    if (c.errors['minlength']) return 'El nombre debe tener al menos 3 caracteres.';
    if (c.errors['maxlength']) return 'El nombre no puede superar los 100 caracteres.';
    if (c.errors['pattern'])   return 'El nombre solo puede contener letras y espacios.';
    return '';
  }

  get errorCedula(): string {
    const c = this.form.get('cedula');
    if (!c || !c.touched || !c.errors) return '';
    if (c.errors['required']) return 'La cédula es obligatoria.';
    if (c.errors['pattern'])  return 'La cédula solo puede contener números.';
    if (c.errors['minlength'] || c.errors['maxlength']) return 'La cédula debe tener entre 6 y 15 dígitos.';
    return '';
  }

  get errorCorreo(): string {
    const c = this.form.get('correoElectronico');
    if (!c || !c.touched || !c.errors) return '';
    if (c.errors['required'])  return 'El correo es obligatorio.';
    if (c.errors['email'])     return 'Ingresa un correo electrónico válido.';
    if (c.errors['maxlength']) return 'El correo no puede superar los 100 caracteres.';
    return '';
  }

  get errorCelular(): string {
    const c = this.form.get('celular');
    if (!c || !c.touched || !c.errors) return '';
    if (c.errors['required']) return 'El celular es obligatorio.';
    if (c.errors['pattern'])  return 'El celular solo puede contener números.';
    if (c.errors['minlength'] || c.errors['maxlength']) return 'El celular debe tener entre 7 y 15 dígitos.';
    return '';
  }

  get errorTelefono(): string {
    const c = this.form.get('telefono');
    if (!c || !c.touched || !c.errors) return '';
    if (c.errors['pattern'])   return 'El teléfono solo puede contener números.';
    if (c.errors['maxlength']) return 'El teléfono no puede superar los 15 dígitos.';
    return '';
  }

  get errorDireccion(): string {
    const c = this.form.get('direccion');
    if (!c || !c.touched || !c.errors) return '';
    if (c.errors['required'])  return 'La dirección es obligatoria.';
    if (c.errors['maxlength']) return 'La dirección no puede superar los 200 caracteres.';
    return '';
  }

  get errorCodigoTrabajador(): string {
    const c = this.form.get('codigoTrabajador');
    if (!c || !c.touched || !c.errors) return '';
    if (c.errors['required'])  return 'El código de trabajador es obligatorio.';
    if (c.errors['maxlength']) return 'El código de trabajador no puede superar los 50 caracteres.';
    return '';
  }

  guardar(): void {
    if (this.form.invalid || this.cargandoModal) return;
    if (this.rolesSeleccionados.length === 0) {
      this.errorModal = 'Selecciona al menos un rol.';
      return;
    }

    this.cargandoModal = true;
    this.errorModal    = '';

    if (this.modalMode === 'crear') {
      const dto: CrearTrabajadorDto = {
        ...this.form.getRawValue(),
        roles: this.rolesSeleccionados
      };
      this.svc.crear(dto).subscribe({
        next: () => {
          this.cargandoModal = false;
          this.cerrarModal();
          this.cargarDatos();
        },
        error: (err: any) => {
          this.cargandoModal = false;
          this.errorModal    = err?.error?.error || 'Error al crear usuario.';
        }
      });

    } else if (this.modalMode === 'editar' && this.trabajadorSeleccionado) {
      const dto: ActualizarTrabajadorDto = {
        ...this.form.getRawValue(),
        roles: this.rolesSeleccionados
      };
      this.svc.actualizar(this.trabajadorSeleccionado.cedula, dto).subscribe({
        next: () => {
          this.cargandoModal = false;
          this.cerrarModal();
          this.cargarDatos();
        },
        error: (err: any) => {
          this.cargandoModal = false;
          this.errorModal    = err?.error?.error || 'Error al actualizar usuario.';
        }
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  ACTIVAR / DESACTIVAR
  // ════════════════════════════════════════════════════════════════════

  confirmarDesactivar(): void {
    this.mostrarConfirmDesactivar = true;
  }

  ejecutarCambioEstado(): void {
    if (!this.trabajadorSeleccionado) return;
    const nuevoEstado = !this.trabajadorSeleccionado.activo;
    this.svc.cambiarEstado(this.trabajadorSeleccionado.cedula, nuevoEstado).subscribe({
      next: () => {
        this.cerrarModal();
        this.cargarDatos();
      },
      error: (err: any) => {
        this.errorModal = err?.error?.error || 'Error al cambiar estado.';
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
        doc.text('Gestión de Usuarios del Sistema', 14, 28);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 34);

        autoTable.default(doc, {
          head: [['Usuario', 'Cédula', 'Correo', 'Roles', 'Estado']],
          body: this.trabajadores.map(t => [
            t.nombre,
            t.cedula,
            t.correo,
            t.roles.map((r: any) => r.nombre).join(', '),
            t.activo ? 'Activo' : 'Inactivo'
          ]),
          startY:     42,
          theme:      'grid',
          headStyles: { fillColor: [15, 25, 35], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 249, 251] }
        });

        doc.save(`usuarios-baldrium-${new Date().toISOString().slice(0,10)}.pdf`);
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
        doc.text('Historial de Actividad del Sistema', 14, 28);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 34);
        doc.text(`Total registros: ${this.auditoriaFiltrada.length}`, 14, 40);

        autoTable.default(doc, {
          head: [['Fecha y Hora', 'Acción', 'Trabajador', 'Cédula', 'Módulo', 'Resultado', 'Descripción']],
          body: this.auditoriaFiltrada.map(a => [
            this.formatearFecha(a.FechaHora),
            a.TipoAccion,
            a.NombreTrabajador,
            a.CedulaTrabajador,
            a.TablaAfectada || '—',
            a.Resultado,
            a.Descripcion
          ]),
          startY:     48,
          theme:      'grid',
          headStyles: {
            fillColor: [15, 25, 35],
            textColor: 255,
            fontStyle: 'bold',
            fontSize:  8
          },
          bodyStyles:         { fontSize: 7 },
          alternateRowStyles: { fillColor: [248, 249, 251] },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 30 },
            2: { cellWidth: 35 },
            3: { cellWidth: 28 },
            4: { cellWidth: 28 },
            5: { cellWidth: 22 },
            6: { cellWidth: 'auto' }
          }
        });

        doc.save(`auditoria-baldrium-${new Date().toISOString().slice(0,10)}.pdf`);
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════════════

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
  }

  getPrimeraLetra(nombre: string): string {
    if (!nombre) return 'A';
    return nombre[0].toUpperCase();
  }

  getRolClass(nombreRol: string): string {
    const map: Record<string, string> = {
      'Director':                'director',
      'Coordinador':             'coord',
      'Telemercaderista':        'coord',
      'Asesor comercial':        'admin',
      'Auxiliar Administrativo': 'finanzas'
    };
    return map[nombreRol] ?? 'admin';
  }

  toggleDescripcion(id: number): void {
    if (this.descripcionesExpandidas.has(id)) this.descripcionesExpandidas.delete(id);
    else this.descripcionesExpandidas.add(id);
  }

  esDescripcionLarga(texto: string): boolean {
    return (texto?.length ?? 0) > 70;
  }

  formatearFecha(fechaHora: string): string {
    if (!fechaHora) return '—';
    const d = new Date(fechaHora);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getAccionClass(accion: string): string {
    const map: Record<string, string> = {
      'LOGIN':             'accion-login',
      'LOGIN_FALLIDO':     'accion-fallido',
      'CREAR':             'accion-crear',
      'EDITAR':            'accion-editar',
      'ELIMINAR':          'accion-eliminar',
      'CAMBIO_CONTRASENA': 'accion-cambio',
      'ACTIVAR':           'accion-crear',
      'DESACTIVAR':        'accion-eliminar'
    };
    return map[accion] ?? 'accion-default';
  }

  parsearDispositivo(userAgent: string): { navegador: string; os: string } {
    if (!userAgent || userAgent === 'localhost') {
      return { navegador: 'Desconocido', os: 'localhost' };
    }

    let os = 'Desconocido';
    if (userAgent.includes('Windows NT'))  os = 'Windows 10/11';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Android'))os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    else if (userAgent.includes('Linux'))  os = 'Linux';

    let navegador = 'Desconocido';
    if (userAgent.includes('Edg/'))        navegador = 'Edge';
    else if (userAgent.includes('OPR/') || userAgent.includes('Opera')) navegador = 'Opera';
    else if (userAgent.includes('Chrome')) navegador = 'Chrome';
    else if (userAgent.includes('Firefox'))navegador = 'Firefox';
    else if (userAgent.includes('Safari')) navegador = 'Safari';

    return { navegador, os };
  }
}
