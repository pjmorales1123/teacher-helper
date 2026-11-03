const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Captures the editor's own page canvases (what the teacher sees) as PNG data URLs.
 * Pages paint lazily, so each one is scrolled into view briefly; the scroll position is restored.
 */
export async function renderDocxPages(max = 6): Promise<string[]> {
  const pages = [...document.querySelectorAll<HTMLElement>('.canvas-page')];
  const scroller = pages[0]?.closest<HTMLElement>('[class*="scroll"], [style*="overflow"]') ?? document.scrollingElement as HTMLElement | null;
  const top = scroller?.scrollTop ?? 0;
  const out: string[] = [];
  for (const page of pages.slice(0, max)) {
    page.scrollIntoView({ block: 'start' });
    let canvas: HTMLCanvasElement | null = null;
    for (let i = 0; i < 20 && !canvas; i++) { await wait(100); canvas = page.querySelector('canvas'); }
    await wait(250);
    if (canvas) out.push(canvas.toDataURL('image/png'));
  }
  if (scroller) scroller.scrollTop = top;
  return out;
}
