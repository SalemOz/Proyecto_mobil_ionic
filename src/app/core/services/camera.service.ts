import { Injectable, InjectionToken, effect, inject, signal } from '@angular/core';
import { Camera, CameraErrorCode, MediaTypeSelection } from '@capacitor/camera';
import type { MediaResult } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { StorageService } from './storage.service';

export type AvatarSource = 'camera' | 'gallery';

export type AvatarUpdate = 'saved' | 'cancelled' | 'denied' | 'failed';

type CameraPlugin = Pick<typeof Camera, 'takePhoto' | 'chooseFromGallery'>;
type FilesystemPlugin = Pick<typeof Filesystem, 'readFile' | 'writeFile' | 'getUri' | 'deleteFile'>;

export const CAMERA_PLUGIN = new InjectionToken<CameraPlugin>('CameraPlugin', {
  providedIn: 'root',
  factory: () => Camera,
});
export const FILESYSTEM_PLUGIN = new InjectionToken<FilesystemPlugin>('FilesystemPlugin', {
  providedIn: 'root',
  factory: () => Filesystem,
});

const AVATAR_PREFIX = 'avatar';
const AVATAR_EXTENSION = 'jpg';
const PHOTO_QUALITY = 85;

const CANCELLED_CODES: string[] = [
  CameraErrorCode.TakePhotoCancelled,
  CameraErrorCode.ChooseMediaCancelled,
];
const DENIED_CODES: string[] = [
  CameraErrorCode.CameraPermissionDenied,
  CameraErrorCode.GalleryPermissionDenied,
];

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const { code } = error as { code?: unknown };
  return typeof code === 'string' ? code : undefined;
}

@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly store = inject(StorageService);
  private readonly camera = inject(CAMERA_PLUGIN);
  private readonly files = inject(FILESYSTEM_PLUGIN);
  private readonly avatarUrlState = signal<string | null>(null);
  private readonly busyState = signal(false);
  private resolveId = 0;

  readonly avatarUrl = this.avatarUrlState.asReadonly();
  readonly busy = this.busyState.asReadonly();

  constructor() {
    effect(() => {
      const reference = this.store.profile()?.avatar ?? null;
      void this.resolve(reference);
    });
  }

  async takePhoto(): Promise<AvatarUpdate> {
    return this.update(() =>
      this.camera.takePhoto({
        quality: PHOTO_QUALITY,
        correctOrientation: true,
        saveToGallery: false,
      }),
    );
  }

  async chooseFromGallery(): Promise<AvatarUpdate> {
    return this.update(async () => {
      const { results } = await this.camera.chooseFromGallery({
        mediaType: MediaTypeSelection.Photo,
        quality: PHOTO_QUALITY,
        correctOrientation: true,
      });
      return results[0];
    });
  }

  async removePhoto(): Promise<boolean> {
    const profile = this.store.profile();
    const reference = profile?.avatar;
    if (!profile || !reference) return true;
    try {
      this.store.saveProfile({ name: profile.name, ear: profile.ear });
      await this.deleteFile(reference);
      return true;
    } catch {
      return false;
    }
  }

  private async update(pick: () => Promise<MediaResult | undefined>): Promise<AvatarUpdate> {
    const profile = this.store.profile();
    if (!profile) return 'failed';
    const previous = profile.avatar;

    this.busyState.set(true);
    try {
      const media = await pick();
      if (!media) return 'failed';

      const data = await this.readBase64(media);
      const reference = `${AVATAR_PREFIX}-${Date.now()}.${AVATAR_EXTENSION}`;
      await this.files.writeFile({
        path: reference,
        data,
        directory: Directory.Data,
        recursive: true,
      });

      this.store.saveProfile({ ...profile, avatar: reference });
      if (previous && previous !== reference) await this.deleteFile(previous);
      return 'saved';
    } catch (error) {
      return this.classify(error);
    } finally {
      this.busyState.set(false);
    }
  }

  private async readBase64(media: MediaResult): Promise<string> {
    if (media.uri) {
      const { data } = await this.files.readFile({ path: media.uri });
      return typeof data === 'string' ? data : this.blobToBase64(data);
    }
    if (media.webPath) {
      const response = await fetch(media.webPath);
      return this.blobToBase64(await response.blob());
    }
    throw new Error('La fotografía no tiene una ruta válida');
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result);
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la fotografía'));
      reader.readAsDataURL(blob);
    });
  }

  private async resolve(reference: string | null): Promise<void> {
    const id = ++this.resolveId;
    if (!reference) {
      this.avatarUrlState.set(null);
      return;
    }
    try {
      const url = await this.displayUrl(reference);
      if (id === this.resolveId) this.avatarUrlState.set(url);
    } catch {
      if (id === this.resolveId) this.avatarUrlState.set(null);
    }
  }

  private async displayUrl(reference: string): Promise<string> {
    const { uri } = await this.files.getUri({ path: reference, directory: Directory.Data });
    if (Capacitor.isNativePlatform()) return Capacitor.convertFileSrc(uri);
    const { data } = await this.files.readFile({ path: reference, directory: Directory.Data });
    return typeof data === 'string' ? `data:image/jpeg;base64,${data}` : URL.createObjectURL(data);
  }

  private async deleteFile(reference: string): Promise<void> {
    try {
      await this.files.deleteFile({ path: reference, directory: Directory.Data });
    } catch {}
  }

  private classify(error: unknown): AvatarUpdate {
    const code = errorCode(error);
    if (code && CANCELLED_CODES.includes(code)) return 'cancelled';
    if (code && DENIED_CODES.includes(code)) return 'denied';
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('cancel')) return 'cancelled';
    if (message.includes('permission') || message.includes('denied')) return 'denied';
    return 'failed';
  }
}
