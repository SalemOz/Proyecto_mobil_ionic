import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { onboardingGuard, profileGuard } from './guards';
import { StorageService } from './services/storage.service';

/** Router mínimo para las pruebas: solo interesa a qué ruta se redirige. */
const routerStub = { createUrlTree: (commands: string[]) => ({ commands }) };

/**
 * Prepara el entorno de inyección con un almacenamiento simulado.
 * Los guards usan inject(), así que hay que ejecutarlos dentro de un TestBed.
 */
function setup(hasProfile: boolean): void {
  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: routerStub },
      {
        provide: StorageService,
        useValue: { profile: signal(hasProfile ? { name: 'Delia', ear: 'left' } : null) },
      },
    ],
  });
}

/** Ejecuta un guard con las dependencias ya preparadas y devuelve su resultado. */
function runGuard(guard: typeof profileGuard): unknown {
  return TestBed.runInInjectionContext(() => guard({} as never, {} as never));
}

describe('guards', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('profileGuard redirige al onboarding cuando no hay perfil', () => {
    setup(false);
    expect(runGuard(profileGuard)).toEqual({ commands: ['/onboarding'] });
  });

  it('profileGuard deja pasar cuando ya existe un perfil', () => {
    setup(true);
    expect(runGuard(profileGuard)).toBe(true);
  });

  it('onboardingGuard deja pasar cuando no hay perfil', () => {
    setup(false);
    expect(runGuard(onboardingGuard)).toBe(true);
  });

  it('onboardingGuard redirige al inicio cuando ya existe un perfil', () => {
    setup(true);
    expect(runGuard(onboardingGuard)).toEqual({ commands: ['/tabs/home'] });
  });
});
