import { paintSlide, sizeCanvasForSlide } from '@betteroffice/pptx';
import type { Handle } from './deck';

/** Loads picture bytes from the deck (asset ids are media part paths) so pictures appear in the render. */
function imageResolver(h: Handle) {
  const cache = new Map<string, Promise<ImageBitmap | null>>();
  return (assetId: string) => {
    if (!cache.has(assetId)) {
      cache.set(assetId, (async () => {
        try { return await createImageBitmap(new Blob([h.mediaBytes(assetId) as BlobPart])); } catch { return null; }
      })());
    }
    return cache.get(assetId)!;
  };
}

/** Paints slides (1-based numbers) off-screen with the deck's own renderer and returns PNG data URLs. */
export async function renderSlides(h: Handle, slides: number[], max = 6): Promise<string[]> {
  const total = h.snapshot().slides.length;
  const list = [...new Set(slides.filter((n) => n >= 1 && n <= total))].slice(0, max);
  const out: string[] = [];
  for (const n of list.length ? list : [1, 2, 3].filter((n) => n <= total)) {
    const display = h.layoutSlide(n - 1);
    const canvas = document.createElement('canvas');
    const scale = 960 / display.width;
    sizeCanvasForSlide(canvas as unknown as Parameters<typeof sizeCanvasForSlide>[0], display, 1, scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await paintSlide(ctx, display, 1, scale, { resolveImage: imageResolver(h) });
    out.push(canvas.toDataURL('image/png'));
  }
  return out;
}
