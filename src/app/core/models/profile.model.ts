export type Ear = 'left' | 'right';

export interface Profile {
  name: string;
  ear: Ear;
  avatar?: string;
}

export const EAR_LABEL: Record<Ear, string> = { left: 'izquierdo', right: 'derecho' };
