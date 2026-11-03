import type { XlsxEditorApi } from '@betteroffice/xlsx-react';
import type { AiResult } from '../../lib/types';
import { describeOp } from '../describe';
import { clip, runEach, type EngineHandle, type ProposeReport } from '../engine';
import { parseTarget } from './a1';
import { sheetLayout, renderSheets } from './layout';
import { cellsToInputs, runXlsxOp } from './ops';

type Ref = { current: XlsxEditorApi | null };
const READ_RANGE = 'A1:AZ400';
// These change what addresses exist (rows, columns, a new sheet), so the whole turn applies in order after approval.
const SHIFTING = new Set(['insertRows', 'deleteRows', 'insertColumns', 'deleteColumns', 'addSheet']);
/** "0!A1:H9" -> "Written Works A1:H9" for the approval list. */
const sheetNamer = (names: string[]) => (t: string) => t.replace(/^(\d+)!/, (_, i) => `${names[Number(i)] ?? `Sheet ${i}`} `);

function toDataUrl(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:image/png;base64,${btoa(bin)}`;
}

/** Excel adapter: sheets become row lines with cell addresses and formulas; edits become cell proposals. */
export function createXlsxHandle(ref: Ref): EngineHandle {
  const api = () => {
    if (!ref.current) throw new Error('The workbook is still loading.');
    return ref.current;
  };

  async function readAll() {
    const catalog = await api().readCells({ ranges: [] });
    if (!catalog.ok) throw new Error('Could not read the workbook.');
    const ranges = catalog.sheets.map((s) => ({ sheetId: s.sheetId, range: { kind: 'a1' as const, a1: READ_RANGE } }));
    const read = await api().readCells({ ranges });
    if (!read.ok) throw new Error('Could not read the workbook cells.');
    return read;
  }

  return {
    async snapshot() {
      const read = await readAll();
      const parts = read.ranges.map((r, i) => {
        const rows = r.cells
          .map((row) => row.filter((c) => c.displayText !== '' || c.formula))
          .filter((row) => row.length)
          .map((row) => row.map((c) => (c.formula ? `${c.a1}={${c.formula}}→${c.displayText}` : `${c.a1}=${c.displayText}`)).join(' | '));
        const used = r.cells.reduce((m, row) => Math.max(m, row.reduce((n, c, j) => (c.displayText !== '' || c.formula ? j + 1 : n), 0)), 0);
        const lastRow = r.cells.reduce((n, row, j) => (row.some((c) => c.displayText !== '') ? j + 1 : n), 0);
        return `## Sheet ${i}: ${read.sheets[i]?.name}\n${sheetLayout(api().handle, i, used, lastRow)}\n${rows.join('\n') || '(empty)'}`;
      });
      return { context: clip(`Cells are listed as ADDRESS=value. Formulas show as ADDRESS={formula}→result.\n\n${parts.join('\n\n')}`) };
    },

    async propose(result: AiResult, turnId: string): Promise<ProposeReport> {
      const read = await readAll();
      const names = read.sheets.map((s) => s.name);
      const failed: ProposeReport['failed'] = [];
      // Inserting or deleting rows moves every address, so such a turn is applied as one ordered list after approval.
      const ordered = result.ops.some((o) => SHIFTING.has(o.op));
      if (ordered) {
        const ops = [...result.ops, ...result.edits.map((e) => ({ op: 'cells', target: e.target, rows: [[e.replace]] }))];
        return { staged: 0, failed, pending: ops.map((op, i) => ({ id: `${turnId}-op${i}`, label: describeOp(op, sheetNamer(names)), op })) };
      }
      const staged: { sheet: number; row: number; col: number; input: string }[] = [];
      for (const edit of result.edits) {
        const t = parseTarget(edit.target, names);
        const label = `${edit.target} → “${edit.replace}”`;
        if (!t) { failed.push({ label, reason: 'unknown cell' }); continue; }
        const current = read.ranges[t.sheet]?.cells[t.row]?.[t.col];
        const now = current?.displayText ?? '';
        if (edit.find && edit.find.trim() !== now.trim() && edit.find.replace(/^=/, '') !== current?.formula) {
          failed.push({ label, reason: `cell now shows "${now}"` });
          continue;
        }
        staged.push({ sheet: t.sheet, row: t.row, col: t.col, input: edit.replace });
      }
      const pending = [];
      for (const [i, op] of result.ops.entries()) {
        if (op.op !== 'cells') { pending.push({ id: `${turnId}-op${i}`, label: describeOp(op, sheetNamer(names)), op }); continue; }
        try { staged.push(...cellsToInputs(op, names)); } catch (e) { failed.push({ label: describeOp(op), reason: (e as Error).message }); }
      }
      if (staged.length) {
        try {
          api().handle.propose('guro-buddy', `AI turn ${turnId}`, staged);
          api().refreshProposals();
        } catch (e) {
          return { staged: 0, pending, failed: [...failed, { label: `${staged.length} cell change(s)`, reason: (e as Error).message }] };
        }
        await api().commands.execute('proposalsPanel', { open: true }).catch(() => {});
      }
      return { staged: staged.length, pending, failed };
    },

    applyPending: (changes) => runEach(changes, (op) => runXlsxOp(api(), op)),

    async render() {
      return renderSheets(api().handle).map(toDataUrl);
    },

    async decideAll(accept: boolean) {
      const h = api().handle;
      for (const p of h.listProposals()) {
        if (accept) h.acceptProposal(p.id, { force: true });
        else h.rejectProposal(p.id);
      }
      api().refreshProposals();
    },

    async save() {
      await api().flushPendingInput();
      return api().save();
    },
  };
}
