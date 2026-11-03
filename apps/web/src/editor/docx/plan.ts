import type { AiEdit } from '../../lib/types';

export interface PlannedProposal { id: string; edit: AiEdit; paraId: string; find: string; text: string }
export interface PlannedInsert { edit: AiEdit; paraId: string; paragraphs: { text: string; styleId?: string }[] }

const STYLE_PREFIX = /^\{([\w .-]{1,60})\}\s?/;

/** "{Heading2} Results" -> { text: "Results", styleId: "Heading2" }. Without a prefix the anchor's style is kept. */
export function parseLine(line: string): { text: string; styleId?: string } {
  const m = STYLE_PREFIX.exec(line);
  return m ? { text: line.slice(m[0].length), styleId: m[1] } : { text: line };
}

/**
 * Splits AI edits into what the Word engine can express:
 * text changes inside a paragraph become host proposals; extra lines become new
 * paragraphs inserted after the target as tracked insertions.
 */
export function planDocxEdits(edits: AiEdit[], turnId: string) {
  const proposals: PlannedProposal[] = [];
  const inserts: PlannedInsert[] = [];
  edits.forEach((edit, i) => {
    const [first = '', ...rest] = edit.replace.replace(/\r/g, '').split('\n');
    const head = parseLine(first).text;
    if (edit.find || head) proposals.push({ id: `${turnId}-${i}`, edit, paraId: edit.target, find: edit.find, text: head });
    const paragraphs = rest.filter((l) => l.trim()).map(parseLine);
    if (paragraphs.length) inserts.push({ edit, paraId: edit.target, paragraphs });
  });
  return { proposals, inserts };
}
