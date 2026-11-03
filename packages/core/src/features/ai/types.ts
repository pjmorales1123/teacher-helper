import type { DocKind } from '../documents/kinds.ts';

export type AiMode = 'ask' | 'edit';

/** One proposed change. `target` is an id the client gave us in the context. */
export interface AiEdit {
  target: string;
  find: string;
  replace: string;
  why?: string;
}

export interface AiResult { reply: string; edits: AiEdit[] }

export interface AiTurnRequest {
  docId: string;
  kind: DocKind;
  mode: AiMode;
  prompt: string;
  /** Document snapshot rendered by the client with stable ids, e.g. "[p:1A2B] text". */
  context: string;
  selection?: string;
}

/** Events sent to the browser over Server-Sent Events. */
export type AiEvent =
  | { type: 'status'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; result: AiResult; costUsd?: number; ms: number }
  | { type: 'error'; message: string };
