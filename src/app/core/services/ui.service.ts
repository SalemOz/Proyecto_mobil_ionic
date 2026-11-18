import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController, ToastOptions } from '@ionic/angular';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly store = inject(StorageService);

  async confirmClearHistory(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Borrar historial',
      cssClass: 'oido-alert',
      message: '¿Seguro que quieres borrar todas las sesiones registradas?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Borrar', role: 'destructive', handler: () => this.store.clearSessions() },
      ],
    });
    await alert.present();
  }

  async toast(
    message: string,
    duration = 2000,
    position: ToastOptions['position'] = 'top',
  ): Promise<void> {
    const toast = await this.toastController.create({ message, duration, position });
    await toast.present();
  }

  async alert(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header,
      message,
      cssClass: 'oido-alert',
      buttons: ['Entendido'],
    });
    await alert.present();
  }

  async confirmRemovePhoto(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Eliminar foto',
      cssClass: 'oido-alert',
      message:
        '¿Seguro que quieres quitar tu foto de perfil? Volverás a ver la inicial de tu nombre.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }

  async confirmLogout(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Cerrar sesión',
      cssClass: 'oido-alert',
      message: 'Se borrarán tu perfil y tu historial y volverás a la pantalla inicial. ¿Continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cerrar sesión', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }
}
