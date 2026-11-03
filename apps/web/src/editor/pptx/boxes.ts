import type { TextParagraphDraft } from '@betteroffice/pptx';
import type { AiOp } from '../../lib/types';
import { EMU_PER_IN, type Handle } from './deck';
import { setLines } from './ops';
import type { SlideChange } from './plan';

export const BOX_OPS = new Set(['textBox', 'shape', 'newSlide', 'deleteShape']);
const ALIGN = { left: 'l', center: 'ctr', right: 'r', justify: 'just' } as const;
const emu = (inches: number) => Math.round(inches * EMU_PER_IN);
const rectOf = (op: AiOp) => ({ x: emu(op.left!), y: emu(op.top!), width: emu(op.width!), height: emu(op.height!) });

/** New boxes default to dark text: some themes default to white, which vanishes on a light slide. */
function styleOf(op: AiOp) {
  return Object.fromEntries(Object.entries({ bold: op.bold, italic: op.italic, fontSizePt: op.fontSize, color: `#${op.color ?? '1F2937'}`, fontFamily: op.fontFamily })
    .filter(([, v]) => v !== undefined));
}

/** A blank slide with the wanted layout's background (else a content-type layout), for slides built from text boxes. */
function insertWithLayout(h: Handle, at: number, want?: string) {
  const layouts = h.layouts();
  const pick = layouts.find((l) => l.name?.toLowerCase() === want)
    ?? layouts.find((l) => /title only|blank/i.test(l.name ?? '')) ?? layouts.find((l) => !/title slide/i.test(l.name ?? ''));
  if (pick) { try { return h.insertSlide(at, pick.id); } catch { /* id is not a part path in this deck */ } }
  return h.insertSlide(at);
}

/** Story of a shape just added, so its lines, alignment and style can be set. */
function storyOf(h: Handle, slideId: string, shapeId: string): string | null {
  const read = h.readContent({ slideIds: [slideId] });
  return read.ok ? read.stories.find((s) => s.shapeId === shapeId)?.storyId ?? null : null;
}

/**
 * A new slide in the deck's own design: copy a slide with the wanted layout (one with a title and a body box),
 * keep its first two text boxes, drop everything else, and fill them. The engine's blank insert has no boxes.
 */
function newSlide(h: Handle, op: AiOp): void {
  const snap = h.snapshot();
  const at = Math.max(0, Math.min(snap.slides.length, (op.position ?? snap.slides.length + 1) - 1));
  const want = op.layout?.trim().toLowerCase();
  const read = h.readContent();
  if (!read.ok) throw new Error('Could not read the slides.');
  const storiesOf = (id: string) => read.stories.filter((st) => st.slideId === id);
  const isTitleSlide = (name?: string | null) => /title slide|^title$/i.test(name ?? '');
  const candidates = snap.slides.filter((s) => storiesOf(s.id).length >= (op.lines?.length ? 2 : 1));
  // Copy only a slide with the wanted layout (or any content slide when none was named): copying a title slide
  // would put bullets in a subtitle box.
  const tpl = want
    ? candidates.find((s) => s.layout?.name?.toLowerCase() === want)
    : candidates.find((s) => !isTitleSlide(s.layout?.name));
  if (!tpl) {
    const s = insertWithLayout(h, at, want);
    const w = snap.widthEmu / EMU_PER_IN, ht = snap.heightEmu / EMU_PER_IN;
    const ref = { slideId: s.slideId };
    if (op.text) runBoxChange(h, { id: '', label: '', ref, op: { op: 'textBox', text: op.text, fontSize: 36, bold: true, left: 0.6, top: 0.35, width: w - 1.2, height: 1.1 } });
    if (op.lines?.length) runBoxChange(h, { id: '', label: '', ref, op: { op: 'textBox', lines: op.lines, list: 'bullet', fontSize: 24, left: 0.6, top: 1.6, width: w - 1.2, height: ht - 2.2 } });
    return;
  }
  const copy = h.duplicateSlide(tpl.id, at);
  const again = h.readContent({ slideIds: [copy.slideId] });
  const stories = again.ok ? again.stories : [];
  const keep = new Set(stories.slice(0, op.lines?.length ? 2 : 1).map((st) => st.shapeId));
  const shapes = h.snapshot().slides.find((s) => s.id === copy.slideId)?.shapes ?? [];
  for (const sh of shapes) if (!keep.has(sh.id)) h.removeShape(copy.slideId, sh.id);
  h.setSlideNotes(copy.slideId, '');
  if (op.text && stories[0]) setLines(h, stories[0].storyId, [op.text]);
  if (op.lines?.length && stories[1]) setLines(h, stories[1].storyId, op.lines);
}

function fillStory(h: Handle, storyId: string, lines: string[], op: AiOp) {
  const style = styleOf(op);
  const drafts: TextParagraphDraft[] = lines.map((text) => ({
    ...(op.list === 'bullet' ? { bullet: true } : {}),
    alignment: op.align ? ALIGN[op.align] : null, runs: [{ text, ...(Object.keys(style).length ? { style } : {}) }],
  }));
  h.setStoryParagraphs(storyId, drafts);
  // The live view ignores a color given with new paragraphs until reload; formatting the text applies it at once.
  const length = h.story(storyId).paragraphs.reduce((n, p) => n + p.runs.reduce((m, r) => m + r.text.length, 0), 0) + lines.length - 1;
  if (!Object.keys(style).length) return;
  const p = h.propose('guro-buddy', 'new box style', [{ type: 'formatText', storyId, start: 0, end: length, patch: style }]);
  h.acceptProposal(p.id, { force: true });
}

/** Adds text boxes, shapes and new slides, or removes a box, once the teacher approves. */
export function runBoxChange(h: Handle, c: SlideChange): void {
  const { op, ref } = c;
  if (op.op === 'deleteShape') { h.removeShape(ref.slideId!, ref.shapeId!); return; }
  if (op.op === 'shape') {
    const r = h.addShape(ref.slideId!, { name: `AI ${op.geometry ?? 'rect'}`, geometry: op.geometry ?? 'rect', rect: rectOf(op), fill: op.fill ?? null });
    if (!op.fill) h.setShapeFill(r.slideId, r.shapeId, '1F4E79');
    return;
  }
  if (op.op === 'textBox') {
    const lines = op.lines?.length ? op.lines : [op.text ?? ''];
    const r = h.addTextBox(ref.slideId!, { name: 'AI text box', rect: rectOf(op), text: lines[0], style: styleOf(op) });
    const story = storyOf(h, r.slideId, r.shapeId);
    if (story) fillStory(h, story, lines, op);
    if (op.fill) h.setShapeFill(r.slideId, r.shapeId, op.fill);
    return;
  }
  if (op.op === 'newSlide') return newSlide(h, op);
  throw new Error(`PowerPoint cannot do "${op.op}".`);
}
