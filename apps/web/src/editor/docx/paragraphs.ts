import type { DocxEditorRef } from '@betteroffice/docx-react';
import type { ProposeReport } from '../engine';
import type { PlannedInsert, PlannedProposal } from './plan';

const STORY = 'body';

/**
 * New paragraphs cannot be tracked insertions in this engine, so they are added in two steps:
 * empty styled paragraphs first, then their text as normal reviewable proposals.
 * `created` remembers which paragraph belongs to which proposal, for cleanup after a reject.
 */
export async function prepareNewParagraphs(
  ed: DocxEditorRef, inserts: PlannedInsert[], turnId: string,
  created: Map<string, string>, failed: ProposeReport['failed'],
): Promise<PlannedProposal[]> {
  const fills: PlannedProposal[] = [];
  for (const [i, ins] of inserts.entries()) {
    const read = await ed.readParagraphs({ view: 'accepted', paraIds: [] });
    if (!read.ok) { failed.push({ edit: ins.edit, reason: 'document busy' }); continue; }
    const res = await ed.applyEdits({
      expectVersion: read.version, source: 'agent',
      steps: [{ op: 'insertParagraphs', target: { story: STORY, paraId: ins.paraId }, at: 'end',
        paragraphs: ins.paragraphs.map((p) => ({ text: '', ...(p.styleId ? { styleId: p.styleId } : {}) })) }],
    });
    if (!res.ok) { failed.push({ edit: ins.edit, reason: `new paragraphs: ${res.failure.code}` }); continue; }
    res.receipts[0].newParagraphs.forEach((np, k) => {
      const id = `${turnId}-n${i}-${k}`;
      created.set(np.paraId, id);
      fills.push({ id, edit: ins.edit, paraId: np.paraId, find: '', text: ins.paragraphs[k]?.text ?? '' });
    });
  }
  return fills;
}

/** Deletes paragraphs we created whose proposal is gone (rejected or withdrawn) and which are still empty. */
export async function removeEmptyCreated(ed: DocxEditorRef, created: Map<string, string>) {
  if (!created.size) return;
  // Any proposal the engine still holds (proposed, or decided but not yet settled) keeps its paragraph.
  const live = new Set((await ed.getProposals()).proposals.map((p) => p.id));
  const read = await ed.readParagraphs({ view: 'accepted', paraIds: [...created.keys()] });
  if (!read.ok) return;
  for (const p of read.paragraphs) {
    const owner = created.get(p.paraId);
    if (owner && live.has(owner)) continue;
    created.delete(p.paraId);
    if (p.text !== '') continue;
    const v = await ed.readParagraphs({ view: 'accepted', paraIds: [] });
    if (v.ok) await ed.applyEdits({ expectVersion: v.version, steps: [{ op: 'deleteParagraphs', story: STORY, firstParaId: p.paraId, lastParaId: p.paraId }] });
  }
}
