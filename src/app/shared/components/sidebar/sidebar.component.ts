import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';

export interface NavItem {
  label: string;
  ruta:  string;
  icono: string;
  roles: string[];
}

// IMPORTANTE: estos roles deben coincidir EXACTAMENTE con los que exige
// cada ruta en el backend (ver verificarRol(...) en logica/src/rutas/**).
// Si un rol aparece aquí pero no en el backend (o viceversa), el usuario
// verá una pestaña que al abrirla le devuelve 403 sin datos.
//
// Mapeo verificado contra el backend (logica/src/app.js + rutas/**):
//   /api/Usuario      → verificarRol('Director')
//   /api/Inventario   → verificarRol('Coordinador')
//   /api/telemercadeo → verificarRol('Asesor comercial')   (cubre /clientes y /compras)
//
// Telemercadeo y Beneficios todavía son páginas "en construcción" sin
// backend propio (no hacen ninguna llamada HTTP aún), así que por ahora
// no producen 403 sin importar el rol. Cuando se implementen sus rutas
// reales en el backend, actualizar esta lista para que coincida.
const NAV_ITEMS: NavItem[] = [
  { label: 'Usuarios',     ruta: '/usuarios',     icono: 'users',     roles: ['Director'] },
  { label: 'Visitas',      ruta: '/clientes',     icono: 'clientes',  roles: ['Asesor comercial'] },
  { label: 'Inventario',   ruta: '/inventario',   icono: 'inventory', roles: ['Coordinador'] },
  { label: 'Compras',      ruta: '/compras',      icono: 'compras',   roles: ['Asesor comercial'] },
  { label: 'Telemercadeo', ruta: '/telemercadeo', icono: 'phone',     roles: ['Coordinador','Auxiliar Administrativo','Asesor comercial','Telemercaderista'] },
  { label: 'Beneficios',   ruta: '/beneficios',   icono: 'gift',      roles: ['Coordinador','Auxiliar Administrativo','Asesor comercial'] },
  // 'Reporte' se quita del menú: la ruta /reporte no existe aún en app.routes.ts
  // ni tiene backend implementado. Volver a agregarla cuando exista.
];

@Component({
  selector:    'app-sidebar',
  standalone:  true,
  imports:     [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls:   ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {

  @Input()  collapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() closeMobile   = new EventEmitter<void>();

  private auth     = inject(AuthService);
  private router   = inject(Router);

  // Signal reactivo — el HTML usa usuario() con paréntesis
  readonly usuario = toSignal(this.auth.usuario$);

  itemsVisibles: NavItem[] = [];
  rutaActual = '';

  private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.filtrarItems();

  this.auth.usuario$
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => this.filtrarItems());

  this.router.events
    .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this.destroy$))
    .subscribe((e: any) => { this.rutaActual = e.urlAfterRedirects; });

  this.rutaActual = this.router.url;
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private filtrarItems(): void {
    const roles = this.auth.getRoles();
    this.itemsVisibles = NAV_ITEMS.filter(item =>
      item.roles.some(r => roles.includes(r as any))
    );
  }

  esActivo(ruta: string): boolean { return this.rutaActual.startsWith(ruta); }

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
  }

  getPrimeraLetra(nombre: string): string {
    if (!nombre) return 'A';
    return nombre[0].toUpperCase();
  }

  getRolPrincipal(): string { return this.auth.getRoles()[0] ?? ''; }
  irAPerfil(): void { this.router.navigate(['/perfil']); this.closeMobile.emit(); }
  cerrarSesion(): void { this.auth.logout(); }
  onNavClick(): void { this.closeMobile.emit(); }
}