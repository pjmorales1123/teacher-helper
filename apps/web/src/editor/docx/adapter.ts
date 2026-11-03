import type { DocxEditorRef } from '@betteroffice/docx-react';
import type { AiEdit } from '../../lib/types';
import { AI_AUTHOR, clip, type EngineHandle, type ProposeReport } from '../engine';
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
  async function stageProposals(list: PlannedProposal[], failed: ProposeReport['failed']): Promise<number> {
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

  return {
    async snapshot() {
      const ed = editor();
      const read = ensure(await ed.readParagraphs({ view: 'accepted' }), 'Reading the document');
      const lines = read.paragraphs.map((p) => `[${p.paraId}]${p.styleId ? ` <${p.styleId}>` : ''} ${p.text}`);
      const sel = await ed.readSelectionInfo().catch(() => null);
      return { context: clip(lines.join('\n')), selection: sel?.selectedText || undefined };
    },

    async propose(edits: AiEdit[], turnId: string): Promise<ProposeReport> {
      const { proposals, inserts } = planDocxEdits(edits, turnId);
      const failed: ProposeReport['failed'] = [];
      const fills = await prepareNewParagraphs(editor(), inserts, turnId, created, failed);
      const staged = await stageProposals([...proposals, ...fills], failed);
      await removeEmptyCreated(editor(), created);
      return { staged, failed };
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
      // Settle decided proposals; undecided ones stay as tracked changes Word can review.
      const snap = await ed.getProposals();
      const settled = snap.proposals.filter((p) => p.state !== 'proposed').map((p) => p.id);
      if (settled.length) ensure(await ed.withdrawProposals({ expectVersion: snap.version, ids: settled }), 'Settling proposals');
      await removeEmptyCreated(ed, created);
      const bytes = await ed.save();
      if (!bytes) throw new Error('The editor could not export the document.');
      return new Uint8Array(bytes);
    },
  };
}
