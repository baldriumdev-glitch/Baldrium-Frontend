import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, RolUsuario } from '../services/auth.service';


export const roleGuard: CanActivateFn = (route) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const rolesPermitidos = (route.data?.['roles'] ?? []) as RolUsuario[];


  if (rolesPermitidos.length === 0) return true;

  if (auth.tieneRol(...rolesPermitidos)) return true;


  router.navigate(['/dashboard']);
  return false;
};