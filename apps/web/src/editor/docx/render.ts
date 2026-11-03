const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Captures the editor's own page canvases (what the teacher sees) as PNG data URLs.
 * Pages paint lazily, so each one is scrolled into view briefly; the scroll position is restored.
 */
export async function renderDocxPages(max = 20): Promise<string[]> {
  const pages = [...document.querySelectorAll<HTMLElement>('.canvas-page')];
  const scroller = pages[0]?.closest<HTMLElement>('[class*="scroll"], [style*="overflow"]') ?? document.scrollingElement as HTMLElement | null;
  const top = scroller?.scrollTop ?? 0;
  const out: string[] = [];
  for (let n = 0; n < Math.min(pages.length, max); n++) {
    pages[n].scrollIntoView({ block: 'start' });
    // The editor can replace a page's canvas (e.g. after a picture is added), so look it up on every read.
    const current = () => document.querySelectorAll<HTMLElement>('.canvas-page')[n]?.querySelector('canvas') ?? null;
    let canvas: HTMLCanvasElement | null = null;
    for (let i = 0; i < 20 && !canvas; i++) { await wait(100); canvas = current(); }
    if (canvas) out.push(await shrink(await settled(current)));
  }
  if (scroller) scroller.scrollTop = top;
  return out;
}

/**
 * Pages are painted off-screen: text first, pictures once decoded. Wait until two frames match
 * (at most ~3 s) so the check sees what the teacher sees.
 */
async function settled(current: () => HTMLCanvasElement | null): Promise<HTMLCanvasElement> {
  let last = '';
  let canvas = current()!;
  for (let i = 0; i < 10; i++) {
    await wait(300);
    canvas = current() ?? canvas;
    const now = canvas.toDataURL('image/jpeg', 0.3);
    if (now === last) break;
    last = now;
  }
  return canvas;
}

/**
 * Pages are sent at about 1000 px wide as JPEG so 20 of them stay small. The page canvas is driven off-screen,
 * so it is read through toDataURL (drawImage of such a canvas can return an older frame).
 */
async function shrink(canvas: HTMLCanvasElement, width = 1000): Promise<string> {
  const png = canvas.toDataURL('image/png');
  const bmp = await createImageBitmap(await (await fetch(png)).blob());
  const scale = Math.min(1, width / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}
