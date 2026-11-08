import { Injectable, NgZone, inject, signal } from '@angular/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { AmbientMode, Ear } from '../models';
import { StorageService } from './storage.service';

export type AudioErrorCode = 'denied' | 'no-mic' | 'unsupported' | 'unknown';

export class AudioError extends Error {
  constructor(readonly code: AudioErrorCode) {
    super(code);
  }
}

export const AUDIO_ERROR_TEXT: Record<AudioErrorCode, string> = {
  denied: 'Necesitamos permiso del micrófono. Actívalo en los ajustes del teléfono para esta app.',
  'no-mic': 'No se encontró un micrófono disponible.',
  unsupported: 'Este dispositivo no permite capturar audio desde la app.',
  unknown: 'No se pudo iniciar la amplificación. Inténtalo de nuevo.'
};

/** Cuánto se refuerza el sonido según el modo de ambiente (mayor = más conciencia del entorno). */
const MODE_BOOST: Record<AmbientMode, number> = { low: 1.5, medium: 3, high: 5 };

/**
 * Motor de audio de Oído+ (Web Audio API).
 *
 *  micrófono → ganancia (volumen x modo) → limitador → panorama (todo al oído sano) → audífonos
 *
 * Si el oído afectado es el izquierdo, todo el sonido sale por el canal derecho (pan = +1) y viceversa.
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly store = inject(StorageService);
  private readonly zone = inject(NgZone);

  /** true mientras el micrófono está capturando y reenviando sonido. */
  readonly active = signal(false);
  /** Nivel de entrada 0..1, para el indicador visual. */
  readonly level = signal(0);
  /** Nombre del micrófono que el sistema está usando (sirve para saber si es el del teléfono o el del audífono). */
  readonly inputLabel = signal('');

  private ctx?: AudioContext;
  private stream?: MediaStream;
  private gainNode?: GainNode;
  private panner?: StereoPannerNode;
  private meterTimer?: number;
  private startedAt = 0;
  private ear: Ear = 'left';
  private volume = 60;
  private mode: AmbientMode = 'low';

  get supported(): boolean {
    return typeof AudioContext !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  async start(ear: Ear, volume: number, mode: AmbientMode): Promise<void> {
    if (this.active()) return;
    if (!this.supported) throw new AudioError('unsupported');

    this.ear = ear;
    this.volume = volume;
    this.mode = mode;

    // El contexto se crea de inmediato (dentro del gesto del usuario) para que no quede suspendido.
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    try {
      // Sin cancelación de eco, supresión de ruido ni control automático: queremos el sonido del entorno tal cual.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 }
      });
      await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor(); // evita picos fuertes que lastimen el oído
      limiter.threshold.value = -12;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      const panner = ctx.createStereoPanner();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      source.connect(gain).connect(limiter).connect(panner).connect(ctx.destination);
      source.connect(analyser);

      this.ctx = ctx;
      this.stream = stream;
      this.gainNode = gain;
      this.panner = panner;
      this.applyParams(true);

      // Si el micrófono se corta (llamada, otra app), se detiene limpiamente.
      stream.getAudioTracks()[0]?.addEventListener('ended', () => this.zone.run(() => void this.stop()));

      this.inputLabel.set(stream.getAudioTracks()[0]?.label ?? '');
      this.startedAt = Date.now();
      this.active.set(true);
      this.startMeter(analyser);
      try {
        await KeepAwake.keepAwake(); // mantiene la pantalla encendida mientras amplifica
      } catch {
        /* no disponible: no es crítico */
      }
    } catch (error) {
      void ctx.close();
      throw this.toAudioError(error);
    }
  }

  async stop(): Promise<void> {
    if (!this.active()) return;
    window.clearInterval(this.meterTimer);
    this.stream?.getTracks().forEach((track) => track.stop());
    await this.ctx?.close().catch(() => undefined);

    const seconds = Math.round((Date.now() - this.startedAt) / 1000);
    if (seconds >= 1) {
      this.store.addSession({
        id: this.startedAt,
        start: new Date(this.startedAt).toISOString(),
        end: new Date().toISOString(),
        seconds,
        ear: this.ear,
        mode: this.mode
      });
    }

    this.ctx = this.stream = this.gainNode = this.panner = undefined;
    this.active.set(false);
    this.level.set(0);
    this.inputLabel.set('');
    try {
      await KeepAwake.allowSleep();
    } catch {
      /* sin acción */
    }
  }

  setVolume(volume: number): void {
    this.volume = volume;
    this.applyParams();
  }

  setMode(mode: AmbientMode): void {
    this.mode = mode;
    this.applyParams();
  }

  setEar(ear: Ear): void {
    this.ear = ear;
    this.applyParams();
  }

  /** Aplica volumen, modo y oído a los nodos de audio (con una transición corta para evitar chasquidos). */
  private applyParams(immediate = false): void {
    if (!this.ctx || !this.gainNode || !this.panner) return;
    const gain = Math.pow(this.volume / 100, 2) * MODE_BOOST[this.mode];
    const pan = this.ear === 'left' ? 1 : -1; // oído afectado izquierdo → sonido al canal derecho
    const now = this.ctx.currentTime;
    if (immediate) {
      this.gainNode.gain.value = gain;
      this.panner.pan.value = pan;
    } else {
      this.gainNode.gain.setTargetAtTime(gain, now, 0.05);
      this.panner.pan.setTargetAtTime(pan, now, 0.05);
    }
  }

  private startMeter(analyser: AnalyserNode): void {
    const samples = new Uint8Array(analyser.fftSize);
    this.zone.runOutsideAngular(() => {
      this.meterTimer = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) {
          const x = (value - 128) / 128;
          sum += x * x;
        }
        this.level.set(Math.min(1, Math.sqrt(sum / samples.length) * 4));
      }, 100);
    });
  }

  private toAudioError(error: unknown): AudioError {
    const name = (error as { name?: string })?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') return new AudioError('denied');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return new AudioError('no-mic');
    return new AudioError('unknown');
  }
}
