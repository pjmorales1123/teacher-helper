import type { DocxEditorRef } from '@betteroffice/docx-react';
import { findBodyMatches } from '@betteroffice/docx/yrs';
import { paragraphText, STORY, syncParts, tick } from './session';

/**
 * Selects `find` inside a paragraph (or the whole paragraph) by its on-screen position, which stays
 * correct even when the paragraph shows tracked changes. Verifies the editor selected exactly that text.
 */
export async function selectInParagraph(ed: DocxEditorRef, paraId: string, find?: string): Promise<void> {
  const text = await paragraphText(ed, paraId);
  const wanted = find ?? text;
  if (!wanted) throw new Error('That paragraph is empty.');
  const { pe, ses } = syncParts(ed);
  const matches = findBodyMatches(ses, (loc) => pe.yrsLocToDisplayPosition(loc), wanted, { matchCase: true, matchWholeWord: false });
  const hit = matches.find((m) => m.yrsRange.start.paraId === paraId) ?? matches.find((m) => m.yrsRange.story === STORY && text.includes(wanted));
  if (!hit) throw new Error(`“${wanted.slice(0, 40)}” is not in that paragraph any more.`);
  pe.setSelection(hit.displayFrom, hit.displayTo);
  await tick();
  const sel = (await ed.readSelectionInfo())?.selectedText ?? '';
  if (sel !== wanted) throw new Error('Could not select that text exactly; nothing was changed.');
}

export async function selectRange(ed: DocxEditorRef, paraId: string, start: number, end: number): Promise<void> {
  const { pe } = syncParts(ed);
  const a = pe.yrsLocToDisplayPosition({ story: STORY, paraId, offset: start });
  const b = pe.yrsLocToDisplayPosition({ story: STORY, paraId, offset: end });
  if (a == null || b == null) throw new Error(`Could not place the cursor in ${paraId}.`);
  pe.setSelection(a, b);
  await tick();
}

/** Puts the caret at the end of a paragraph, for inserts that go after it. */
export async function caretAtEnd(ed: DocxEditorRef, paraId: string): Promise<void> {
  const len = (await paragraphText(ed, paraId)).length;
  await selectRange(ed, paraId, len, len);
}

/** Runs an editor command and throws a readable error when it is refused. */
export async function command(ed: DocxEditorRef, id: string, args: unknown): Promise<void> {
  const res = await (ed.commands.execute as (i: string, a: unknown) => Promise<{ ok: boolean; failure?: { message?: string } }>)(id, args);
  if (!res.ok) throw new Error(res.failure?.message ?? `${id} was refused`);
  await tick();
}

/** Bold/italic/underline are toggles: only run them when the current state differs from the wanted one. */
export async function setToggle(ed: DocxEditorRef, id: 'bold' | 'italic' | 'underline', want: boolean | undefined) {
  if (want === undefined) return;
  const state = (ed.commands.getState as (i: string) => { active?: boolean | 'mixed' })(id);
  if (state.active === want) return;
  if (state.active === 'mixed' && want) { await command(ed, id, null); if ((ed.commands.getState as (i: string) => { active?: unknown })(id).active === true) return; }
  await command(ed, id, null);
}
