import { configureDefaultFonts } from '@betteroffice/docx/layout';
import type { PptxFontFace } from '@betteroffice/pptx';

/** Word layout uses metric-compatible open fonts so pagination matches Word. Loaded lazily, same origin. */
configureDefaultFonts({ load: () => import('@betteroffice/fonts') });

let pptxFonts: Promise<PptxFontFace[]> | null = null;

/** The slide editor needs font bytes up front. Office names map to their open metric twins. */
export function loadPptxFonts(): Promise<PptxFontFace[]> {
  pptxFonts ??= (async () => {
    const fonts = await import('@betteroffice/fonts');
    const wanted: [string, string][] = [['Calibri', 'Carlito'], ['Arial', 'Liberation Sans'], ['Cambria', 'Caladea'], ['Times New Roman', 'Liberation Serif']];
    const out: PptxFontFace[] = [];
    for (const [office, open] of wanted) {
      for (const bold of [false, true]) {
        const face = fonts.BUNDLED_FONTS.find((f) => f.family === open && f.weight === (bold ? 700 : 400) && f.style === 'normal');
        if (!face) continue;
        const bytes = new Uint8Array(await fonts.loadBundledFontBytes(face));
        out.push({ family: office, bold, bytes }, { family: open, bold, bytes });
      }
    }
    return out;
  })();
  return pptxFonts;
}
