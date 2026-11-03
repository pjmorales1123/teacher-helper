import type { ProposalEdit } from '@betteroffice/pptx';
import type { AiOp, AiResult } from '../../lib/types';
import { describeOp, short } from '../describe';
import type { PendingChange, ProposeReport } from '../engine';
import type { Box, DeckSlide } from './deck';

const ALIGN = { left: 'l', center: 'ctr', right: 'r', justify: 'just' } as const;

/**
 * The context shows line breaks as " / ", but real text can contain " / " too (e.g. "12 / 29").
 * Try the text as written first, then with " / " read as a line break. Returns "" when not found.
 */
export function locate(text: string, find: string): string {
  if (!find || text.includes(find)) return find;
  const asLines = find.replace(/ \/ /g, '\n');
  return text.includes(asLines) ? asLines : find;
}

/** Pending slide changes carry ids resolved now, so the order they are approved in never matters. */
export type SlideChange = PendingChange & { ref: { storyId?: string; slideId?: string; rows?: string[][] } };

/** Splits AI output into slide proposals (reviewed on the canvas) and pending structural changes. */
export function planPptx(result: AiResult, deck: DeckSlide[], turnId: string) {
  const boxes = new Map(deck.flatMap((s) => s.boxes).map((b) => [b.id, b]));
  const proposals: { label: string; edit: ProposalEdit }[] = [];
  const pending: SlideChange[] = [];
  const failed: ProposeReport['failed'] = [];
  const namer = (id: string) => { const b = boxes.get(id); return b ? `slide ${b.slide} “${short(b.text.split('\n')[0], 28)}”` : id; };
  const add = (op: AiOp, ref: SlideChange['ref']) => pending.push({ id: `${turnId}-p${pending.length}`, label: describeOp(op, namer), op, ref });

  for (const e of result.edits) {
    const box = boxes.get(e.target);
    const label = `${e.target}: “${e.find || e.replace}”`;
    if (!box) { failed.push({ label, reason: 'unknown text box' }); continue; }
    const find = locate(box.text, e.find);
    const start = find ? box.text.indexOf(find) : box.text.length;
    if (start < 0) { failed.push({ label, reason: 'text not found' }); continue; }
    const next = box.text.slice(0, start) + e.replace + box.text.slice(start + find.length);
    if (/[\r\n]/.test(e.replace)) { add({ op: 'bullets', target: box.id, lines: next.split(/\r?\n/) }, { storyId: box.storyId }); continue; }
    proposals.push({ label, edit: { type: 'replaceText', storyId: box.storyId, start, end: start + find.length, text: e.replace } });
  }

  for (const op of result.ops) {
    const box: Box | undefined = op.target ? boxes.get(op.target) : undefined;
    const slide = op.slide ? deck[op.slide - 1] : undefined;
    const label = describeOp(op, namer);
    if (op.target && !box) { failed.push({ label, reason: 'unknown text box' }); continue; }
    if (op.slide && !slide) { failed.push({ label, reason: `there is no slide ${op.slide}` }); continue; }
    if (op.op === 'format' && box) {
      const found = op.find ? locate(box.text, op.find) : '';
      const start = op.find ? box.text.indexOf(found) : 0;
      if (start < 0) { failed.push({ label, reason: 'text not found' }); continue; }
      const patch = { ...(op.bold !== undefined && { bold: op.bold }), ...(op.italic !== undefined && { italic: op.italic }),
        ...(op.underline !== undefined && { underline: op.underline ? 'sng' : 'none' }), ...(op.fontSize && { fontSizePt: op.fontSize }),
        ...(op.color && { color: op.color }), ...(op.fontFamily && { fontFamily: op.fontFamily }) };
      proposals.push({ label, edit: { type: 'formatText', storyId: box.storyId, start, end: op.find ? start + found.length : box.text.length, patch } });
    } else if (op.op === 'align' && box && op.align) {
      proposals.push({ label, edit: { type: 'setParagraphAlignment', storyId: box.storyId, start: 0, end: box.text.length, alignment: ALIGN[op.align] } });
    } else if (op.op === 'fill' && box && op.fill) {
      proposals.push({ label, edit: { type: 'setShapeFill', slideId: box.slideId, shapeId: box.shapeId, color: op.fill } });
    } else if (op.op === 'notes' && slide) {
      proposals.push({ label, edit: { type: 'setSlideNotes', slideId: slide.id, text: op.text ?? '' } });
    } else if (op.op === 'bullets' && box) {
      add(op, { storyId: box.storyId });
    } else if (['duplicateSlide', 'deleteSlide', 'moveSlide'].includes(op.op) && slide) {
      add(op, { slideId: slide.id, rows: op.rows });
    } else {
      failed.push({ label, reason: 'missing target' });
    }
  }
  return { proposals, pending, failed };
}
