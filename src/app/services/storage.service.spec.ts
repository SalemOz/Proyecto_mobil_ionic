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

  it('reset deja la app como recién instalada', () => {
    const store = new StorageService();
    store.saveProfile({ name: 'Delia', ear: 'right' });
    store.reset();
    expect(store.profile()).toBeNull();
  });
});
