import { Component, effect, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  helpCircleOutline,
  informationCircleOutline,
  personOutline,
  refreshOutline,
  trashOutline,
} from 'ionicons/icons';
import { EAR_LABEL, Ear } from '../../models';
import { AudioService } from '../../services/audio.service';
import { StorageService } from '../../services/storage.service';
import { UiService } from '../../services/ui.service';
import { nameErrorMessage, nameValidator } from '../../validators';

@Component({
  selector: 'app-settings',
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonInput,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButton,
    IonList,
    IonItem,
    IonIcon,
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly store = inject(StorageService);
  private readonly audio = inject(AudioService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  protected readonly profile = this.store.profile;
  protected readonly earLabel = EAR_LABEL;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, nameValidator]],
    ear: ['right' as Ear, Validators.required],
  });

  constructor() {
    addIcons({
      helpCircleOutline,
      informationCircleOutline,
      trashOutline,
      refreshOutline,
      personOutline,
    });
    // Carga el perfil guardado en el formulario cada vez que cambia.
    effect(() => {
      const profile = this.profile();
      if (profile) this.form.reset({ name: profile.name, ear: profile.ear });
    });
  }

  protected nameError(): string {
    return nameErrorMessage(this.form.controls.name);
  }

  protected initial(): string {
    return (this.profile()?.name ?? '?').charAt(0).toUpperCase();
  }

  protected onEar(value: unknown): void {
    if (value === 'left' || value === 'right') this.form.controls.ear.setValue(value);
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { name, ear } = this.form.getRawValue();
    this.store.saveProfile({ name: name.trim(), ear });
    this.audio.setEar(ear); // si está amplificando, el cambio se aplica en vivo
    await this.ui.toast('Cambios guardados');
  }

  protected async showHelp(): Promise<void> {
    await this.ui.alert(
      'Ayuda y soporte',
      '1) Conecta tus audífonos.\n2) En Inicio, toca el botón grande para activar la amplificación.\n3) El sonido que capte el micrófono saldrá solo por tu oído sano.\n\nAjusta el volumen y el modo de ambiente según el lugar.',
    );
  }

  protected async showAbout(): Promise<void> {
    await this.ui.alert(
      'Acerca de Oído+',
      'Versión 1.0.0\nApp híbrida (Ionic + Angular + Capacitor) para personas con pérdida auditiva en un oído.\n\nProyecto de Dispositivos Móviles — USCO.',
    );
  }

  protected async confirmClear(): Promise<void> {
    await this.ui.confirmClearHistory();
  }

  protected async confirmReset(): Promise<void> {
    if (!(await this.ui.confirmLogout())) return; // el usuario canceló: no se borra nada
    await this.audio.stop();
    this.store.reset();
    await this.router.navigateByUrl('/onboarding', { replaceUrl: true });
  }
}
