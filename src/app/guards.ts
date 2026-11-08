import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from './services/storage.service';

/** Las pantallas principales exigen que el usuario ya haya llenado el formulario inicial. */
export const profileGuard: CanActivateFn = () =>
  inject(StorageService).profile() ? true : inject(Router).createUrlTree(['/onboarding']);

/** El formulario inicial solo se muestra la primera vez (mientras no exista perfil). */
export const onboardingGuard: CanActivateFn = () =>
  inject(StorageService).profile() ? inject(Router).createUrlTree(['/tabs/home']) : true;
