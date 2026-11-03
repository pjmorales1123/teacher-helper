import type { DocxEditorRef } from '@betteroffice/docx-react';
import type { AiEdit, AiResult } from '../../lib/types';
import { describeOp, short } from '../describe';
import { AI_AUTHOR, runEach, type EngineHandle, type ProposeReport } from '../engine';
import { buildDocxContext } from './context';
import { runDocxOp } from './ops';
import { prepareNewParagraphs, removeEmptyCreated } from './paragraphs';
import { planDocxEdits, type PlannedProposal } from './plan';

type Ref = { current: DocxEditorRef | null };
const STORY = 'body';

const ensure = <T extends { ok: boolean }>(r: T, what: string): Extract<T, { ok: true }> => {
  if (!r.ok) throw new Error(`${what} failed: ${JSON.stringify((r as any).failure ?? r)}`);
  return r as Extract<T, { ok: true }>;
};

/** Word adapter: paragraphs become "[paraId] <Style> text" lines; edits become reviewable proposals. */
export function createDocxHandle(ref: Ref): EngineHandle {
  const created = new Map<string, string>();
  const editor = () => {
    if (!ref.current) throw new Error('The document is still loading.');
    return ref.current;
  };
  const version = async () => ensure(await editor().readParagraphs({ view: 'accepted', paraIds: [] }), 'Reading version').version;
  const suggest = () => ({ author: AI_AUTHOR, date: new Date().toISOString() });

  /** Host proposals are atomic per round: drop a refused one and retry the rest. */
  async function stageProposals(list: PlannedProposal[], failed: { edit: AiEdit; reason: string }[]): Promise<number> {
    const ed = editor();
    const { sessionId } = await ed.getParagraphIdentities();
    let pending = list;
    while (pending.length) {
      const proposals = pending.map((p) => {
        const base = { id: p.id, paragraph: { kind: 'session' as const, sessionId, story: STORY, paraId: p.paraId }, suggest: suggest() };
        return p.find
          ? { ...base, op: 'replaceText' as const, search: p.find, replaceWith: p.text, occurrence: 'first' as const }
          : { ...base, op: 'insertText' as const, at: 'end' as const, text: p.text };
      });
      const res = await ed.proposeChanges({ expectVersion: await version(), proposals });
      if (res.ok) return pending.length;
      const bad = pending.find((p) => p.id === res.failure.proposalId);
      if (!bad) { failed.push(...pending.map(({ edit }) => ({ edit, reason: res.failure.code }))); return 0; }
      failed.push({ edit: bad.edit, reason: res.failure.code === 'missing-target' ? 'text not found' : res.failure.code });
      pending = pending.filter((p) => p !== bad);
    }
    return 0;
  }

  /** Turns accepted/rejected suggestions into plain text and removes emptied new paragraphs. */
  async function settle() {
    const ed = editor();
    const snap = await ed.getProposals();
    const settled = snap.proposals.filter((p) => p.state !== 'proposed').map((p) => p.id);
    if (settled.length) ensure(await ed.withdrawProposals({ expectVersion: snap.version, ids: settled }), 'Settling proposals');
    await removeEmptyCreated(ed, created);
  }

  return {
    async snapshot() {
      const ed = editor();
      const sel = await ed.readSelectionInfo().catch(() => null);
      return { context: await buildDocxContext(ed), selection: sel?.selectedText || undefined };
    },

    async propose(result: AiResult, turnId: string): Promise<ProposeReport> {
      const { proposals, inserts } = planDocxEdits(result.edits, turnId);
      const all = await editor().readParagraphs({ view: 'accepted' });
      const texts = new Map(all.ok ? all.paragraphs.map((p) => [p.paraId, p.text]) : []);
      const namer = (id: string) => (texts.get(id) ? `“${short(texts.get(id)!, 32)}”` : id);
      const failed: { edit: AiEdit; reason: string }[] = [];
      const fills = await prepareNewParagraphs(editor(), inserts, turnId, created, failed);
      const staged = await stageProposals([...proposals, ...fills], failed);
      await removeEmptyCreated(editor(), created);
      return {
        staged,
        pending: result.ops.map((op, i) => ({ id: `${turnId}-op${i}`, label: describeOp(op, namer), op })),
        failed: failed.map((f) => ({ label: `${f.edit.target}: “${f.edit.find || f.edit.replace}”`, reason: f.reason })),
      };
    },

    async applyPending(changes) {
      await settle(); // decided suggestions become plain text first, so they never block formatting
      return runEach(changes, (op) => runDocxOp(editor(), op));
    },

    async decideAll(accept: boolean) {
      const ed = editor();
      const snap = await ed.getProposals();
      const changes = snap.proposals.filter((p) => p.state === 'proposed').map((p) => ({ id: p.id, state: accept ? 'accepted' as const : 'rejected' as const }));
      if (!changes.length) return;
      const res = ensure(await ed.setProposalStates({ expectVersion: snap.version, expectPreviewVersion: snap.previewVersion, changes }), 'Deciding');
      if (!accept) {
        ensure(await ed.withdrawProposals({ expectVersion: res.snapshot.version, ids: changes.map((c) => c.id) }), 'Withdrawing');
        await removeEmptyCreated(ed, created);
      }
    },

    async save() {
      const ed = editor();
      await settle(); // undecided suggestions stay as tracked changes Word can review
      const bytes = await ed.save();
      if (!bytes) throw new Error('The editor could not export the document.');
      return new Uint8Array(bytes);
    },
  };
}
