import type { AiOp } from '../../lib/types';
import { parseRange } from './a1';

/** Raw workbook operations (the engine's structural op list: rows, columns, merges, sheets). */
export type RawOp = Record<string, unknown> & { type: string };

export const STRUCTURE_OPS = new Set(['columnWidth', 'rowHeight', 'merge', 'unmerge', 'insertRows', 'deleteRows', 'insertColumns', 'deleteColumns', 'addSheet', 'renameSheet']);

const colIndex = (letters: string) => [...letters.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

function split(target: string, names: string[]) {
  const bang = target.lastIndexOf('!');
  const sheetPart = bang >= 0 ? target.slice(0, bang).replace(/^'|'$/g, '') : '0';
  const sheet = /^\d+$/.test(sheetPart) ? Number(sheetPart) : names.indexOf(sheetPart);
  if (sheet < 0 || sheet >= names.length) throw new Error(`Unknown sheet in ${target}`);
  return { sheet, ref: (bang >= 0 ? target.slice(bang + 1) : target).toUpperCase().replace(/\$/g, '') };
}

/** "0!B:D" or "0!B" -> sheet and zero-based first/last column. */
export function parseCols(target: string, names: string[]) {
  const { sheet, ref } = split(target, names);
  const m = /^([A-Z]{1,3})(?::([A-Z]{1,3}))?$/.exec(ref);
  if (!m) throw new Error(`"${target}" is not a column like 0!B or 0!B:D`);
  const a = colIndex(m[1]), b = colIndex(m[2] ?? m[1]);
  return { sheet, first: Math.min(a, b), last: Math.max(a, b) };
}

/** "0!3:5" or "0!3" -> sheet and zero-based first/last row. */
export function parseRows(target: string, names: string[]) {
  const { sheet, ref } = split(target, names);
  const m = /^(\d{1,7})(?::(\d{1,7}))?$/.exec(ref);
  if (!m) throw new Error(`"${target}" is not a row like 0!3 or 0!3:5`);
  const a = Number(m[1]) - 1, b = Number(m[2] ?? m[1]) - 1;
  if (a < 0 || b < 0) throw new Error('Rows start at 1');
  return { sheet, first: Math.min(a, b), last: Math.max(a, b) };
}

function mergeRange(target: string, names: string[]) {
  const r = parseRange(target, names);
  if (!r) throw new Error(`Unknown range ${target}`);
  const [from, to] = r.a1.split(':').map((a) => {
    const m = /^([A-Z]+)(\d+)$/.exec(a)!;
    return { row: Number(m[2]) - 1, col: colIndex(m[1]) };
  });
  return { sheet: r.sheet, range: { start: from, end: to } };
}

/** Turns one approved structural op into the engine's raw ops. Throws with a teacher-readable reason. */
export function structureOps(op: AiOp, names: string[]): RawOp[] {
  const t = op.target ?? '';
  const count = Math.max(1, Math.min(200, Math.round(op.count ?? 1)));
  switch (op.op) {
    case 'columnWidth': {
      const c = parseCols(t, names);
      return Array.from({ length: c.last - c.first + 1 }, (_, i) => ({ type: 'setColWidth', sheet: c.sheet, col: c.first + i, width: op.size! }));
    }
    case 'rowHeight': {
      const r = parseRows(t, names);
      return Array.from({ length: r.last - r.first + 1 }, (_, i) => ({ type: 'setRowHeight', sheet: r.sheet, row: r.first + i, height: op.size! }));
    }
    case 'merge': return [{ type: 'mergeCells', ...mergeRange(t, names) }];
    case 'unmerge': return [{ type: 'unmergeCells', ...mergeRange(t, names) }];
    case 'insertRows': { const r = parseRows(t, names); return [{ type: 'insertRows', sheet: r.sheet, at: r.first, count }]; }
    case 'deleteRows': { const r = parseRows(t, names); return [{ type: 'deleteRows', sheet: r.sheet, at: r.first, count: r.last - r.first + 1 }]; }
    case 'insertColumns': { const c = parseCols(t, names); return [{ type: 'insertCols', sheet: c.sheet, at: c.first, count }]; }
    case 'deleteColumns': { const c = parseCols(t, names); return [{ type: 'deleteCols', sheet: c.sheet, at: c.first, count: c.last - c.first + 1 }]; }
    case 'addSheet': return [{ type: 'addSheet', index: names.length, name: op.text! }];
    case 'renameSheet': return [{ type: 'renameSheet', sheet: split(`${t}!A1`, names).sheet, name: op.text! }];
    default: throw new Error(`Excel cannot do "${op.op}" here.`);
  }
}
