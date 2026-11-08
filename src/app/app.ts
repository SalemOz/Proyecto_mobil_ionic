import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
  // El cascarón no tiene estado: las vistas de dentro se encargan de su propio cambio.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  constructor() {
    if (Capacitor.isNativePlatform()) void this.setupStatusBar();
  }

  private async setupStatusBar(): Promise<void> {
    try {
      // Style.Light = íconos oscuros para el fondo claro. Sin setBackgroundColor: Android 15+ lo ignora (borde a borde).
      await StatusBar.setStyle({ style: Style.Light });
    } catch (error) {
      console.warn('No se pudo ajustar la barra de estado', error);
    }
  }
}
