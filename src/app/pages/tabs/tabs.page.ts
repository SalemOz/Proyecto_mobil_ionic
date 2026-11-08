import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heartOutline, homeOutline, settingsOutline, timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  templateUrl: './tabs.page.html',
  // Solo contiene la barra de pestañas: no tiene estado propio que refrescar.
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabsPage {
  constructor() {
    addIcons({ homeOutline, heartOutline, timeOutline, settingsOutline });
  }
}
