import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonIcon,
  IonLabel,
  IonRange,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
} from '@ionic/angular';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { addIcons } from 'ionicons';
import {
  bulbOutline,
  cloudOutline,
  earOutline,
  headsetOutline,
  helpCircleOutline,
  leafOutline,
  locationOutline,
  partlySunnyOutline,
  rainyOutline,
  refreshOutline,
  snowOutline,
  speedometerOutline,
  sunnyOutline,
  thermometerOutline,
  thunderstormOutline,
  volumeHighOutline,
  volumeLowOutline,
  waterOutline,
} from 'ionicons/icons';
import { AmbientMode, EAR_LABEL, MODE_LABEL } from '../../models';
import { AUDIO_ERROR_TEXT, AudioError, AudioService } from '../../services/audio.service';
import { StorageService } from '../../services/storage.service';
import { UiService } from '../../services/ui.service';
import {
  WeatherResult,
  WeatherService,
  describeWeather,
  suggestMode,
} from '../../services/weather.service';

const MODE_HINT: Record<AmbientMode, string> = {
  low: 'Escuchas lo esencial, sin saturar tu oído.',
  medium: 'Un equilibrio entre claridad y comodidad.',
  high: 'Máxima conciencia de lo que ocurre a tu alrededor.',
};

@Component({
  selector: 'app-home',
  imports: [
    DecimalPipe,
    IonContent,
    IonCard,
    IonCardContent,
    IonRange,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonChip,
    IonButton,
    IonSkeletonText,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  // Todo lo que se muestra sale de signals: la vista solo se revisa cuando alguno cambia.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  protected readonly store = inject(StorageService);
  protected readonly audio = inject(AudioService);
  private readonly weatherService = inject(WeatherService);
  private readonly ui = inject(UiService);

  protected readonly modeLabel = MODE_LABEL;
  protected readonly modes: AmbientMode[] = ['low', 'medium', 'high'];

  protected readonly profile = this.store.profile;
  protected readonly volume = computed(() => this.store.settings().volume);
  protected readonly mode = computed(() => this.store.settings().ambientMode);
  protected readonly modeHint = computed(() => MODE_HINT[this.mode()]);
  protected readonly earName = computed(() => EAR_LABEL[this.profile()?.ear ?? 'right']);

  /** Saludo según la hora del día. */
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  /** Los esqueletos no se animan si el sistema pide reducir el movimiento. */
  protected readonly animateSkeleton = !window.matchMedia?.('(prefers-reduced-motion: reduce)')
    .matches;

  /** true mientras se espera el permiso del micrófono, para evitar toques repetidos. */
  protected readonly busy = signal(false);

  protected readonly weatherState = signal<'loading' | 'ok' | 'error'>('loading');
  protected readonly weatherData = signal<WeatherResult | null>(null);
  protected readonly weatherInfo = computed(() => {
    const data = this.weatherData();
    return data ? describeWeather(data.weather.code) : null;
  });
  protected readonly suggestion = computed(() => {
    const data = this.weatherData();
    return data ? suggestMode(data.weather) : null;
  });

  constructor() {
    addIcons({
      earOutline,
      headsetOutline,
      refreshOutline,
      locationOutline,
      thermometerOutline,
      waterOutline,
      speedometerOutline,
      bulbOutline,
      leafOutline,
      volumeLowOutline,
      volumeHighOutline,
      sunnyOutline,
      partlySunnyOutline,
      cloudOutline,
      rainyOutline,
      snowOutline,
      thunderstormOutline,
      helpCircleOutline,
    });
  }

  ngOnInit(): void {
    void this.loadWeather();
  }

  /** Botón grande: enciende o apaga la amplificación. */
  protected async toggleAmplification(): Promise<void> {
    const profile = this.profile();
    if (!profile || this.busy()) return;

    this.busy.set(true);
    try {
      if (this.audio.active()) {
        await this.audio.stop();
      } else {
        await this.audio.start(profile.ear, this.volume(), this.mode());
      }
      await this.vibrate();
    } catch (error) {
      const code = error instanceof AudioError ? error.code : 'unknown';
      await this.ui.toast(AUDIO_ERROR_TEXT[code], 3500);
    } finally {
      this.busy.set(false);
    }
  }

  /** Vibración corta al activar o desactivar con éxito; si no hay háptica (web), se ignora. */
  private async vibrate(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // sin háptica disponible: no afecta a la amplificación
    }
  }

  protected onVolume(value: unknown): void {
    const volume = Number(value);
    this.store.saveSettings({ volume });
    this.audio.setVolume(volume);
  }

  protected onMode(value: unknown): void {
    if (value !== 'low' && value !== 'medium' && value !== 'high') return;
    this.store.saveSettings({ ambientMode: value });
    this.audio.setMode(value);
  }

  protected async loadWeather(): Promise<void> {
    this.weatherState.set('loading');
    try {
      this.weatherData.set(await this.weatherService.load());
      this.weatherState.set('ok');
    } catch {
      this.weatherState.set('error');
    }
  }
}
