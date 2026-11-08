import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
  // El cascarón no tiene estado: las vistas de dentro se encargan de su propio cambio.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
