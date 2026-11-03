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
