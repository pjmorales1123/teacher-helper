import type { AiOp, AiResult } from '../lib/types';

/** A change the engine cannot show as an in-document suggestion. It waits for the teacher's OK. */
export interface PendingChange { id: string; label: string; op: AiOp }

/** What happened when an AI result was handed to the editor engine. */
export interface ProposeReport {
  /** Changes now visible in the document as suggestions (tracked changes, ghost cells, slide proposals). */
  staged: number;
  /** Changes waiting in the chat for approval. */
  pending: PendingChange[];
  failed: { label: string; reason: string }[];
}

export interface ApplyReport { applied: string[]; failed: { id: string; reason: string }[] }

/**
 * The one contract the AI sidebar and save button use. Each format implements it on top of its
 * BetterOffice editor, so the AI code never touches an engine directly.
 */
export interface EngineHandle {
  /** Document text, structure and formatting hints with stable ids the AI can target. */
  snapshot(): Promise<{ context: string; selection?: string }>;
  /** Stage text edits as suggestions and sort ops into suggestions or pending changes. Nothing is applied. */
  propose(result: AiResult, turnId: string): Promise<ProposeReport>;
  /** Apply pending changes the teacher approved, in order. Each one is a normal undo step. */
  applyPending(changes: PendingChange[]): Promise<ApplyReport>;
  /** View step: the pages/slides/sheet as the teacher sees them, as PNG data URLs (most relevant first). */
  render(): Promise<string[]>;
  /** Accept or reject every pending AI suggestion, when the engine supports it. */
  decideAll?(accept: boolean): Promise<void>;
  /** Serialize to Office bytes, settling any decided suggestions first. */
  save(): Promise<Uint8Array>;
}

export const AI_AUTHOR = 'Guro Buddy (AI)';

/** Keeps the context the AI sees bounded, cutting at a line boundary. */
export function clip(text: string, max = 400_000): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf('\n', max);
  return `${text.slice(0, cut > 0 ? cut : max)}\n[… document truncated: ask about a specific section for the rest …]`;
}

/** Runs pending changes one by one so one failure never blocks the rest. */
export async function runEach(changes: PendingChange[], run: (op: AiOp) => Promise<void>): Promise<ApplyReport> {
  const report: ApplyReport = { applied: [], failed: [] };
  for (const c of changes) {
    try { await run(c.op); report.applied.push(c.id); } catch (e) { report.failed.push({ id: c.id, reason: (e as Error).message }); }
  }
  return report;
}
