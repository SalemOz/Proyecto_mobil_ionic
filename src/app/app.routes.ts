import { Routes } from '@angular/router';
import { onboardingGuard, profileGuard } from './guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tabs/home' },
  {
    path: 'onboarding',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./pages/onboarding/onboarding.page').then((m) => m.OnboardingPage)
  },
  {
    path: 'tabs',
    canActivate: [profileGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: 'home', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage) },
      { path: 'wellness', loadComponent: () => import('./pages/wellness/wellness.page').then((m) => m.WellnessPage) },
      { path: 'history', loadComponent: () => import('./pages/history/history.page').then((m) => m.HistoryPage) },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage) },
      { path: '', pathMatch: 'full', redirectTo: 'home' }
    ]
  },
  { path: '**', redirectTo: '' }
];
