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
export interface AiResult { reply: string; edits: AiEdit[] }
export type AiMode = 'ask' | 'edit';

export interface ChatMessage { id: number; role: 'user' | 'assistant'; text: string; edits: AiEdit[]; created_at: string }

export interface AiStatus { backend: string; installed: boolean; version?: string; model: string }
