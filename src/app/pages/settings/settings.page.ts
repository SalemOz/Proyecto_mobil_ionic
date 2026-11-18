import { Component, effect, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ActionSheetController,
  type ActionSheetButton,
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  helpCircleOutline,
  imagesOutline,
  informationCircleOutline,
  personOutline,
  refreshOutline,
  trashOutline,
} from 'ionicons/icons';
import { EAR_LABEL, Ear } from '@core/models';
import { AudioService } from '@core/services/audio.service';
import { AvatarSource, CameraService } from '@core/services/camera.service';
import { StorageService } from '@core/services/storage.service';
import { UiService } from '@core/services/ui.service';
import { nameErrorMessage, nameValidator } from '@shared/validators/name.validator';

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
    IonSpinner,
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
  private readonly camera = inject(CameraService);
  private readonly actionSheet = inject(ActionSheetController);

  protected readonly profile = this.store.profile;
  protected readonly earLabel = EAR_LABEL;
  protected readonly avatarUrl = this.camera.avatarUrl;
  protected readonly photoBusy = this.camera.busy;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, nameValidator]],
    ear: ['right' as Ear, Validators.required],
  });

  private syncedProfile = '';

  constructor() {
    addIcons({
      cameraOutline,
      imagesOutline,
      helpCircleOutline,
      informationCircleOutline,
      trashOutline,
      refreshOutline,
      personOutline,
    });
    effect(() => {
      const profile = this.profile();
      if (!profile) return;
      const identity = `${profile.name}|${profile.ear}`;
      if (identity === this.syncedProfile) return;
      this.syncedProfile = identity;
      this.form.reset({ name: profile.name, ear: profile.ear });
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

  protected async changeAvatar(): Promise<void> {
    if (this.photoBusy()) return;
    const buttons: ActionSheetButton[] = [
      {
        text: 'Tomar una foto',
        icon: 'camera-outline',
        handler: () => {
          void this.pickPhoto('camera');
        },
      },
      {
        text: 'Elegir de la galería',
        icon: 'images-outline',
        handler: () => {
          void this.pickPhoto('gallery');
        },
      },
    ];
    if (this.profile()?.avatar) {
      buttons.push({
        text: 'Eliminar foto',
        icon: 'trash-outline',
        role: 'destructive',
        handler: () => {
          void this.deletePhoto();
        },
      });
    }
    buttons.push({ text: 'Cancelar', role: 'cancel' });

    const sheet = await this.actionSheet.create({ header: 'Foto de perfil', buttons });
    await sheet.present();
  }

  private async deletePhoto(): Promise<void> {
    if (!(await this.ui.confirmRemovePhoto())) return;
    if (await this.camera.removePhoto()) {
      await this.ui.toast('Foto eliminada');
    } else {
      await this.ui.alert(
        'No se pudo eliminar la foto',
        'Ocurrió un error al actualizar tu perfil. Inténtalo de nuevo.',
      );
    }
  }

  private async pickPhoto(source: AvatarSource): Promise<void> {
    const result =
      source === 'camera' ? await this.camera.takePhoto() : await this.camera.chooseFromGallery();
    if (result === 'cancelled') return;
    if (result === 'denied') {
      await this.ui.alert(
        'Permiso necesario',
        'Para cambiar tu foto, permite el acceso a la cámara o a tus fotos desde los ajustes del teléfono.',
      );
    } else if (result === 'failed') {
      await this.ui.alert(
        'No se pudo cambiar la foto',
        'Ocurrió un error al guardar la imagen. Tu foto anterior sigue disponible.',
      );
    }
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { name, ear } = this.form.getRawValue();
    const avatar = this.profile()?.avatar;
    this.store.saveProfile({ name: name.trim(), ear, ...(avatar ? { avatar } : {}) });
    this.audio.setEar(ear);
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
    if (!(await this.ui.confirmLogout())) return;
    await this.audio.stop();
    await this.camera.removePhoto();
    this.store.reset();
    await this.router.navigateByUrl('/onboarding', { replaceUrl: true });
  }
}
