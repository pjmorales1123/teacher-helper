import type { AiEdit } from '../lib/types';

/** What happened when AI edits were handed to the editor engine. */
export interface ProposeReport {
  staged: number;
  failed: { edit: AiEdit; reason: string }[];
}

/**
 * The one contract the AI sidebar and save button use. Each format (Word, Excel,
 * PowerPoint) implements it on top of its BetterOffice editor, so the AI code never
 * touches an engine directly and an engine can be swapped later.
 */
export interface EngineHandle {
  /** Document text with stable ids the AI can target, plus the current selection. */
  snapshot(): Promise<{ context: string; selection?: string }>;
  /** Stage edits as reviewable proposals. Nothing is applied until the teacher accepts. */
  propose(edits: AiEdit[], turnId: string): Promise<ProposeReport>;
  /** Accept or reject every pending AI proposal, when the engine supports it. */
  decideAll?(accept: boolean): Promise<void>;
  /** Serialize to Office bytes, settling any decided proposals first. */
  save(): Promise<Uint8Array>;
}

export const AI_AUTHOR = 'Guro Buddy (AI)';

/** Keeps the context the AI sees bounded, cutting at a line boundary. */
export function clip(text: string, max = 400_000): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf('\n', max);
  return `${text.slice(0, cut > 0 ? cut : max)}\n[… document truncated: ask about a specific section for the rest …]`;
}
