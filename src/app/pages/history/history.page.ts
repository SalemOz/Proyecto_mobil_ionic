import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AlertController, IonButton, IonContent, IonIcon, IonItem, IonLabel, IonList } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { micOutline, timeOutline, trashOutline } from 'ionicons/icons';
import { EAR_LABEL, MODE_LABEL } from '../../models';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-history',
  imports: [DatePipe, IonContent, IonList, IonItem, IonLabel, IonIcon, IonButton],
  templateUrl: './history.page.html',
  styleUrl: './history.page.scss'
})
export class HistoryPage {
  private readonly store = inject(StorageService);
  private readonly alertController = inject(AlertController);

  protected readonly sessions = this.store.sessions;
  protected readonly totalSeconds = computed(() => this.sessions().reduce((sum, s) => sum + s.seconds, 0));
  protected readonly earLabel = EAR_LABEL;
  protected readonly modeLabel = MODE_LABEL;

  constructor() {
    addIcons({ timeOutline, micOutline, trashOutline });
  }

  protected duration(seconds: number): string {
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min ${seconds % 60} s`;
  }

  protected async confirmClear(): Promise<void> {
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
}
