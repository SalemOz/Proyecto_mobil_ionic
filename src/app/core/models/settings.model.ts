export type AmbientMode = 'low' | 'medium' | 'high';

export interface Settings {
  ambientMode: AmbientMode;
  volume: number;
}

export const MODE_LABEL: Record<AmbientMode, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
};
