import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonSearchbar,
  IonSkeletonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { informationCircleOutline, leafOutline, openOutline, refreshOutline } from 'ionicons/icons';
import { HealthService, HealthTopic } from '../../services/health.service';

const TOPICS = [
  'Pérdida de audición',
  'Zumbido en los oídos',
  'Ruido y audición',
  'Infecciones de oído',
  'Audífonos',
];

@Component({
  selector: 'app-wellness',
  imports: [IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonSearchbar, IonSkeletonText],
  templateUrl: './wellness.page.html',
  styleUrl: './wellness.page.scss',
  // Resultados, estado y temas abiertos son signals: la vista solo se revisa cuando cambian.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WellnessPage implements OnInit {
  private readonly health = inject(HealthService);

  protected readonly topics = TOPICS;
  protected readonly selected = signal(TOPICS[0]);
  protected readonly state = signal<'loading' | 'ok' | 'empty' | 'error'>('loading');
  protected readonly results = signal<HealthTopic[]>([]);
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  /** Los esqueletos no se animan si el sistema pide reducir el movimiento. */
  protected readonly animateSkeleton = !window.matchMedia?.('(prefers-reduced-motion: reduce)')
    .matches;

  private requestId = 0;

  constructor() {
    addIcons({ informationCircleOutline, leafOutline, openOutline, refreshOutline });
  }

  ngOnInit(): void {
    void this.search(TOPICS[0]);
  }

  protected async search(term: string): Promise<void> {
    const clean = term.trim();
    if (!clean) return;

    const id = ++this.requestId; // si el usuario cambia de tema rápido, se ignora la respuesta vieja
    this.selected.set(clean);
    this.state.set('loading');
    this.expanded.set(new Set());
    try {
      const found = await this.health.search(clean);
      if (id !== this.requestId) return;
      this.results.set(found);
      this.state.set(found.length ? 'ok' : 'empty');
    } catch {
      if (id === this.requestId) this.state.set('error');
    }
  }

  /** ionChange se dispara al presionar Enter o al salir del campo de búsqueda. */
  protected onSearchbar(event: Event): void {
    const value = (event as CustomEvent<{ value?: string | null }>).detail.value ?? '';
    void this.search(value);
  }

  protected isExpanded(topic: HealthTopic): boolean {
    return this.expanded().has(topic.url);
  }

  protected toggle(topic: HealthTopic): void {
    const next = new Set(this.expanded());
    if (!next.delete(topic.url)) next.add(topic.url);
    this.expanded.set(next);
  }
}
