import type { PptxEditorApi } from '@betteroffice/pptx-react';

export type Handle = PptxEditorApi['handle'];
export const EMU_PER_IN = 914400;

export interface Box {
  id: string; slide: number; slideId: string; shapeId: string; storyId: string;
  text: string; name: string; wIn: number; hIn: number; xIn: number; yIn: number; fontPt: number | null; capacity: number | null;
}
export interface DeckSlide { n: number; id: string; title: string | null; notes: string; layout: string | null; boxes: Box[]; pictures?: string[]; pictureIds?: { id: string; shapeId: string }[] }

/** Rough characters that fit a box at a font size: ~0.5 em per character, 1.2 em line height. */
export function capacity(wIn: number, hIn: number, pt: number): number | null {
  if (!(wIn > 0 && hIn > 0 && pt > 0)) return null;
  const perLine = Math.floor((wIn * 72 * 0.92) / (0.5 * pt));
  const lines = Math.max(1, Math.floor((hIn * 72 * 0.9) / (1.2 * pt)));
  return perLine * lines;
}

type ShapeLike = { id: string; name: string; x: number; y: number; width: number; height: number; inherited?: { x?: number; y?: number; width?: number; height?: number } | null; children?: ShapeLike[] };
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
  snap.slides.forEach((s, i) => {
    const pics = [...flatten(s.shapes as unknown as ShapeLike[]).values()].filter((sh) => (sh as { mediaPartPath?: string | null }).mediaPartPath || (sh as { pendingMedia?: unknown }).pendingMedia);
    slides[i].pictureIds = pics.map((p, j) => ({ id: `S${i + 1}.P${j + 1}`, shapeId: p.id }));
    slides[i].pictures = pics.map((p, j) => `[S${i + 1}.P${j + 1}] ${p.name} (${(p.width / EMU_PER_IN).toFixed(1)}x${(p.height / EMU_PER_IN).toFixed(1)}in at ${(p.x / EMU_PER_IN).toFixed(1)},${(p.y / EMU_PER_IN).toFixed(1)})`);
  });
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
      text: st.text, name: sh?.name ?? 'text', wIn, hIn, fontPt,
      xIn: (sh?.width ? sh.x : sh?.inherited?.x ?? 0) / EMU_PER_IN, yIn: (sh?.width ? sh.y : sh?.inherited?.y ?? 0) / EMU_PER_IN, capacity: capacity(wIn, hIn, fontPt ?? 18),
    });
  }
  return slides;
}

/** The deck as the AI sees it. */
export function deckContext(slides: DeckSlide[], sizeIn?: [number, number], layouts: string[] = []): string {
  const head = (sizeIn ? `SLIDE SIZE: ${sizeIn[0].toFixed(2)} x ${sizeIn[1].toFixed(2)} in\n` : '') + (layouts.length ? `LAYOUTS: ${layouts.join('; ')}\n` : '') + '\n';
  return head + slides.map((s) => {
    const head = `## Slide ${s.n}${s.title ? `: ${s.title}` : ''}${s.layout ? ` (layout: ${s.layout})` : ''}`;
    const boxes = s.boxes.map((b) => {
      const size = b.wIn ? `${b.wIn.toFixed(1)}x${b.hIn.toFixed(1)}in at ${b.xIn.toFixed(1)},${b.yIn.toFixed(1)}` : 'size ?';
      const font = b.fontPt ? `${b.fontPt}pt` : 'font inherited';
      return `[${b.id}] (${b.name}, ${size}, ${font}${b.capacity ? `, fits ~${b.capacity} chars` : ''}) ${b.text.replace(/\n/g, ' / ')}`;
    });
    return [head, ...boxes, ...(s.pictures?.length ? [`PICTURES: ${s.pictures.join('; ')}`] : []), s.notes ? `NOTES: ${s.notes.replace(/\n/g, ' / ')}` : 'NOTES: (none)'].join('\n');
  }).join('\n\n');
}
