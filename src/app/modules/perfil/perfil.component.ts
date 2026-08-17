import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfilService, PerfilData } from './perfil.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector:    'app-perfil',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrls:   ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit {

  perfil:   PerfilData | null = null;
  cargando  = true;

  editNombre    = '';
  editCelular   = '';
  editTelefono  = '';
  editCorreo    = '';
  editDireccion = '';

  guardandoInfo               = false;
  statusInfo: 'idle' | 'ok' | 'err' = 'idle';
  mensajeInfo                 = '';

  passActual    = '';
  passNueva     = '';
  passConfirmar = '';
  mostrarActual  = false;
  mostrarNueva   = false;
  mostrarConfirm = false;

  guardandoPass               = false;
  statusPass: 'idle' | 'ok' | 'err' = 'idle';
  mensajePass                 = '';

  constructor(private svc: PerfilService, private auth: AuthService) {}

  ngOnInit(): void { this.cargar(); }

  get debeCambiarContrasena(): boolean {
    return !!this.auth.getUsuarioActual()?.debeCambiarContrasena;
  }

  cargar(): void {
    this.cargando = true;
    this.svc.obtener().subscribe({
      next: d => {
        this.perfil        = d;
        this.editNombre    = String(d.nombre    ?? '');
        this.editCelular   = String(d.celular   ?? '');
        this.editTelefono  = String(d.telefono  ?? '');
        this.editCorreo    = String(d.correo    ?? '');
        this.editDireccion = String(d.direccion ?? '');
        this.cargando      = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  get hayCambios(): boolean {
    if (!this.perfil) return false;
    return (
      this.editNombre    !== String(this.perfil.nombre    ?? '') ||
      this.editCelular   !== String(this.perfil.celular   ?? '') ||
      this.editTelefono  !== String(this.perfil.telefono  ?? '') ||
      this.editCorreo    !== String(this.perfil.correo    ?? '') ||
      this.editDireccion !== String(this.perfil.direccion ?? '')
    );
  }

  guardarInfo(): void {
    if (!this.editNombre.trim() || !this.editCelular.trim() ||
        !this.editCorreo.trim() || !this.editDireccion.trim()) {
      this.statusInfo  = 'err';
      this.mensajeInfo = 'Nombre, celular, correo y dirección son obligatorios.';
      return;
    }
    this.guardandoInfo = true;
    this.statusInfo    = 'idle';

    this.svc.actualizar({
      Nombre:            this.editNombre.trim(),
      Celular:           this.editCelular.trim(),
      Telefono:          this.editTelefono.trim() || null,
      CorreoElectronico: this.editCorreo.trim(),
      Direccion:         this.editDireccion.trim()
    }).subscribe({
      next: () => {
        this.guardandoInfo = false;
        this.statusInfo    = 'ok';
        this.mensajeInfo   = 'Información actualizada correctamente.';
        if (this.perfil) {
          this.perfil.nombre    = this.editNombre.trim();
          this.perfil.celular   = this.editCelular.trim();
          this.perfil.telefono  = this.editTelefono.trim() || null;
          this.perfil.correo    = this.editCorreo.trim();
          this.perfil.direccion = this.editDireccion.trim();

          // ── Actualizar usuario en AuthService para reflejar en sidebar ──
          this.auth.actualizarUsuarioLocal({
            nombre:   this.editNombre.trim(),
            celular:  this.editCelular.trim(),
            telefono: this.editTelefono.trim() || '',
            correo:   this.editCorreo.trim(),
            direccion: this.editDireccion.trim()
          });
        }
        setTimeout(() => { this.statusInfo = 'idle'; this.mensajeInfo = ''; }, 4000);
      },
      error: (err: any) => {
        this.guardandoInfo = false;
        this.statusInfo    = 'err';
        this.mensajeInfo   = err?.error?.error || 'Error al guardar los cambios.';
      }
    });
  }

  get passesCoinciden(): boolean {
    return !!this.passNueva && this.passNueva === this.passConfirmar;
  }

  cambiarContrasena(): void {
    this.statusPass  = 'idle';
    this.mensajePass = '';

    if (!this.passActual || !this.passNueva || !this.passConfirmar) {
      this.statusPass  = 'err';
      this.mensajePass = 'Completa los tres campos.';
      return;
    }
    if (!this.passesCoinciden) {
      this.statusPass  = 'err';
      this.mensajePass = 'La nueva contraseña y la confirmación no coinciden.';
      return;
    }
    if (this.passNueva.length < 6) {
      this.statusPass  = 'err';
      this.mensajePass = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.guardandoPass = true;
    this.svc.cambiarContrasena({
      contrasenaActual: this.passActual,
      nuevaContrasena:  this.passNueva
    }).subscribe({
      next: (res) => {
        this.guardandoPass = false;
        this.statusPass    = 'ok';
        this.mensajePass   = 'Contraseña actualizada correctamente.';
        this.passActual = ''; this.passNueva = ''; this.passConfirmar = '';
        // El backend reemite el token sin el flag de cambio obligatorio: hay que
        // guardarlo para que el usuario deje de estar bloqueado sin re-loguear.
        if (res.token) this.auth.actualizarToken(res.token);
        this.auth.actualizarUsuarioLocal({ debeCambiarContrasena: false });
        setTimeout(() => { this.statusPass = 'idle'; this.mensajePass = ''; }, 4000);
      },
      error: (err: any) => {
        this.guardandoPass = false;
        this.statusPass    = 'err';
        this.mensajePass   = err?.error?.error || 'Error al cambiar la contraseña.';
      }
    });
  }

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
  }

  getPrimeraLetra(nombre: string): string {
    return nombre?.[0]?.toUpperCase() ?? 'A';
  }

  getRolClass(rol: string): string {
    const map: Record<string, string> = {
      'Director':                'badge-rol-director',
      'Coordinador':             'badge-rol-coordinador',
      'Asesor comercial':        'badge-rol-asesor',
      'Telemercaderista':        'badge-rol-tele',
      'Auxiliar Administrativo': 'badge-rol-auxiliar',
    };
    return map[rol] ?? 'badge-rol-default';
  }
}