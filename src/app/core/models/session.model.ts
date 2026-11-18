import { Ear } from './profile.model';
import { AmbientMode } from './settings.model';

export interface Session {
  id: number;
  start: string;
  end: string;
  seconds: number;
  ear: Ear;
  mode: AmbientMode;
}
