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

export type CellMap = Map<string, { story: string; paraId: string }>;

/** Everything the AI sees about a Word document: paragraphs with ids and styles, tables with cell ids, styles, page. */
export async function buildDocxContext(ed: DocxEditorRef): Promise<{ text: string; cells: CellMap }> {
  const { ses } = syncParts(ed);
  const read = await ed.readParagraphs({ view: 'accepted' });
  if (!read.ok) throw new Error('Could not read the document.');
  const lines = read.paragraphs.map((p) => {
    const tags = [p.styleId ? `<${p.styleId}>` : '', p.list ? '{list}' : ''].filter(Boolean).join(' ');
    const text = p.atoms.reduceRight((t, a) => (a.kind === 'image' ? `${t.slice(0, a.offset)}[IMAGE]${t.slice(a.offset + 1)}` : t), p.text);
    return `[${p.paraId}]${tags ? ` ${tags}` : ''} ${text}`;
  });
  const tables: string[] = [];
  const cellMap: CellMap = new Map();
  let n = 0;
  for (const cells of tableCells(ses.storyIds()).values()) {
    if (!cells[0]?.story.startsWith(`${STORY}:`)) continue;
    n += 1;
    const rows = new Map<number, string[]>();
    for (const c of cells) {
      const r = await ed.readParagraphs({ view: 'accepted', story: c.story });
      const first = r.ok ? r.paragraphs[0] : undefined;
      const id = `T${n}.R${c.row + 1}.C${c.col + 1}`;
      if (first) cellMap.set(id, { story: c.story, paraId: first.paraId });
      const text = r.ok ? r.paragraphs.map((p) => p.text).join(' / ') : '';
      rows.set(c.row, [...(rows.get(c.row) ?? []), `[${id}] ${text}`]);
    }
    tables.push(`[TABLE ${n}]\n${[...rows.values()].map((r) => r.join(' | ')).join('\n')}`);
  }
  const styles = styleIds(ed);
  const text = clip([
    `STYLES: ${styles.slice(0, 60).join(', ')}`,
    pageLine(ses),
    '',
    ...lines,
    ...(tables.length ? ['', ...tables] : []),
  ].join('\n'));
  return { text, cells: cellMap };
}
