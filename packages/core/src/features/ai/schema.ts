import type { AiMode, AiResult } from './types.ts';

/** JSON Schema the CLI must satisfy. Same shape for Word, Excel and PowerPoint. */
export const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'edits'],
  properties: {
    reply: { type: 'string', description: 'Answer to the teacher, plain text, short.' },
    edits: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['target', 'find', 'replace'],
        properties: {
          target: { type: 'string', description: 'An id copied exactly from the document context.' },
          find: { type: 'string', description: 'Exact text inside that target to replace. Empty string appends.' },
          replace: { type: 'string', description: 'New text (or new cell input for spreadsheets).' },
          why: { type: 'string', description: 'Very short reason for the change.' },
        },
      },
    },
  },
} as const;

/** Defensive check of whatever came back, so the UI never receives a malformed edit. */
export function normalizeResult(raw: unknown, mode: AiMode): AiResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.reply !== 'string') return null;
  const list = Array.isArray(r.edits) ? r.edits : [];
  const edits = list
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .filter((e) => typeof e.target === 'string' && typeof e.find === 'string' && typeof e.replace === 'string')
    .map((e) => ({
      target: String(e.target),
      find: String(e.find),
      replace: String(e.replace),
      ...(typeof e.why === 'string' ? { why: e.why } : {}),
    }))
    .filter((e) => e.find !== e.replace)
    .slice(0, 200);
  return { reply: r.reply, edits: mode === 'ask' ? [] : edits };
}
