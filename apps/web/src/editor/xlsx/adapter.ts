import type { XlsxAsyncEditorApi } from '@betteroffice/xlsx-react';
import type { AiResult } from '../../lib/types';
import { describeOp } from '../describe';
import { clip, runEach, type EngineHandle, type ProposeReport } from '../engine';
import { parseTarget } from './a1';
import { cellsToInputs, runXlsxOp } from './ops';

type Ref = { current: XlsxAsyncEditorApi | null };
const READ_RANGE = 'A1:AZ400';
/** "0!A1:H9" -> "Written Works A1:H9" for the approval list. */
const sheetNamer = (names: string[]) => (t: string) => t.replace(/^(\d+)!/, (_, i) => `${names[Number(i)] ?? `Sheet ${i}`} `);

/** Excel adapter: sheets become row lines with cell addresses and formulas; edits become cell proposals. */
export function createXlsxHandle(ref: Ref): EngineHandle {
  const proposalIds = new Set<string>();
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
        return `## Sheet ${i}: ${read.sheets[i]?.name}\n${rows.join('\n') || '(empty)'}`;
      });
      return { context: clip(`Cells are listed as ADDRESS=value. Formulas show as ADDRESS={formula}→result.\n\n${parts.join('\n\n')}`) };
    },

    async propose(result: AiResult, turnId: string): Promise<ProposeReport> {
      const read = await readAll();
      const names = read.sheets.map((s) => s.name);
      const failed: ProposeReport['failed'] = [];
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
        const res = await api().proposeChanges!({ agentId: 'guro-buddy', note: `AI turn ${turnId}`, edits: staged });
        if (!res.ok) return { staged: 0, pending, failed: [...failed, { label: `${staged.length} cell change(s)`, reason: 'refused by the workbook' }] };
        proposalIds.add(res.proposal.id);
        await api().commands.execute('proposalsPanel', { open: true }).catch(() => {});
      }
      return { staged: staged.length, pending, failed };
    },

    applyPending: (changes) => runEach(changes, (op) => runXlsxOp(api(), op)),

    async decideAll(accept: boolean) {
      for (const proposalId of [...proposalIds]) {
        const r = accept
          ? await api().commands.execute('proposalAccept', { proposalId, force: true })
          : await api().commands.execute('proposalReject', { proposalId });
        if (r.ok || r.failure.code === 'proposal-not-found') proposalIds.delete(proposalId);
      }
    },

    async save() {
      return api().save();
    },
  };
}
