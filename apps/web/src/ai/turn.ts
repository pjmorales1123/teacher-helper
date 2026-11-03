import { streamTurn, type AiEvent } from '../lib/ai-stream';
import type { AiMode, AiResult } from '../lib/types';
import type { EngineHandle, ProposeReport } from '../editor/engine';

type Done = Extract<AiEvent, { type: 'done' }>;

export interface TurnCallbacks {
  status: (text: string | null) => void;
  delta: (text: string) => void;
  error: (message: string) => void;
}

export interface TurnOutcome { result: AiResult; ms: number; report?: ProposeReport }

/**
 * One AI turn: snapshot the document (and for a review, render the pages), stream the answer,
 * then hand any changes to the engine as suggestions or pending changes.
 */
export async function runTurn(
  handle: EngineHandle, docId: string, prompt: string, mode: AiMode, review: boolean,
  turnId: string, cb: TurnCallbacks, signal: AbortSignal, voice = false,
): Promise<TurnOutcome | null> {
  cb.status(review ? 'Looking at the pages…' : 'Reading your document…');
  const images = review ? await handle.render() : undefined;
  const { context, selection } = await handle.snapshot();
  let done: Done | null = null;
  await streamTurn({ docId, mode, prompt, context, selection, review, images, voice }, (e) => {
    if (e.type === 'status') cb.status(e.text);
    else if (e.type === 'delta') cb.delta(e.text);
    else if (e.type === 'error') cb.error(e.message);
    else done = e;
  }, signal);
  const d = done as Done | null;
  if (!d) return null;
  const { result } = d;
  if (!result.edits.length && !result.ops.length && !result.dropped?.length) return { result, ms: d.ms };
  cb.status('Adding suggestions to the document…');
  const report = await handle.propose(result, turnId)
    .catch((err: Error): ProposeReport => ({ staged: 0, pending: [], failed: [{ label: 'All changes', reason: err.message }] }));
  report.failed.push(...(result.dropped ?? []).map((x) => ({ label: x.op, reason: x.reason })));
  return { result, ms: d.ms, report };
}
