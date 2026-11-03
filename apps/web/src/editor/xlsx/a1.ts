/** "B5" -> { row: 4, col: 1 } (zero-based), or null when it is not a single cell address. */
export function parseA1(a1: string): { row: number; col: number } | null {
  const m = /^\$?([A-Z]{1,3})\$?(\d{1,7})$/i.exec(a1.trim());
  if (!m) return null;
  let col = 0;
  for (const ch of m[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: Number(m[2]) - 1, col: col - 1 };
}

/** "0!B5" or "Sheet1!B5" -> sheet index plus cell. Sheet names resolve through `names`. */
export function parseTarget(target: string, names: string[]): { sheet: number; row: number; col: number; a1: string } | null {
  const bang = target.lastIndexOf('!');
  const sheetPart = bang >= 0 ? target.slice(0, bang).replace(/^'|'$/g, '') : '0';
  const cell = parseA1(bang >= 0 ? target.slice(bang + 1) : target);
  if (!cell) return null;
  const sheet = /^\d+$/.test(sheetPart) ? Number(sheetPart) : names.indexOf(sheetPart);
  if (sheet < 0 || sheet >= names.length) return null;
  return { sheet, ...cell, a1: target.slice(bang + 1).toUpperCase() };
}

/** "0!A1:G1" or "Sheet1!B2" -> sheet index and the A1 range text (single cells become "B2:B2"). */
export function parseRange(target: string, names: string[]): { sheet: number; a1: string } | null {
  const bang = target.lastIndexOf('!');
  const sheetPart = bang >= 0 ? target.slice(0, bang).replace(/^'|'$/g, '') : '0';
  const [from, to = from] = (bang >= 0 ? target.slice(bang + 1) : target).toUpperCase().split(':');
  if (!parseA1(from) || !parseA1(to)) return null;
  const sheet = /^\d+$/.test(sheetPart) ? Number(sheetPart) : names.indexOf(sheetPart);
  if (sheet < 0 || sheet >= names.length) return null;
  return { sheet, a1: `${from}:${to}` };
}
