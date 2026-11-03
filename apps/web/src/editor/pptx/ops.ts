import type { TextParagraphDraft } from '@betteroffice/pptx';
import type { Handle } from './deck';
import type { SlideChange } from './plan';

/** Rewrites a text box line by line, keeping each line's bullet, alignment and run style from the original. */
export function setLines(h: Handle, storyId: string, lines: string[]) {
  const old = h.story(storyId).paragraphs;
  const drafts: TextParagraphDraft[] = lines.map((text, i) => {
    const tpl = old[Math.min(i, old.length - 1)];
    const st = tpl?.runs[0]?.style;
    const style = st ? Object.fromEntries(Object.entries({ bold: st.bold, italic: st.italic, fontSizePt: st.fontSizePt, color: st.color, fontFamily: st.fontFamily }).filter(([, v]) => v != null)) : undefined;
    return { bullet: tpl ? tpl.bulletJson != null : false, alignment: (tpl?.alignment ?? null) as TextParagraphDraft['alignment'], runs: [{ text, ...(style && Object.keys(style).length ? { style } : {}) }] };
  });
  h.setStoryParagraphs(storyId, drafts);
}

function slideIndex(h: Handle, slideId: string): number {
  const i = h.snapshot().slides.findIndex((s) => s.id === slideId);
  if (i < 0) throw new Error('That slide no longer exists.');
  return i;
}

/** Applies one approved structural slide change. */
export function runPptxChange(h: Handle, c: SlideChange): void {
  const { op, ref } = c;
  if (op.op === 'bullets') return setLines(h, ref.storyId!, op.lines ?? []);
  const from = slideIndex(h, ref.slideId!);
  if (op.op === 'deleteSlide') { h.deleteSlide(ref.slideId!); return; }
  if (op.op === 'moveSlide') { h.moveSlide(ref.slideId!, Math.max(0, (op.position ?? 1) - 1)); return; }
  if (op.op === 'duplicateSlide') {
    const copy = h.duplicateSlide(ref.slideId!, from + 1);
    const read = h.readContent({ slideIds: [copy.slideId] });
    if (!read.ok) throw new Error('Could not read the new slide.');
    for (const [key, ...lines] of ref.rows ?? []) {
      const n = Number(String(key).replace(/^.*T/i, ''));
      const story = read.stories[n - 1];
      if (!story) throw new Error(`The copied slide has no text box ${key}.`);
      setLines(h, story.storyId, lines);
    }
    return;
  }
  throw new Error(`PowerPoint cannot do "${op.op}".`);
}
