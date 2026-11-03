import type { XlsxAsyncEditorApi } from '@betteroffice/xlsx-react';
import type { AiEdit } from '../../lib/types';
import { clip, type EngineHandle, type ProposeReport } from '../engine';
import { parseTarget } from './a1';

type Ref = { current: XlsxAsyncEditorApi | null };
const READ_RANGE = 'A1:AZ400';

/** Excel adapter: sheets become row lines with cell addresses and formulas; edits become cell proposals. */
export function createXlsxHandle(ref: Ref): EngineHandle {
  const pending = new Set<string>();
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

    async propose(edits: AiEdit[], turnId: string): Promise<ProposeReport> {
      const read = await readAll();
      const names = read.sheets.map((s) => s.name);
      const failed: ProposeReport['failed'] = [];
      const staged: { sheet: number; row: number; col: number; input: string }[] = [];
      for (const edit of edits) {
        const t = parseTarget(edit.target, names);
        if (!t) { failed.push({ edit, reason: 'unknown cell' }); continue; }
        const current = read.ranges[t.sheet]?.cells[t.row]?.[t.col];
        const now = current?.displayText ?? '';
        if (edit.find && edit.find.trim() !== now.trim() && edit.find.replace(/^=/, '') !== current?.formula) {
          failed.push({ edit, reason: `cell now shows "${now}"` });
          continue;
        }
        staged.push({ sheet: t.sheet, row: t.row, col: t.col, input: edit.replace });
      }
      if (!staged.length) return { staged: 0, failed };
      const propose = api().proposeChanges;
      if (!propose) throw new Error('This editor build cannot stage proposals.');
      const res = await propose.call(api(), { agentId: 'guro-buddy', note: `AI turn ${turnId}`, edits: staged });
      if (!res.ok) return { staged: 0, failed: [...failed, ...edits.map((edit) => ({ edit, reason: 'refused by the workbook' }))] };
      pending.add(res.proposal.id);
      await api().commands.execute('proposalsPanel', { open: true }).catch(() => {});
      return { staged: staged.length, failed };
    },

    async decideAll(accept: boolean) {
      for (const proposalId of [...pending]) {
        const r = accept
          ? await api().commands.execute('proposalAccept', { proposalId, force: true })
          : await api().commands.execute('proposalReject', { proposalId });
        if (r.ok || r.failure.code === 'proposal-not-found') pending.delete(proposalId);
      }
    },

    async save() {
      return api().save();
    },
  };
}
