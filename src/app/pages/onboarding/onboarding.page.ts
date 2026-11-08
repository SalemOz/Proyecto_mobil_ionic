import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowForward, checkmarkCircle, earOutline, lockClosedOutline, personCircleOutline } from 'ionicons/icons';
import { Ear } from '../../models';
import { StorageService } from '../../services/storage.service';
import { nameErrorMessage, nameValidator } from '../../validators';

@Component({
  selector: 'app-onboarding',
  imports: [ReactiveFormsModule, IonContent, IonInput, IonButton, IonIcon],
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.scss'
})
export class OnboardingPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly store = inject(StorageService);
  private readonly router = inject(Router);

  protected readonly ears: { value: Ear; label: string }[] = [
    { value: 'left', label: 'Izquierdo' },
    { value: 'right', label: 'Derecho' }
  ];

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, nameValidator]],
    ear: ['right' as Ear, Validators.required]
  });

  constructor() {
    addIcons({ personCircleOutline, earOutline, checkmarkCircle, lockClosedOutline, arrowForward });
  }

  protected nameError(): string {
    return nameErrorMessage(this.form.controls.name);
  }

  protected selectEar(ear: Ear): void {
    this.form.controls.ear.setValue(ear);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { name, ear } = this.form.getRawValue();
    this.store.saveProfile({ name: name.trim(), ear });
    void this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
  }
}
