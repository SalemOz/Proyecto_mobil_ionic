export type Ear = 'left' | 'right';

export interface Profile {
  name: string;
  ear: Ear; // oído afectado
  avatar?: string; // nombre del archivo de la foto en Directory.Data (no es una ruta absoluta)
}

export const EAR_LABEL: Record<Ear, string> = { left: 'izquierdo', right: 'derecho' };
