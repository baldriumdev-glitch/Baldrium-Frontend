import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const token  = auth.getToken();

  const reqConToken = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(reqConToken).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 = sesión inválida/expirada → cerrar sesión.
      if (error.status === 401) {
        auth.logout();
      }

      if (error.status === 403) {
        // Cambio de contraseña temporal pendiente: el backend bloquea todo
        // excepto /perfil hasta que la cambie. Redirigir ahí en vez del
        // 403 genérico, que manda a /dashboard.
        if ((error.error as any)?.codigo === 'CAMBIO_CONTRASENA_REQUERIDO') {
          router.navigate(['/perfil']);
        } else {
          router.navigate(['/dashboard']);
        }
      }
      return throwError(() => error);
    })
  );
};