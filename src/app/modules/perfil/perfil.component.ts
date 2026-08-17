import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfilService, PerfilData } from './perfil.service';
import { AuthService } from '../../core/services/auth.service';

// Deben reflejar exactamente las reglas del backend (validacionesTrabajador.js)
// para que el formulario nunca deje pasar algo que el API va a rechazar.
const REGEX_NOMBRE       = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü\s'.-]+$/;
const REGEX_SOLO_DIGITOS = /^\d+$/;

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
    const nombre    = this.editNombre.trim();
    const celular   = this.editCelular.trim();
    const telefono  = this.editTelefono.trim();
    const correo    = this.editCorreo.trim();
    const direccion = this.editDireccion.trim();

    if (!nombre || !celular || !correo || !direccion) {
      this.statusInfo  = 'err';
      this.mensajeInfo = 'Nombre, celular, correo y dirección son obligatorios.';
      return;
    }
    if (nombre.length < 3 || nombre.length > 100) {
      this.statusInfo  = 'err';
      this.mensajeInfo = 'El nombre debe tener entre 3 y 100 caracteres.';
      return;
    }
    if (!REGEX_NOMBRE.test(nombre)) {
      this.statusInfo  = 'err';
      this.mensajeInfo = 'El nombre solo puede contener letras y espacios.';
      return;
    }
    if (!REGEX_SOLO_DIGITOS.test(celular) || celular.length < 7 || celular.length > 15) {
      this.statusInfo  = 'err';
      this.mensajeInfo = 'El celular debe tener entre 7 y 15 dígitos, solo números.';
      return;
    }
    if (telefono && (!REGEX_SOLO_DIGITOS.test(telefono) || telefono.length > 15)) {
      this.statusInfo  = 'err';
      this.mensajeInfo = 'El teléfono solo puede contener números (máximo 15 dígitos).';
      return;
    }
    if (correo.length > 100) {
      this.statusInfo  = 'err';
      this.mensajeInfo = 'El correo no puede superar los 100 caracteres.';
      return;
    }
    if (direccion.length > 200) {
      this.statusInfo  = 'err';
      this.mensajeInfo = 'La dirección no puede superar los 200 caracteres.';
      return;
    }

    this.guardandoInfo = true;
    this.statusInfo    = 'idle';

    this.svc.actualizar({
      Nombre:            nombre,
      Celular:           celular,
      Telefono:          telefono || null,
      CorreoElectronico: correo,
      Direccion:         direccion
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

  // Bloquea cualquier tecla que no sea un dígito en Celular/Teléfono, para no
  // depender solo de la validación al guardar (evita el Error 500 de MySQL
  // por letras en una columna numérica).
  soloNumeros(event: KeyboardEvent): void {
    const permitidas = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'];
    if (permitidas.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^[0-9]$/.test(event.key)) event.preventDefault();
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