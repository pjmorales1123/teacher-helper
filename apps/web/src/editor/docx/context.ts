import type { DocxEditorRef } from '@betteroffice/docx-react';
import { clip } from '../engine';
import { STORY, styleIds, syncParts, tableCells } from './session';

const TWIPS = 1440;
const inch = (twips?: number) => (twips ? `${(twips / TWIPS).toFixed(2)}"` : '?');

/** Page size and margins of the first section, in inches, so the AI can judge DepEd page setup. */
function pageLine(ses: ReturnType<typeof syncParts>['ses']): string {
  const s = ses.listSections()[0]?.authored as Record<string, number> | undefined;
  if (!s) return '';
  return `PAGE: ${inch(s.pageWidth)} x ${inch(s.pageHeight)}, margins top ${inch(s.marginTop)} bottom ${inch(s.marginBottom)} left ${inch(s.marginLeft)} right ${inch(s.marginRight)}`;
}

/** Everything the AI sees about a Word document: paragraphs with ids and styles, tables, styles, page. */
export async function buildDocxContext(ed: DocxEditorRef): Promise<string> {
  const { ses } = syncParts(ed);
  const read = await ed.readParagraphs({ view: 'accepted' });
  if (!read.ok) throw new Error('Could not read the document.');
  const lines = read.paragraphs.map((p) => {
    const tags = [p.styleId ? `<${p.styleId}>` : '', p.list ? '{list}' : ''].filter(Boolean).join(' ');
    return `[${p.paraId}]${tags ? ` ${tags}` : ''} ${p.text}`;
  });
  const tables: string[] = [];
  let n = 0;
  for (const cells of tableCells(ses.storyIds()).values()) {
    if (!cells[0]?.story.startsWith(`${STORY}:`)) continue;
    n += 1;
    const rows = new Map<number, string[]>();
    for (const c of cells) {
      const r = await ed.readParagraphs({ view: 'accepted', story: c.story });
      const text = r.ok ? r.paragraphs.map((p) => p.text).join(' ') : '';
      rows.set(c.row, [...(rows.get(c.row) ?? []), text]);
    }
    tables.push(`[TABLE ${n}] ${[...rows.values()].map((r) => r.join(' | ')).join(' // ')}`);
  }
  const styles = styleIds(ed);
  return clip([
    `STYLES: ${styles.slice(0, 60).join(', ')}`,
    pageLine(ses),
    '',
    ...lines,
    ...(tables.length ? ['', ...tables] : []),
  ].join('\n'));
}
