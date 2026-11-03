import type { TextParagraphDraft } from '@betteroffice/pptx';
import { EMU_PER_IN, type Handle } from './deck';
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

/** A picture from an allowed folder, keeping its proportions; centered when no position is given. */
export async function addPicture(h: Handle, c: SlideChange): Promise<void> {
  const { op, ref } = c;
  const res = await fetch(`/api/files/image?path=${encodeURIComponent(op.path!)}`);
  if (!res.ok) throw new Error('That picture is not in the folders Guro Buddy may read.');
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const snap = h.snapshot();
  const w = Math.round((op.width ?? 3) * EMU_PER_IN);
  const ht = Math.round((w * bmp.height) / bmp.width);
  const x = op.left !== undefined ? Math.round(op.left * EMU_PER_IN) : Math.round((snap.widthEmu - w) / 2);
  const y = op.top !== undefined ? Math.round(op.top * EMU_PER_IN) : Math.round((snap.heightEmu - ht) / 2);
  h.addPicture(ref.slideId!, { name: op.path!.split(/[\\/]/).pop() ?? 'Picture', rect: { x, y, width: w, height: ht }, contentType: blob.type || 'image/png', mediaBase64: btoa(bin) });
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
