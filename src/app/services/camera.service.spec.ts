import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CAMERA_PLUGIN, CameraService, FILESYSTEM_PLUGIN } from './camera.service';
import { StorageService } from './storage.service';

describe('CameraService', () => {
  const camera = { takePhoto: vi.fn(), chooseFromGallery: vi.fn() };
  const files = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    getUri: vi.fn(),
    deleteFile: vi.fn(),
  };
  let store: StorageService;
  let service: CameraService;

  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: CAMERA_PLUGIN, useValue: camera },
        { provide: FILESYSTEM_PLUGIN, useValue: files },
      ],
    });
    files.writeFile.mockResolvedValue({ uri: 'DATA/avatar.jpg' });
    files.readFile.mockResolvedValue({ data: 'aW1hZ2Vu' });
    files.getUri.mockResolvedValue({ uri: 'file:///data/avatar.jpg' });
    files.deleteFile.mockResolvedValue(undefined);
    store = TestBed.inject(StorageService);
    store.saveProfile({ name: 'Delia', ear: 'left' });
    service = TestBed.inject(CameraService);
  });

  it('guarda la foto en Directory.Data y actualiza el perfil', async () => {
    camera.takePhoto.mockResolvedValue({ type: 0, uri: 'file:///cache/foto.jpg', saved: false });
    files.readFile.mockResolvedValueOnce({ data: 'Zm90bw==' }); // lectura de la foto temporal

    await expect(service.takePhoto()).resolves.toBe('saved');

    expect(files.writeFile).toHaveBeenCalledWith({
      path: expect.stringMatching(/^avatar-\d+\.jpg$/),
      data: 'Zm90bw==',
      directory: 'DATA',
      recursive: true,
    });
    expect(store.profile()?.avatar).toMatch(/^avatar-\d+\.jpg$/);

    TestBed.tick(); // ejecuta el effect que resuelve la URL del avatar
    await vi.waitFor(() => expect(service.avatarUrl()).toBe('data:image/jpeg;base64,aW1hZ2Vu'));
  });

  it('conserva la foto anterior cuando el usuario cancela', async () => {
    store.saveProfile({ name: 'Delia', ear: 'left', avatar: 'avatar-previa.jpg' });
    camera.takePhoto.mockRejectedValue({ code: 'OS-PLUG-CAMR-0006' });

    await expect(service.takePhoto()).resolves.toBe('cancelled');

    expect(files.writeFile).not.toHaveBeenCalled();
    expect(files.deleteFile).not.toHaveBeenCalled();
    expect(store.profile()?.avatar).toBe('avatar-previa.jpg');
  });

  it('informa cuando el permiso fue negado', async () => {
    camera.chooseFromGallery.mockRejectedValue({ code: 'OS-PLUG-CAMR-0005' });

    await expect(service.chooseFromGallery()).resolves.toBe('denied');
    expect(store.profile()?.avatar).toBeUndefined();
  });

  it('reemplaza la foto y borra el archivo anterior', async () => {
    store.saveProfile({ name: 'Delia', ear: 'left', avatar: 'avatar-previa.jpg' });
    camera.chooseFromGallery.mockResolvedValue({
      results: [{ type: 0, uri: 'file:///cache/galeria.jpg', saved: false }],
    });

    await expect(service.chooseFromGallery()).resolves.toBe('saved');

    expect(store.profile()?.avatar).not.toBe('avatar-previa.jpg');
    expect(files.deleteFile).toHaveBeenCalledWith({ path: 'avatar-previa.jpg', directory: 'DATA' });
  });

  it('no pierde la foto anterior si falla el guardado', async () => {
    store.saveProfile({ name: 'Delia', ear: 'left', avatar: 'avatar-previa.jpg' });
    camera.takePhoto.mockResolvedValue({ type: 0, uri: 'file:///cache/foto.jpg', saved: false });
    files.writeFile.mockRejectedValue(new Error('almacenamiento lleno'));

    await expect(service.takePhoto()).resolves.toBe('failed');
    expect(store.profile()?.avatar).toBe('avatar-previa.jpg');
  });

  it('removePhoto borra el archivo y la referencia del perfil', async () => {
    store.saveProfile({ name: 'Delia', ear: 'left', avatar: 'avatar-previa.jpg' });

    await expect(service.removePhoto()).resolves.toBe(true);

    expect(files.deleteFile).toHaveBeenCalledWith({ path: 'avatar-previa.jpg', directory: 'DATA' });
    expect(store.profile()).toEqual({ name: 'Delia', ear: 'left' });
  });

  it('elimina la foto sin cerrar sesión ni borrar ajustes o historial', async () => {
    store.saveSettings({ volume: 30 });
    store.addSession({
      id: 1,
      start: '2026-11-09T10:00:00.000Z',
      end: '2026-11-09T10:05:00.000Z',
      seconds: 300,
      ear: 'left',
      mode: 'low',
    });
    store.saveProfile({ name: 'Delia', ear: 'left', avatar: 'avatar-previa.jpg' });
    TestBed.tick();
    await vi.waitFor(() => expect(service.avatarUrl()).not.toBeNull());

    await expect(service.removePhoto()).resolves.toBe(true);

    expect(store.profile()).toEqual({ name: 'Delia', ear: 'left' });
    expect(store.settings().volume).toBe(30);
    expect(store.sessions()).toHaveLength(1);
    TestBed.tick();
    await vi.waitFor(() => expect(service.avatarUrl()).toBeNull());
  });
});
