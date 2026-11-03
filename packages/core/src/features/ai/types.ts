import type { DocKind } from '../documents/kinds.ts';

export type AiMode = 'ask' | 'edit';

/** One proposed change. `target` is an id the client gave us in the context. */
export interface AiEdit {
  target: string;
  find: string;
  replace: string;
  why?: string;
}

/** A structured operation (formatting, structure). Fields are optional; ops-schema.ts validates per op. */
export interface AiOp {
  op: string;
  target?: string; to?: string; find?: string; text?: string; why?: string;
  lines?: string[]; rows?: string[][];
  styleId?: string; bold?: boolean; italic?: boolean; underline?: boolean; fontSize?: number; fontFamily?: string;
  color?: string; highlight?: string; fill?: string;
  align?: 'left' | 'center' | 'right' | 'justify'; valign?: 'top' | 'middle' | 'bottom';
  lineSpacing?: number; list?: 'bullet' | 'numbered'; border?: 'all' | 'outer' | 'inner' | 'bottom' | 'none';
  wrap?: boolean; numberFormat?: string; slide?: number; position?: number;
  orientation?: 'portrait' | 'landscape'; paper?: 'A4' | 'Letter' | 'Legal';
  margins?: { top?: number; bottom?: number; left?: number; right?: number };
  path?: string; width?: number; height?: number; left?: number; top?: number; placement?: 'before' | 'after';
  keepWithNext?: boolean; keepTogether?: boolean; pageBreakBefore?: boolean; spaceBefore?: number; spaceAfter?: number; indent?: number;
  /** Rows/columns to insert; width in characters or height in points; picture wrap side; slide shape geometry and layout. */
  count?: number; size?: number; side?: 'left' | 'right'; geometry?: string; layout?: string;
}

export interface AiResult { reply: string; edits: AiEdit[]; ops: AiOp[]; dropped?: { op: string; reason: string }[] }

export interface AiTurnRequest {
  docId: string;
  kind: DocKind;
  mode: AiMode;
  prompt: string;
  /** Document snapshot rendered by the client with stable ids, e.g. "[p:1A2B] text". */
  context: string;
  selection?: string;
  /** View step: rendered pages/slides as PNG data URLs, and the request being checked. */
  review?: boolean;
  images?: string[];
  /** Spoken through the voice assistant: runs on the fast voice model and may contain mishearings. */
  voice?: boolean;
}

/** Events sent to the browser over Server-Sent Events. */
export type AiEvent =
  | { type: 'status'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; result: AiResult; costUsd?: number; ms: number }
  | { type: 'error'; message: string };
