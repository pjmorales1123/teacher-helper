import type { PptxEditorApi } from '@betteroffice/pptx-react';

export type Handle = PptxEditorApi['handle'];
const EMU_PER_IN = 914400;

export interface Box {
  id: string; slide: number; slideId: string; shapeId: string; storyId: string;
  text: string; name: string; wIn: number; hIn: number; fontPt: number | null; capacity: number | null;
}
export interface DeckSlide { n: number; id: string; title: string | null; notes: string; layout: string | null; boxes: Box[] }

/** Rough characters that fit a box at a font size: ~0.5 em per character, 1.2 em line height. */
export function capacity(wIn: number, hIn: number, pt: number): number | null {
  if (!(wIn > 0 && hIn > 0 && pt > 0)) return null;
  const perLine = Math.floor((wIn * 72 * 0.92) / (0.5 * pt));
  const lines = Math.max(1, Math.floor((hIn * 72 * 0.9) / (1.2 * pt)));
  return perLine * lines;
}

type ShapeLike = { id: string; name: string; width: number; height: number; inherited?: { width?: number; height?: number } | null; children?: ShapeLike[] };
function flatten(shapes: ShapeLike[], out = new Map<string, ShapeLike>()) {
  for (const s of shapes) { out.set(s.id, s); if (Array.isArray(s.children)) flatten(s.children, out); }
  return out;
}

/** Reads the whole deck with stable box ids ("S2.T3" = slide 2, third text box in reading order). */
export function readDeck(h: Handle): DeckSlide[] {
  const snap = h.snapshot();
  const read = h.readContent();
  if (!read.ok) throw new Error('Could not read the slides.');
  const slides: DeckSlide[] = snap.slides.map((s, i) => ({
    n: i + 1, id: s.id, title: s.title ?? null, notes: s.notes ?? '', layout: s.layout?.name ?? null, boxes: [],
  }));
  const byId = new Map(slides.map((s) => [s.id, s]));
  const shapes = new Map(snap.slides.map((s) => [s.id, flatten(s.shapes as unknown as ShapeLike[])]));
  for (const st of read.stories) {
    const slide = byId.get(st.slideId);
    if (!slide) continue;
    const sh = shapes.get(st.slideId)?.get(st.shapeId);
    const wIn = (sh?.width || sh?.inherited?.width || 0) / EMU_PER_IN;
    const hIn = (sh?.height || sh?.inherited?.height || 0) / EMU_PER_IN;
    let fontPt: number | null = null;
    try { fontPt = h.story(st.storyId).paragraphs[0]?.runs[0]?.style.fontSizePt ?? null; } catch { /* inherited size */ }
    slide.boxes.push({
      id: `S${slide.n}.T${slide.boxes.length + 1}`, slide: slide.n, slideId: st.slideId, shapeId: st.shapeId, storyId: st.storyId,
      text: st.text, name: sh?.name ?? 'text', wIn, hIn, fontPt, capacity: capacity(wIn, hIn, fontPt ?? 18),
    });
  }
  return slides;
}

/** The deck as the AI sees it. */
export function deckContext(slides: DeckSlide[]): string {
  return slides.map((s) => {
    const head = `## Slide ${s.n}${s.title ? `: ${s.title}` : ''}${s.layout ? ` (layout: ${s.layout})` : ''}`;
    const boxes = s.boxes.map((b) => {
      const size = b.wIn ? `${b.wIn.toFixed(1)}x${b.hIn.toFixed(1)}in` : 'size ?';
      const font = b.fontPt ? `${b.fontPt}pt` : 'font inherited';
      return `[${b.id}] (${b.name}, ${size}, ${font}${b.capacity ? `, fits ~${b.capacity} chars` : ''}) ${b.text.replace(/\n/g, ' / ')}`;
    });
    return [head, ...boxes, s.notes ? `NOTES: ${s.notes.replace(/\n/g, ' / ')}` : 'NOTES: (none)'].join('\n');
  }).join('\n\n');
}
