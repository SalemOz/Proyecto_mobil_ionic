import { describe, expect, it } from 'vitest';
import { parseTopics } from './health.service';

const ESCAPED = `<?xml version="1.0" encoding="UTF-8"?>
<nlmSearchResult><term>audición</term><count>1</count><list num="1" start="0" per="5">
<document url="https://medlineplus.gov/spanish/hearingdisorders.html" rank="0">
<content name="title">&lt;span class="qt0"&gt;Pérdida&lt;/span&gt; de audición</content>
<content name="organizationName">Biblioteca Nacional de Medicina</content>
<content name="FullSummary">&lt;p&gt;Primer párrafo.&lt;/p&gt;&lt;p&gt;Segundo párrafo con &lt;span class="qt0"&gt;audición&lt;/span&gt;.&lt;/p&gt;</content>
</document></list></nlmSearchResult>`;

const NESTED = `<nlmSearchResult><list>
<document url="https://medlineplus.gov/spanish/tinnitus.html" rank="0">
<content name="title"><span class="qt0">Zumbido</span> de oídos</content>
<content name="FullSummary"><p>Uno.</p><p>Dos.</p></content>
</document></list></nlmSearchResult>`;

describe('parseTopics', () => {
  it('lee el HTML escapado, quita las etiquetas y separa los párrafos', () => {
    const [topic] = parseTopics(ESCAPED);
    expect(topic.title).toBe('Pérdida de audición');
    expect(topic.summary).toBe('Primer párrafo.\n\nSegundo párrafo con audición.');
    expect(topic.url).toBe('https://medlineplus.gov/spanish/hearingdisorders.html');
  });

  it('lee también los elementos XML anidados', () => {
    const [topic] = parseTopics(NESTED);
    expect(topic.title).toBe('Zumbido de oídos');
    expect(topic.summary).toContain('Uno.');
    expect(topic.summary).toContain('Dos.');
  });

  it('descarta enlaces que no son de MedlinePlus y XML inválido', () => {
    expect(parseTopics(NESTED.replace('https://medlineplus.gov', 'https://sitio-falso.com'))).toEqual([]);
    expect(parseTopics('esto no es xml')).toEqual([]);
  });
});
