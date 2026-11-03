export type DocKind = 'docx' | 'xlsx' | 'pptx';

export interface DocumentMeta {
  id: string;
  name: string;
  kind: DocKind;
  version: number;
  size: number;
  created_at: string;
  updated_at: string;
}

export interface VersionMeta { version: number; size: number; note: string | null; created_at: string }

export interface AiEdit { target: string; find: string; replace: string; why?: string }
/** A structured operation from the AI (formatting, tables, slides). The server validated it per format. */
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
export type AiMode = 'ask' | 'edit';

export interface ChatMessage { id: number; role: 'user' | 'assistant'; text: string; edits: AiEdit[]; created_at: string }

export interface AiStatus { backend: string; installed: boolean; version?: string; model: string }
