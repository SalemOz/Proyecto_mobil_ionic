import { beforeEach, describe, expect, it } from 'vitest';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  beforeEach(() => localStorage.clear());

  it('guarda y recupera el perfil', () => {
    const first = new StorageService();
    first.saveProfile({ name: 'Delia', ear: 'left' });
    expect(new StorageService().profile()).toEqual({ name: 'Delia', ear: 'left' });
  });

  it('guarda las sesiones con la más reciente primero y permite borrarlas', () => {
    const store = new StorageService();
    const base = { end: '', seconds: 5, ear: 'left' as const, mode: 'low' as const };
    store.addSession({ ...base, id: 1, start: 'a' });
    store.addSession({ ...base, id: 2, start: 'b' });
    expect(store.sessions().map((s) => s.id)).toEqual([2, 1]);
    store.clearSessions();
    expect(store.sessions()).toEqual([]);
  });

  it('nunca guarda más de 100 sesiones y mantiene la más reciente primero', () => {
    const store = new StorageService();
    const base = { end: '', seconds: 5, ear: 'left' as const, mode: 'low' as const };
    for (let id = 1; id <= 105; id++) store.addSession({ ...base, id, start: `s${id}` });
    expect(store.sessions()).toHaveLength(100);
    expect(store.sessions()[0].id).toBe(105); // la última agregada queda de primera
    expect(store.sessions()[99].id).toBe(6); // se descartaron las 5 más antiguas
  });

  it('saveSettings conserva los valores por defecto que no se cambian', () => {
    const store = new StorageService();
    store.saveSettings({ volume: 80 });
    expect(store.settings()).toEqual({ ambientMode: 'low', volume: 80 });
  });

  it('guarda la foto del perfil y sigue leyendo perfiles antiguos sin ella', () => {
    const store = new StorageService();
    store.saveProfile({ name: 'Delia', ear: 'left', avatar: 'avatar-1.jpg' });
    expect(new StorageService().profile()?.avatar).toBe('avatar-1.jpg');

    localStorage.setItem('oido.profile', JSON.stringify({ name: 'Ana', ear: 'right' }));
    expect(new StorageService().profile()).toEqual({ name: 'Ana', ear: 'right' });
  });

  it('reset deja la app como recién instalada', () => {
    const store = new StorageService();
    store.saveProfile({ name: 'Delia', ear: 'right' });
    store.reset();
    expect(store.profile()).toBeNull();
  });
});
