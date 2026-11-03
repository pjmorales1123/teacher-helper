import type { XlsxEditorApi } from '@betteroffice/xlsx-react';
import type { AiOp } from '../../lib/types';
import { parseA1, parseRange } from './a1';
import { STRUCTURE_OPS, structureOps } from './structure';
import { visibleParts } from './layout';

const NAMED = new Set(['automatic', 'plainText', 'number', 'percent', 'scientific', 'currency', 'date', 'time']);

export async function catalog(api: XlsxEditorApi) {
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

/** Applies an approved styling, number-format or structure change as one undo step. */
export async function runXlsxOp(api: XlsxEditorApi, op: AiOp): Promise<void> {
  const cat = await catalog(api);
  const names = cat.sheets.map((s) => s.name);
  if (op.op === 'cells') {
    const inputs = cellsToInputs(op, names);
    const res = api.handle.editCells(inputs[0].sheet, inputs.map(({ row, col, input }) => ({ row, col, input })));
    if (!res.applied) throw new Error('The workbook refused the cells (merged or protected?)');
    api.refreshProposals();
    return;
  }
  if (STRUCTURE_OPS.has(op.op)) {
    const res = api.handle.applyOps(structureOps(op, names));
    // Widths, heights and merges report "not applied" when nothing changed; that is fine. Inserts must change something.
    if (!res.applied && /^(insert|delete|addSheet)/.test(op.op)) throw new Error('The workbook refused the change (merged or protected cells?)');
    api.refreshProposals();
    return;
  }
  const range = parseRange(op.target!, names);
  if (!range) throw new Error(`Unknown range ${op.target}`);
  const sheetId = cat.sheets[range.sheet].sheetId;
  // Cells hidden under a merge cannot be styled: style only the visible parts of the range.
  const targets = visibleParts(api.handle, range.sheet, range.a1).map((a1) => ({ sheetId, range: { kind: 'a1' as const, a1 } }));
  const steps = targets.map((target) => stepFor(op, target));
  const res = await api.applyEdits({ expectVersion: cat.version, steps } as Parameters<XlsxEditorApi['applyEdits']>[0]);
  if (!res.ok) throw new Error(`${res.failure.code}: ${res.failure.message ?? ''}`);
}

type Target = { sheetId: string; range: { kind: 'a1'; a1: string } };
function stepFor(op: AiOp, target: Target) {
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
  return step;
}
