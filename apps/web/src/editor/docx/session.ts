import type { DocxEditorRef } from '@betteroffice/docx-react';

export const STORY = 'body';
export const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

/** The in-thread editor and its document session (needs the editor's legacySyncApi mode). */
export function syncParts(ed: DocxEditorRef) {
  const pe = ed.getEditorRef();
  const ses = pe?.getYrsSession();
  if (!pe || !ses) throw new Error('The document is still loading.');
  return { pe, ses };
}

export async function version(ed: DocxEditorRef): Promise<string> {
  const r = await ed.readParagraphs({ view: 'accepted', paraIds: [] });
  if (!r.ok) throw new Error('The document is busy. Try again.');
  return r.version;
}

export async function paragraphText(ed: DocxEditorRef, paraId: string, story = STORY): Promise<string> {
  const r = await ed.readParagraphs({ view: 'accepted', story, paraIds: [paraId] });
  if (!r.ok || !r.paragraphs[0]) throw new Error(`Paragraph ${paraId} was not found.`);
  return r.paragraphs[0].text;
}

/** Table cell stories look like "body:t1:r0c2~123". Groups them by table, in row/column order. */
export function tableCells(storyIds: readonly string[]) {
  const tables = new Map<string, { story: string; row: number; col: number }[]>();
  for (const story of storyIds) {
    const m = /^(.+?:t\d+):r(\d+)c(\d+)/.exec(story);
    if (!m) continue;
    const list = tables.get(m[1]) ?? [];
    list.push({ story, row: Number(m[2]), col: Number(m[3]) });
    tables.set(m[1], list);
  }
  for (const list of tables.values()) list.sort((a, b) => a.row - b.row || a.col - b.col);
  return tables;
}

/** Paragraph style ids the document defines, from the editor's style picker. */
export function styleIds(ed: DocxEditorRef): string[] {
  const state = ed.commands.getState('paragraphStyle') as { options?: { args?: { styleId?: string } }[] };
  return (state.options ?? []).map((o) => o.args?.styleId).filter((s): s is string => !!s);
}

type Attrs = Parameters<ReturnType<typeof syncParts>['ses']['setParagraphAttrs']>[1];

/** Whole-paragraph range in the session's coordinates. */
export function wholeParagraph(paraId: string, length: number, story = STORY) {
  return { story, start: { paraId, offset: 0 }, end: { paraId, offset: length } };
}

/**
 * Sets paragraph properties directly on the document session. Typed fields and "other" (keepNext,
 * keepLines, pageBreakBefore) must be separate calls or the engine drops the "other" part.
 * Ends with a sync so the editor shows the change and saves it.
 */
export async function setAttrs(ed: DocxEditorRef, paraId: string, typed: Attrs, other?: Record<string, boolean | null>) {
  const { pe, ses } = syncParts(ed);
  const range = wholeParagraph(paraId, (await paragraphText(ed, paraId)).length);
  if (Object.keys(typed).length) ses.setParagraphAttrs(range, typed);
  if (other && Object.keys(other).length) ses.setParagraphAttrs(range, { other });
  pe.syncYrsInputState(true);
  await tick();
}

/** Usable text width of the first section in twips (page width minus side margins). */
export function textWidthTwips(ed: DocxEditorRef): number {
  const a = syncParts(ed).ses.listSections()[0]?.authored as Record<string, number> | undefined;
  return a ? a.pageWidth - a.marginLeft - a.marginRight : 9360;
}
