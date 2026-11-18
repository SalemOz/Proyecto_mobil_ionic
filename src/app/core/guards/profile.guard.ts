import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '@core/services/storage.service';

export const profileGuard: CanActivateFn = () =>
  inject(StorageService).profile() ? true : inject(Router).createUrlTree(['/onboarding']);

export const onboardingGuard: CanActivateFn = () =>
  inject(StorageService).profile() ? inject(Router).createUrlTree(['/tabs/home']) : true;
