import { createReplyExtractor } from './reply-extractor.ts';
import type { AiEvent } from './types.ts';

/** What the parser learned once the CLI printed its final `result` line. */
export interface ClaudeFinal { structured: unknown; text: string; isError: boolean; costUsd?: number }

/**
 * Turns `claude -p --output-format stream-json --include-partial-messages` lines
 * into our UI events. Pure and synchronous, so it is easy to test with fixtures.
 */
export function createClaudeStreamParser(emit: (e: AiEvent) => void) {
  const extract = createReplyExtractor();
  let final: ClaudeFinal | null = null;
  let writing = false;

  function line(raw: string) {
    if (!raw.trim()) return;
    let e: Record<string, any>;
    try { e = JSON.parse(raw); } catch { return; }

    if (e.type === 'stream_event') {
      const d = e.event?.delta;
      if (d?.type === 'input_json_delta' && typeof d.partial_json === 'string') {
        const text = extract(d.partial_json);
        if (text) {
          if (!writing) { writing = true; emit({ type: 'status', text: 'Writing…' }); }
          emit({ type: 'delta', text });
        }
      }
    } else if (e.type === 'system' && e.subtype === 'api_retry') {
      emit({ type: 'status', text: `Claude is busy (${e.error ?? 'retry'}). Retrying, attempt ${e.attempt}…` });
    } else if (e.type === 'result') {
      final = {
        structured: e.structured_output,
        text: typeof e.result === 'string' ? e.result : '',
        isError: Boolean(e.is_error) || e.subtype !== 'success',
        costUsd: typeof e.total_cost_usd === 'number' ? e.total_cost_usd : undefined,
      };
    }
  }

  return { line, final: () => final };
}
