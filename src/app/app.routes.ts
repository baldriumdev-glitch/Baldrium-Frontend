import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./modules/auth/login/login.component')
        .then(m => m.LoginComponent)
  },
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/layout.component')
        .then(m => m.LayoutComponent),
    children: [

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./modules/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'clientes',
        canActivate: [roleGuard],
        data: { roles: ['Asesor comercial'] },
        loadComponent: () =>
          import('./modules/clientes/clientes.component')
            .then(m => m.ClientesComponent)
      },
      {
  path: 'visitas',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./modules/visitas/visitas.component')
      .then(m => m.VisitasComponent)
},
{
  path: 'compras',
  canActivate: [authGuard, roleGuard],
  data: { roles: ['Asesor comercial'] },
  loadComponent: () =>
    import('./modules/compras/compras.component')
      .then(m => m.ComprasComponent)
},
      {
        path: 'usuarios',
        canActivate: [roleGuard],
        data: { roles: ['Director'] },
        loadComponent: () =>
          import('./modules/usuarios/usuarios.component')
            .then(m => m.UsuariosComponent)
      },
      {
        path: 'inventario',
        canActivate: [roleGuard],
        data: { roles: ['Coordinador'] },
        loadComponent: () =>
          import('./modules/inventario/inventario.component')
            .then(m => m.InventarioComponent)
      },
      {
        path: 'telemercadeo',
        loadComponent: () =>
          import('./modules/telemercadeo/telemercadeo.component')
            .then(m => m.TelemercadeoComponent)
      },
      {
        path: 'beneficios',
        loadComponent: () =>
          import('./modules/beneficios/beneficios.component')
            .then(m => m.BeneficiosComponent)
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./modules/perfil/perfil.component')
            .then(m => m.PerfilComponent)
      },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: 'auth/login' }
];