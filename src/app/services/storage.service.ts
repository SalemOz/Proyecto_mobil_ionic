import { Injectable, signal } from '@angular/core';
import { AmbientMode, Profile, Session, Settings } from '../models';

const KEYS = { profile: 'oido.profile', settings: 'oido.settings', sessions: 'oido.sessions' };
const MAX_SESSIONS = 100;
const DEFAULT_SETTINGS: Settings = { ambientMode: 'low' as AmbientMode, volume: 60 };

/** Guarda perfil, ajustes e historial en el almacenamiento local de la app (localStorage del WebView). */
@Injectable({ providedIn: 'root' })
export class StorageService {
  readonly profile = signal<Profile | null>(this.read<Profile | null>(KEYS.profile, null));
  readonly settings = signal<Settings>({
    ...DEFAULT_SETTINGS,
    ...this.read<Partial<Settings>>(KEYS.settings, {}),
  });
  readonly sessions = signal<Session[]>(this.read<Session[]>(KEYS.sessions, []));

  saveProfile(profile: Profile): void {
    this.profile.set(profile);
    this.write(KEYS.profile, profile);
  }

  saveSettings(changes: Partial<Settings>): void {
    const next = { ...this.settings(), ...changes };
    this.settings.set(next);
    this.write(KEYS.settings, next);
  }

  addSession(session: Session): void {
    const next = [session, ...this.sessions()].slice(0, MAX_SESSIONS); // la más reciente primero
    this.sessions.set(next);
    this.write(KEYS.sessions, next);
  }

  clearSessions(): void {
    this.sessions.set([]);
    this.write(KEYS.sessions, []);
  }

  /** Borra todo y vuelve al estado inicial (como recién instalada). */
  reset(): void {
    Object.values(KEYS).forEach((key) => this.remove(key));
    this.profile.set(null);
    this.settings.set({ ...DEFAULT_SETTINGS });
    this.sessions.set([]);
  }

  private read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* almacenamiento lleno o no disponible: la app sigue funcionando en memoria */
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* sin acción */
    }
  }
}
