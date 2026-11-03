import type { AiMode, AiResult } from './types';

export type AiEvent =
  | { type: 'status'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; result: AiResult; costUsd?: number; ms: number }
  | { type: 'error'; message: string };

export interface TurnInput { docId: string; mode: AiMode; prompt: string; context: string; selection?: string }

/** POSTs a turn and reads the Server-Sent Events stream, calling onEvent for each event. */
export async function streamTurn(input: TurnInput, onEvent: (e: AiEvent) => void, signal: AbortSignal) {
  const res = await fetch('/api/ai/turn', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `AI request failed (${res.status})`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const frames = buf.split('\n\n');
    buf = frames.pop() ?? '';
    for (const f of frames) {
      const data = f.split('\n').filter((l) => l.startsWith('data: ')).map((l) => l.slice(6)).join('\n');
      if (data) onEvent(JSON.parse(data) as AiEvent);
    }
  }
}
