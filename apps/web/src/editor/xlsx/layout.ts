import type { WorkbookHandle } from '@betteroffice/xlsx';

const letters = (c: number): string => (c < 26 ? String.fromCharCode(65 + c) : letters(Math.floor(c / 26) - 1) + String.fromCharCode(65 + (c % 26)));
const a1 = (p: { row: number; col: number }) => `${letters(p.col)}${p.row + 1}`;

/** Column widths (in characters, as Excel shows them) and merged ranges, so the AI knows the sheet's layout. */
export function sheetLayout(h: WorkbookHandle, sheet: number, cols: number, rows: number): string {
  const widths: string[] = [];
  for (let c = 0; c < Math.min(cols, 52); c++) {
    try {
      const px = h.cellRect(sheet, 0, c).w;
      widths.push(`${letters(c)}=${Math.max(0, Math.round(((px - 5) / 7) * 10) / 10)}`);
    } catch { break; }
  }
  let merges = '';
  try {
    merges = h.mergedRanges(sheet, `A1:${letters(Math.max(cols, 1) - 1)}${Math.max(rows, 1)}`)
      .map((m) => `${a1(m.start)}:${a1(m.end)}`).join(', ');
  } catch { /* older cores */ }
  return `COLUMN WIDTHS (characters): ${widths.join(' ') || 'default'}\nMERGED: ${merges || 'none'}`;
}

/** PNG of every sheet (active first), restoring the sheet the teacher was on. */
export function renderSheets(h: WorkbookHandle, max = 4): Uint8Array[] {
  const info = h.sheetInfo();
  const order = [info.activeSheet, ...info.sheetNames.map((_, i) => i).filter((i) => i !== info.activeSheet)].slice(0, max);
  const out: Uint8Array[] = [];
  try {
    for (const i of order) {
      h.setActiveSheet(i);
      try { out.push(h.renderRangePng({ scale: 1 })); } catch { /* empty sheet */ }
    }
  } finally { h.setActiveSheet(info.activeSheet); }
  return out;
}

const colNum = (l: string) => [...l].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
/** Splits "A1:G3" into row runs that skip cells covered by a merge (the merge's top-left cell stays). */
export function visibleParts(h: WorkbookHandle, sheet: number, range: string): string[] {
  let merges: { start: { row: number; col: number }; end: { row: number; col: number } }[] = [];
  try { merges = h.mergedRanges(sheet, range); } catch { return [range]; }
  if (!merges.length) return [range];
  const [a, b] = range.split(':').map((x) => { const m = /^([A-Z]+)(\d+)$/.exec(x)!; return { row: Number(m[2]) - 1, col: colNum(m[1]) }; });
  const hidden = (r: number, c: number) => merges.some((m) => r >= m.start.row && r <= m.end.row && c >= m.start.col && c <= m.end.col && !(r === m.start.row && c === m.start.col));
  const out: string[] = [];
  for (let r = a.row; r <= b.row; r++) {
    let start = -1;
    for (let c = a.col; c <= b.col + 1; c++) {
      const open = c <= b.col && !hidden(r, c);
      if (open && start < 0) start = c;
      if (!open && start >= 0) { out.push(`${a1({ row: r, col: start })}:${a1({ row: r, col: c - 1 })}`); start = -1; }
    }
  }
  return out;
}
