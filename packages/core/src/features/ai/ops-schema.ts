import type { DocKind } from '../documents/kinds.ts';
import type { AiOp } from './types.ts';

/** Structured operations each engine can perform, beyond plain text edits. */
export const OPS_BY_KIND: Record<DocKind, readonly string[]> = {
  docx: ['style', 'format', 'paragraph', 'table', 'delete', 'pageSetup', 'pageBreak'],
  xlsx: ['cells', 'style', 'numberFormat'],
  pptx: ['format', 'align', 'notes', 'fill', 'bullets', 'duplicateSlide', 'deleteSlide', 'moveSlide'],
};

const str = { type: 'string' } as const;
const num = { type: 'number' } as const;
const bool = { type: 'boolean' } as const;
const strList = { type: 'array', items: str } as const;

/** One flat object for every op keeps the schema simple for the model; validation is per op below. */
export const OP_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['op'],
  properties: {
    op: { type: 'string', enum: [...new Set(Object.values(OPS_BY_KIND).flat())] },
    target: str, to: str, find: str, text: str, why: str,
    lines: strList, rows: { type: 'array', items: strList },
    styleId: str, bold: bool, italic: bool, underline: bool, fontSize: num, fontFamily: str,
    color: str, highlight: str, fill: str,
    align: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
    valign: { type: 'string', enum: ['top', 'middle', 'bottom'] },
    lineSpacing: num, list: { type: 'string', enum: ['bullet', 'numbered'] },
    border: { type: 'string', enum: ['all', 'outer', 'inner', 'bottom', 'none'] },
    wrap: bool, numberFormat: str, slide: num, position: num,
    orientation: { type: 'string', enum: ['portrait', 'landscape'] },
    paper: { type: 'string', enum: ['A4', 'Letter', 'Legal'] },
    margins: { type: 'object', additionalProperties: false, properties: { top: num, bottom: num, left: num, right: num } },
  },
} as const;

const HEX = /^#?([0-9a-f]{6})$/i;
const needsTarget = new Set(['style', 'format', 'paragraph', 'table', 'delete', 'pageBreak', 'cells', 'numberFormat', 'align', 'fill', 'bullets']);

/** Returns a cleaned op, or a reason it was dropped. Never trusts the model's output shape. */
export function checkOp(raw: unknown, kind: DocKind): { op: AiOp } | { reason: string } {
  if (!raw || typeof raw !== 'object') return { reason: 'not an object' };
  const o = { ...(raw as Record<string, unknown>) } as AiOp & Record<string, unknown>;
  if (!OPS_BY_KIND[kind].includes(o.op)) return { reason: `"${o.op}" is not available for ${kind}` };
  if (needsTarget.has(o.op) && typeof o.target !== 'string') return { reason: `${o.op} needs a target` };
  for (const key of ['color', 'highlight', 'fill'] as const) {
    if (o[key] === undefined) continue;
    const m = HEX.exec(String(o[key]));
    if (!m) return { reason: `${key} must be a hex color like #1F4E79` };
    o[key] = m[1].toUpperCase();
  }
  if (o.fontSize !== undefined && !(o.fontSize >= 6 && o.fontSize <= 96)) return { reason: 'fontSize must be 6 to 96' };
  if (o.lineSpacing !== undefined && !(o.lineSpacing >= 1 && o.lineSpacing <= 3)) return { reason: 'lineSpacing must be 1 to 3' };
  if (o.op === 'table' && !(Array.isArray(o.rows) && o.rows.length && o.rows.length <= 60 && o.rows.every((r) => Array.isArray(r) && r.length && r.length <= 12))) {
    return { reason: 'table needs rows (up to 60 x 12)' };
  }
  if (o.op === 'cells' && !(Array.isArray(o.rows) && o.rows.length && o.rows.length <= 500)) return { reason: 'cells needs rows' };
  if (o.op === 'bullets' && !(Array.isArray(o.lines) && o.lines.length && o.lines.length <= 20)) return { reason: 'bullets needs 1 to 20 lines' };
  if (o.op === 'notes' && (typeof o.slide !== 'number' || typeof o.text !== 'string')) return { reason: 'notes needs slide and text' };
  if (['duplicateSlide', 'deleteSlide', 'moveSlide'].includes(o.op) && typeof o.slide !== 'number') return { reason: `${o.op} needs slide` };
  if (o.op === 'moveSlide' && typeof o.position !== 'number') return { reason: 'moveSlide needs position' };
  if (o.op === 'style' && kind === 'docx' && typeof o.styleId !== 'string') return { reason: 'style needs styleId' };
  if (o.margins) {
    for (const v of Object.values(o.margins)) if (!(typeof v === 'number' && v >= 0.3 && v <= 3)) return { reason: 'margins must be 0.3 to 3 inches' };
  }
  return { op: o };
}

export function normalizeOps(raw: unknown, kind: DocKind) {
  const ops: AiOp[] = [];
  const dropped: { op: string; reason: string }[] = [];
  for (const item of Array.isArray(raw) ? raw.slice(0, 120) : []) {
    const res = checkOp(item, kind);
    if ('op' in res) ops.push(res.op);
    else dropped.push({ op: String((item as AiOp)?.op ?? '?'), reason: res.reason });
  }
  return { ops, dropped };
}
