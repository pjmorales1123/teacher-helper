import type { DocxEditorRef } from '@betteroffice/docx-react';
import type { AiEdit } from '../../lib/types';
import type { CellMap } from './context';
import { command, selectRange } from './select';
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
    const wanted = ins.paragraphs.map((p) => p.styleId ?? fallback);
    let res = await insert(ed, read.version, loc, wanted);
    // The engine cannot create paragraphs that carry list numbering in one batch: create them plain, then style them.
    let later: (string | undefined)[] = [];
    if (!res.ok && /numbering/i.test((res.failure as { message?: string }).message ?? '')) {
      const v = await ed.readParagraphs({ view: 'accepted', paraIds: [] });
      later = wanted.map((st) => (st && /list|number|bullet/i.test(st) ? st : undefined));
      if (v.ok) res = await insert(ed, v.version, loc, wanted.map((st, k) => (later[k] ? undefined : st)));
    }
    if (!res.ok) { failed.push({ edit: ins.edit, reason: `new paragraphs: ${res.failure.code}${(res.failure as { message?: string }).message ? ` (${(res.failure as { message?: string }).message})` : ''}` }); continue; }
    if (!cell) {
      for (const [k, np] of res.receipts[0].newParagraphs.entries()) if (later[k]) await listStyle(ed, np.paraId, later[k]!);
    }
    res.receipts[0].newParagraphs.forEach((np, k) => {
      const id = `${turnId}-n${i}-${k}`;
      created.set(np.paraId, { id, story: loc.story });
      fills.push({ id, edit: ins.edit, paraId: np.paraId, find: '', text: ins.paragraphs[k]?.text ?? '', ...(cell ? { story: loc.story } : {}) });
    });
  }
  return fills;
}

/** Deletes paragraphs we created whose proposal is gone (rejected or withdrawn) and which are still empty. */
async function insert(ed: DocxEditorRef, expectVersion: string, loc: { story: string; paraId: string }, styles: (string | undefined)[]) {
  return ed.applyEdits({
    expectVersion, source: 'agent',
    steps: [{ op: 'insertParagraphs', target: { story: loc.story, paraId: loc.paraId }, at: 'end',
      paragraphs: styles.map((st) => ({ text: '', ...(st ? { styleId: st } : {}) })) }],
  });
}

/** Applies a list style the way a teacher would (style picker), falling back to the list buttons. */
async function listStyle(ed: DocxEditorRef, paraId: string, styleId: string) {
  try {
    await selectRange(ed, paraId, 0, 0);
    try { await command(ed, 'paragraphStyle', { styleId }); } catch { await command(ed, /bullet/i.test(styleId) ? 'bulletList' : 'numberedList', null); }
  } catch { /* the text still lands; only the list look is missing */ }
}

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
