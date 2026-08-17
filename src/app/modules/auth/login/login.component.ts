import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, RolUsuario } from '../../../core/services/auth.service';

// ── Mapa de primera ruta disponible por rol ───────────────────────────
const RUTA_POR_ROL: Record<RolUsuario, string> = {
  'Director':                '/usuarios',
  'Coordinador':             '/inventario',
  'Auxiliar Administrativo': '/telemercadeo',  // pantalla pendiente → redirige a telemercadeo por ahora
  'Asesor comercial':        '/clientes',
  'Telemercaderista':        '/telemercadeo'   // pantalla pendiente → redirige a telemercadeo por ahora
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  form!: FormGroup;
  cargando    = false;
  error       = '';
  mostrarPass = false;

  mostrarModalOlvide  = false;
  correoRecuperacion  = '';
  enviandoCorreo      = false;
  mensajeRecuperacion = '';
  errorRecuperacion   = '';

  constructor(
    private fb:     FormBuilder,
    private auth:   AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.auth.estaAutenticado()) {
      this.router.navigate([this.getRutaInicial()]);
      return;
    }

    this.form = this.fb.group({
      cedula:     ['', [Validators.required]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // ── Primera ruta disponible según rol principal ───────────────────
  private getRutaInicial(): string {
    const roles = this.auth.getRoles();
    for (const rol of roles) {
      if (RUTA_POR_ROL[rol]) return RUTA_POR_ROL[rol];
    }
    return '/dashboard';
  }

  onSubmit(): void {
    if (this.form.invalid || this.cargando) return;

    this.cargando = true;
    this.error    = '';

    this.auth.login(this.form.value).subscribe({
      next: (res) => {
        this.cargando = false;
        // Contraseña temporal (recuperación): debe cambiarla antes de continuar
        const ruta = res.usuario.debeCambiarContrasena ? '/perfil' : this.getRutaInicial();
        this.router.navigate([ruta]);
      },
      error: (err: any) => {
        this.cargando = false;
        this.error =
          err?.error?.error ||
          err?.error?.message ||
          'Credenciales inválidas. Intenta nuevamente.';
      }
    });
  }

  // ── Olvidé contraseña ─────────────────────────────────────────────
  abrirModalOlvide(): void {
    this.mostrarModalOlvide  = true;
    this.correoRecuperacion  = '';
    this.mensajeRecuperacion = '';
    this.errorRecuperacion   = '';
  }

  cerrarModalOlvide(): void { this.mostrarModalOlvide = false; }

  enviarRecuperacion(): void {
    if (!this.correoRecuperacion || !this.correoRecuperacion.includes('@')) {
      this.errorRecuperacion = 'Ingresa un correo electrónico válido.';
      return;
    }

    this.enviandoCorreo      = true;
    this.errorRecuperacion   = '';
    this.mensajeRecuperacion = '';

    this.auth.olvideMiContrasena(this.correoRecuperacion).subscribe({
      next: (res) => {
        this.enviandoCorreo      = false;
        this.mensajeRecuperacion = res.mensaje;
      },
      error: (err: any) => {
        this.enviandoCorreo      = false;
        this.mensajeRecuperacion =
          err?.error?.mensaje ||
          'Si el correo existe en el sistema, recibirás las instrucciones en breve.';
      }
    });
  }

  togglePass(): void { this.mostrarPass = !this.mostrarPass; }

  get cedulaCtrl()     { return this.form.get('cedula')!; }
  get contrasenaCtrl() { return this.form.get('contrasena')!; }
}