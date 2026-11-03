import type { XlsxAsyncEditorApi } from '@betteroffice/xlsx-react';
import type { AiOp } from '../../lib/types';
import { parseA1, parseRange } from './a1';

const NAMED = new Set(['automatic', 'plainText', 'number', 'percent', 'scientific', 'currency', 'date', 'time']);

export async function catalog(api: XlsxAsyncEditorApi) {
  const r = await api.readCells({ ranges: [] });
  if (!r.ok) throw new Error('Could not read the workbook.');
  return r;
}

/** Expands a "cells" op into per-cell proposal inputs (row, col are zero-based). */
export function cellsToInputs(op: AiOp, names: string[]) {
  const bang = op.target!.lastIndexOf('!');
  const range = parseRange(op.target!, names);
  const start = parseA1(op.target!.slice(bang + 1).split(':')[0]);
  if (!range || !start) throw new Error(`Unknown cell ${op.target}`);
  return op.rows!.flatMap((row, r) => row.map((input, c) => ({ sheet: range.sheet, row: start.row + r, col: start.col + c, input })));
}

/** Applies an approved styling or number-format change as one undo step. */
export async function runXlsxOp(api: XlsxAsyncEditorApi, op: AiOp): Promise<void> {
  const cat = await catalog(api);
  const range = parseRange(op.target!, cat.sheets.map((s) => s.name));
  if (!range) throw new Error(`Unknown range ${op.target}`);
  const target = { sheetId: cat.sheets[range.sheet].sheetId, range: { kind: 'a1' as const, a1: range.a1 } };
  let step;
  if (op.op === 'style') {
    const patch = {
      ...(op.bold !== undefined && { bold: op.bold }), ...(op.italic !== undefined && { italic: op.italic }),
      ...(op.fontSize && { fontSize: op.fontSize }), ...(op.fontFamily && { fontFamily: op.fontFamily }),
      ...(op.color && { textColor: `#${op.color}` }), ...(op.fill && { fillColor: `#${op.fill}` }),
      ...(op.align && op.align !== 'justify' && { horizontalAlignment: op.align }),
      ...(op.valign && { verticalAlignment: op.valign }), ...(op.wrap !== undefined && { textWrapping: op.wrap ? 'wrap' as const : 'overflow' as const }),
      ...(op.border && { border: { preset: op.border, style: 'solid' as const } }),
    };
    step = { op: 'patchStyle' as const, target, patch };
  } else if (op.op === 'numberFormat') {
    const f = op.numberFormat ?? '';
    step = { op: 'setNumberFormat' as const, target, format: NAMED.has(f) ? f as 'number' : { type: 'custom' as const, pattern: f } };
  } else {
    throw new Error(`Excel cannot do "${op.op}" here.`);
  }
  const res = await api.applyEdits({ expectVersion: cat.version, steps: [step] } as Parameters<XlsxAsyncEditorApi['applyEdits']>[0]);
  if (!res.ok) throw new Error(`${res.failure.code}: ${res.failure.message ?? ''}`);
}
