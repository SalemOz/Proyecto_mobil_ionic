export type Ear = 'left' | 'right';
export type AmbientMode = 'low' | 'medium' | 'high';

export interface Profile {
  name: string;
  ear: Ear; // oído afectado
  avatar?: string; // nombre del archivo de la foto en Directory.Data (no es una ruta absoluta)
}

export interface Settings {
  ambientMode: AmbientMode;
  volume: number; // 0 - 100
}

export interface Session {
  id: number;
  start: string; // ISO
  end: string; // ISO
  seconds: number;
  ear: Ear;
  mode: AmbientMode;
}

export interface Weather {
  temperature: number;
  humidity: number;
  wind: number;
  code: number; // código WMO de Open-Meteo
}

export const EAR_LABEL: Record<Ear, string> = { left: 'izquierdo', right: 'derecho' };
export const MODE_LABEL: Record<AmbientMode, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
};
