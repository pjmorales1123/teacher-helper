import type { DocxEditorRef } from '@betteroffice/docx-react';
import type { AiEdit } from '../../lib/types';
import type { CellMap } from './context';
import type { PlannedInsert, PlannedProposal } from './plan';

const STORY = 'body';

/**
 * New paragraphs cannot be tracked insertions in this engine, so they are added in two steps:
 * empty styled paragraphs first, then their text as normal reviewable proposals.
 * `created` remembers which paragraph belongs to which proposal, for cleanup after a reject.
 */
export async function prepareNewParagraphs(
  ed: DocxEditorRef, inserts: PlannedInsert[], turnId: string,
  created: Map<string, Created>, failed: { edit: AiEdit; reason: string }[], cells: CellMap = new Map(),
): Promise<PlannedProposal[]> {
  const fills: PlannedProposal[] = [];
  for (const [i, ins] of inserts.entries()) {
    // A cell id like "T2.R3.C2" means: add the lines inside that cell, after its last paragraph.
    const cell = cells.get(ins.paraId);
    const loc = cell ?? { story: STORY, paraId: ins.paraId };
    const read = await ed.readParagraphs((cell ? { view: 'accepted', story: loc.story } : { view: 'accepted', paraIds: [ins.paraId] }) as Parameters<DocxEditorRef['readParagraphs']>[0]);
    if (!read.ok) { failed.push({ edit: ins.edit, reason: `could not read the paragraph (${(read as { failure?: { code?: string } }).failure?.code ?? 'busy'})` }); continue; }
    if (cell) loc.paraId = read.paragraphs[read.paragraphs.length - 1]?.paraId ?? cell.paraId;
    // New text after a heading is body text unless the AI named a style; never inherit a heading style.
    const anchorStyle = read.paragraphs[0]?.styleId ?? '';
    const fallback = /^(Heading|Title|Subtitle|TOC)/i.test(anchorStyle) ? 'Normal' : undefined;
    const res = await ed.applyEdits({
      expectVersion: read.version, source: 'agent',
      steps: [{ op: 'insertParagraphs', target: { story: loc.story, paraId: loc.paraId }, at: 'end',
        paragraphs: ins.paragraphs.map((p) => ({ text: '', ...((p.styleId ?? fallback) ? { styleId: p.styleId ?? fallback } : {}) })) }],
    });
    if (!res.ok) { failed.push({ edit: ins.edit, reason: `new paragraphs: ${res.failure.code}` }); continue; }
    res.receipts[0].newParagraphs.forEach((np, k) => {
      const id = `${turnId}-n${i}-${k}`;
      created.set(np.paraId, { id, story: loc.story });
      fills.push({ id, edit: ins.edit, paraId: np.paraId, find: '', text: ins.paragraphs[k]?.text ?? '', ...(cell ? { story: loc.story } : {}) });
    });
  }
  return fills;
}

/** Deletes paragraphs we created whose proposal is gone (rejected or withdrawn) and which are still empty. */
export interface Created { id: string; story: string }

export async function removeEmptyCreated(ed: DocxEditorRef, created: Map<string, Created>) {
  if (!created.size) return;
  // Any proposal the engine still holds (proposed, or decided but not yet settled) keeps its paragraph.
  const live = new Set((await ed.getProposals()).proposals.map((p) => p.id));
  for (const story of new Set([...created.values()].map((c) => c.story))) {
    const ids = [...created].filter(([, c]) => c.story === story).map(([pid]) => pid);
    const read = await ed.readParagraphs((story === STORY ? { view: 'accepted', paraIds: ids } : { view: 'accepted', story }) as Parameters<DocxEditorRef['readParagraphs']>[0]);
    if (!read.ok) continue;
    for (const p of read.paragraphs) {
      const owner = created.get(p.paraId);
      if (!owner || live.has(owner.id)) continue;
      created.delete(p.paraId);
      if (p.text !== '') continue;
      const v = await ed.readParagraphs({ view: 'accepted', paraIds: [] });
      if (v.ok) await ed.applyEdits({ expectVersion: v.version, steps: [{ op: 'deleteParagraphs', story, firstParaId: p.paraId, lastParaId: p.paraId }] });
    }
  }
}
