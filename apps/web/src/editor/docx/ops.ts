import type { DocxEditorRef } from '@betteroffice/docx-react';
import type { AiOp } from '../../lib/types';
import { caretAtEnd, command, selectInParagraph, selectRange, setToggle } from './select';
import { paragraphText, STORY, styleIds, syncParts, tableCells, tick, version } from './session';

const ALIGN = { left: 'left', center: 'center', right: 'right', justify: 'both' } as const;
const PAPER = { A4: [11906, 16838], Letter: [12240, 15840], Legal: [12240, 20160] } as const;

async function edit(ed: DocxEditorRef, steps: unknown[]) {
  const res = await ed.applyEdits({ expectVersion: await version(ed), steps } as Parameters<DocxEditorRef['applyEdits']>[0]);
  if (!res.ok) throw new Error(`${res.failure.code}: ${res.failure.message ?? ''}`);
}

async function format(ed: DocxEditorRef, op: AiOp) {
  await selectInParagraph(ed, op.target!, op.find);
  await setToggle(ed, 'bold', op.bold);
  await setToggle(ed, 'italic', op.italic);
  await setToggle(ed, 'underline', op.underline);
  if (op.fontSize) await command(ed, 'fontSize', { points: op.fontSize });
  if (op.fontFamily) await command(ed, 'fontFamily', { family: op.fontFamily });
  if (op.color) await command(ed, 'textColor', { color: { rgb: op.color } });
  if (op.highlight) await command(ed, 'highlightColor', { color: op.highlight });
}

async function paragraph(ed: DocxEditorRef, op: AiOp) {
  await selectRange(ed, op.target!, 0, 0);
  if (op.align) await command(ed, 'alignment', { value: ALIGN[op.align] });
  // 240 = single. A document whose default already matches reports "noop", which is correct.
  if (op.lineSpacing) await command(ed, 'lineSpacing', { value: Math.round(op.lineSpacing * 240) });
  if (op.list) {
    const r = await ed.readParagraphs({ view: 'accepted', paraIds: [op.target!] });
    if (r.ok && !r.paragraphs[0]?.list) await command(ed, op.list === 'bullet' ? 'bulletList' : 'numberedList', null);
  }
}

async function table(ed: DocxEditorRef, op: AiOp) {
  const rows = op.rows!;
  const cols = Math.max(...rows.map((r) => r.length));
  const { ses } = syncParts(ed);
  const before = new Set(ses.storyIds());
  const bodyBefore = new Set(await bodyIds(ed));
  await caretAtEnd(ed, op.target!);
  await command(ed, 'insertTable', { rows: rows.length, columns: cols });
  await tick(120);
  const fresh = [...tableCells(ses.storyIds().filter((s) => !before.has(s))).values()][0] ?? [];
  if (!fresh.length) throw new Error('The table was not created.');
  const steps = [];
  for (const cell of fresh) {
    const text = rows[cell.row]?.[cell.col] ?? '';
    const r = await ed.readParagraphs({ view: 'accepted', story: cell.story });
    const paraId = r.ok ? r.paragraphs[0]?.paraId : undefined;
    if (!paraId) continue;
    if (text) steps.push({ op: 'insertText', target: { kind: 'paragraph', story: cell.story, paraId }, at: 'end', text });
    if (cell.row === 0 && op.styleId) steps.push({ op: 'setParagraphStyle', target: { story: cell.story, paraId }, styleId: op.styleId });
  }
  if (steps.length) await edit(ed, steps);
  // Inserting a table can leave an empty paragraph after it; remove it so the layout stays clean.
  const stray = (await ed.readParagraphs({ view: 'accepted' }));
  for (const p of stray.ok ? stray.paragraphs : []) {
    if (!bodyBefore.has(p.paraId) && p.text === '') await edit(ed, [{ op: 'deleteParagraphs', story: STORY, firstParaId: p.paraId, lastParaId: p.paraId }]).catch(() => undefined);
  }
}

async function bodyIds(ed: DocxEditorRef): Promise<string[]> {
  const r = await ed.readParagraphs({ view: 'accepted' });
  return r.ok ? r.paragraphs.map((p) => p.paraId) : [];
}

async function pageSetup(ed: DocxEditorRef, op: AiOp) {
  const { ses } = syncParts(ed);
  for (const [index, s] of ses.listSections().entries()) {
    const a = s.authored as Record<string, number>;
    let [w, h] = op.paper ? PAPER[op.paper] : [a.pageWidth, a.pageHeight];
    const landscape = op.orientation ? op.orientation === 'landscape' : w > h;
    if (landscape !== w > h) [w, h] = [h, w];
    const m = op.margins ?? {};
    const tw = (v?: number) => (v === undefined ? undefined : Math.round(v * 1440));
    const margins = Object.fromEntries(Object.entries({ top: tw(m.top), bottom: tw(m.bottom), left: tw(m.left), right: tw(m.right) }).filter(([, v]) => v !== undefined));
    const properties = { orientation: landscape ? 'landscape' as const : 'portrait' as const, pageWidth: w, pageHeight: h, ...(Object.keys(margins).length ? { margins } : {}) };
    try {
      await edit(ed, [{ op: 'setSectionProperties', section: s.closingParagraphId, properties }]);
    } catch (e) {
      // A pending suggestion at the section's last paragraph blocks the edit batch; page setup does not
      // touch text, so set it on the document session directly.
      if (!/tracked-revision-conflict/.test((e as Error).message)) throw e;
      const ids: (string | number)[] = [s.closingParagraphId, index, index + 1];
      const done = ids.some((id) => { try { ses.setSectionProperties(id, properties); return true; } catch { return false; } });
      if (!done) throw new Error('Accept or reject the suggestion at the end of the document first, then apply page setup again.');
    }
  }
}

/** Applies one approved Word operation. Throws with a teacher-readable reason on failure. */
export async function runDocxOp(ed: DocxEditorRef, op: AiOp): Promise<void> {
  switch (op.op) {
    case 'style':
      if (!styleIds(ed).includes(op.styleId!)) throw new Error(`This document has no "${op.styleId}" style.`);
      return edit(ed, [{ op: 'setParagraphStyle', target: { story: STORY, paraId: op.target }, styleId: op.styleId }]);
    case 'format': return format(ed, op);
    case 'paragraph': return paragraph(ed, op);
    case 'table': return table(ed, op);
    case 'delete': await paragraphText(ed, op.target!);
      return edit(ed, [{ op: 'deleteParagraphs', story: STORY, firstParaId: op.target, lastParaId: op.to ?? op.target }]);
    case 'pageSetup': return pageSetup(ed, op);
    case 'pageBreak': await caretAtEnd(ed, op.target!); return command(ed, 'insertPageBreak', null);
    default: throw new Error(`Word cannot do "${op.op}".`);
  }
}
