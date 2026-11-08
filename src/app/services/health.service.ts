import { Injectable } from '@angular/core';
import { CapacitorHttp } from '@capacitor/core';

const API_URL = 'https://wsearch.nlm.nih.gov/ws/query';
const CACHE_PREFIX = 'oido.health.';
const CACHE_HOURS = 24; // MedlinePlus pide guardar los resultados entre 12 y 24 horas

export interface HealthTopic {
  title: string;
  summary: string;
  url: string;
}

/** Quita las etiquetas HTML y conserva los párrafos como saltos de línea. */
function htmlToText(raw: string, keepParagraphs = false): string {
  const withBreaks = keepParagraphs
    ? raw.replace(/<\/p>\s*/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n')
    : raw;
  const text = new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent ?? '';
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Solo se aceptan enlaces que apunten a MedlinePlus. */
function isMedlinePlusUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('medlineplus.gov');
  } catch {
    return false;
  }
}

/** Convierte el XML de MedlinePlus (rettype=brief) en una lista de temas de salud. */
export function parseTopics(xml: string): HealthTopic[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) return [];

  const topics: HealthTopic[] = [];
  doc.querySelectorAll('document').forEach((node) => {
    const url = node.getAttribute('url') ?? '';
    let title = '';
    let summary = '';
    node.querySelectorAll('content').forEach((content) => {
      const name = (content.getAttribute('name') ?? '').toLowerCase();
      // El texto puede venir como HTML escapado o como elementos XML anidados.
      const raw = content.children.length ? content.innerHTML : (content.textContent ?? '');
      if (name === 'title') title = htmlToText(raw);
      else if (name === 'fullsummary') summary = htmlToText(raw, true);
    });
    if (title && isMedlinePlusUrl(url)) topics.push({ title, summary, url });
  });
  return topics;
}

/**
 * Información de salud en español desde MedlinePlus (Biblioteca Nacional de Medicina de EE. UU.).
 * API pública y gratuita, sin clave. Responde en XML.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  async search(term: string): Promise<HealthTopic[]> {
    const clean = term.trim();
    if (!clean) return [];

    const cached = this.readCache(clean);
    if (cached) return cached;

    // CapacitorHttp hace la petición desde la capa nativa, así no depende de las reglas CORS del WebView.
    const response = await CapacitorHttp.get({
      url: API_URL,
      params: {
        db: 'healthTopicsSpanish',
        term: clean,
        retmax: '5',
        rettype: 'brief',
        tool: 'oido-plus',
      },
      responseType: 'text',
    });
    if (response.status < 200 || response.status >= 300)
      throw new Error(`MedlinePlus respondió ${response.status}`);

    const topics = parseTopics(String(response.data));
    if (topics.length > 0) this.writeCache(clean, topics);
    return topics;
  }

  private cacheKey(term: string): string {
    return CACHE_PREFIX + term.toLowerCase();
  }

  private readCache(term: string): HealthTopic[] | null {
    try {
      const raw = localStorage.getItem(this.cacheKey(term));
      if (!raw) return null;
      const { savedAt, topics } = JSON.parse(raw) as { savedAt: number; topics: HealthTopic[] };
      return Date.now() - savedAt < CACHE_HOURS * 3600_000 ? topics : null;
    } catch {
      return null;
    }
  }

  private writeCache(term: string, topics: HealthTopic[]): void {
    try {
      localStorage.setItem(this.cacheKey(term), JSON.stringify({ savedAt: Date.now(), topics }));
    } catch {
      /* sin espacio: simplemente no se guarda en caché */
    }
  }
}
