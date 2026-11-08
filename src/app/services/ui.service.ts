import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController, ToastOptions } from '@ionic/angular';
import { StorageService } from './storage.service';

/**
 * Centraliza los avisos y diálogos de la app (toasts y alertas).
 *
 * Antes cada página creaba los suyos y el mismo AlertController.create con el título
 * "Borrar historial" estaba copiado en Historial y en Ajustes. Aquí queda una sola versión,
 * con el mismo estilo (`cssClass: 'oido-alert'`) y los mismos textos en toda la app.
 */
@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly store = inject(StorageService);

  /** Pide confirmación y borra todo el historial. La usan Historial y Ajustes. */
  async confirmClearHistory(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Borrar historial',
      cssClass: 'oido-alert',
      message: '¿Seguro que quieres borrar todas las sesiones registradas?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Borrar', role: 'destructive', handler: () => this.store.clearSessions() }
      ]
    });
    await alert.present();
  }

  /** Aviso breve en pantalla (2 s y arriba por defecto). */
  async toast(
    message: string,
    duration = 2000,
    position: ToastOptions['position'] = 'top'
  ): Promise<void> {
    const toast = await this.toastController.create({ message, duration, position });
    await toast.present();
  }

  /** Alerta informativa con un único botón «Entendido». */
  async alert(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header,
      message,
      cssClass: 'oido-alert',
      buttons: ['Entendido']
    });
    await alert.present();
  }

  /**
   * Confirmación de «Cerrar sesión». Devuelve true solo si el usuario confirma.
   * La página sigue siendo dueña de la lógica (detener el audio, borrar datos y navegar),
   * así este servicio no depende del router ni del motor de audio.
   */
  async confirmLogout(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Cerrar sesión',
      cssClass: 'oido-alert',
      message: 'Se borrarán tu perfil y tu historial y volverás a la pantalla inicial. ¿Continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cerrar sesión', role: 'destructive' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }
}
