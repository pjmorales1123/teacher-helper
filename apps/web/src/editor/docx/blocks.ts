import type { DocxEditorRef } from '@betteroffice/docx-react';
import type { AiOp } from '../../lib/types';
import { paragraphText, setAttrs, STORY, syncParts, textWidthTwips, tick, wholeParagraph } from './session';

const isNameRow = (row: string[]) => row.some((c) => /[A-Z]/.test(c)) && row.every((c) => !/[a-z]/.test(c));

/** Splits after `after` and returns the new paragraph id (session-made paragraphs keep tabs and keep-with-next). */
async function newParagraphAfter(ed: DocxEditorRef, after: string): Promise<string> {
  const { ses } = syncParts(ed);
  const rc = ses.splitParagraph({ story: STORY, paraId: after, offset: (await paragraphText(ed, after)).length });
  ses.applyParagraphStyle(wholeParagraph(rc.secondParaId, 0), 'Normal');
  ses.setParagraphAttrs(wholeParagraph(rc.secondParaId, 0), { numPr: null, indentLeft: 0, indentFirstLine: 0, alignment: 'left' });
  return rc.secondParaId;
}

/** Splits at the start of `target`: the empty first half becomes a new Normal paragraph before it. */
async function newParagraphBefore(ed: DocxEditorRef, target: string): Promise<string> {
  const { ses } = syncParts(ed);
  const rc = ses.splitParagraph({ story: STORY, paraId: target, offset: 0 });
  ses.applyParagraphStyle(wholeParagraph(rc.firstParaId, 0), 'Normal');
  ses.setParagraphAttrs(wholeParagraph(rc.firstParaId, 0), { numPr: null, indentLeft: 0, indentFirstLine: 0 });
  return rc.firstParaId;
}

/**
 * Signatories side by side: one line per row, columns centered on evenly spaced center tab stops,
 * ALL-CAPS name rows bold with signature space above, and keep-with-next so the block never splits.
 */
export async function signatories(ed: DocxEditorRef, op: AiOp): Promise<void> {
  const rows = op.rows!;
  const cols = rows[0].length;
  const width = textWidthTwips(ed);
  const tabs = Array.from({ length: cols }, (_, i) => ({ position: Math.round((width * (2 * i + 1)) / (2 * cols)), alignment: 'center' as const }));
  const { pe, ses } = syncParts(ed);
  let last = op.target!;
  const ids: string[] = [];
  for (const row of rows) {
    const id = await newParagraphAfter(ed, last);
    const text = cols === 1 ? row[0] : `\t${row.join('\t')}`;
    if (text) ses.insertText({ story: STORY, paraId: id, offset: 0 }, text);
    ids.push(id);
    last = id;
  }
  await setAttrs(ed, op.target!, {}, { keepNext: true }); // keep the last line above with the block
  for (const [i, id] of ids.entries()) {
    const name = isNameRow(rows[i]);
    await setAttrs(ed, id, { ...(cols === 1 ? { alignment: 'center' as const } : { tabs }), spaceBefore: name && i > 0 && rows[i - 1].every((c) => c) ? 480 : 0, spaceAfter: 0 },
      i < ids.length - 1 ? { keepNext: true } : undefined);
    if (name) ses.formatRange(wholeParagraph(id, (await paragraphText(ed, id)).length), { bold: true });
  }
  pe.syncYrsInputState(true);
  await tick(80);
}

/** A picture from an allowed folder, in its own aligned paragraph after the target, sized in inches. */
export async function image(ed: DocxEditorRef, op: AiOp): Promise<void> {
  const res = await fetch(`/api/files/image?path=${encodeURIComponent(op.path!)}`);
  if (!res.ok) throw new Error('That picture is not in the folders Guro Buddy may read.');
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const src = await new Promise<string>((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = bad; r.readAsDataURL(blob); });
  const widthIn = op.width ?? Math.min(bitmap.width / 96, 6);
  const width = Math.round(widthIn * 96);
  const height = Math.round((width * bitmap.height) / bitmap.width);
  const { pe, ses } = syncParts(ed);
  const id = op.placement === 'before' ? await newParagraphBefore(ed, op.target!) : await newParagraphAfter(ed, op.target!);
  ses.insertImage({ story: STORY, paraId: id, offset: 0 }, {
    src, alt: op.path!.split(/[\\/]/).pop() ?? 'picture', width, height,
    wrapType: 'inline', displayMode: 'inline', distTop: 0, distBottom: 0, distLeft: 0, distRight: 0,
  });
  const align = { left: 'left', center: 'center', right: 'right', justify: 'center' } as const;
  ses.setParagraphAttrs(wholeParagraph(id, 1), { alignment: align[op.align ?? 'center'] });
  pe.syncYrsInputState(true);
  await tick(80);
}
