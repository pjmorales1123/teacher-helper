import type { AiOp } from '../lib/types';

export const short = (s: string, n = 40) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
/** Maps an internal id ("body:p13", "S4.T2") to something a teacher recognizes. */
export type Namer = (target: string) => string;
let name: Namer = (t) => t;
const where = (op: AiOp) => (op.find ? `“${short(op.find)}”` : tgt(op.target));
const tgt = (t?: string) => (t ? name(t) : '');

function formatBits(op: AiOp): string {
  const bits = [op.bold && 'bold', op.italic && 'italic', op.underline && 'underline', op.fontSize && `${op.fontSize} pt`,
    op.fontFamily, op.color && `color #${op.color}`, op.highlight && `highlight #${op.highlight}`, op.fill && `fill #${op.fill}`,
    op.align && `align ${op.align}`, op.valign && `v-align ${op.valign}`, op.wrap && 'wrap text', op.border && `${op.border} borders`,
    op.lineSpacing && `line spacing ${op.lineSpacing}`, op.spaceBefore !== undefined && `${op.spaceBefore} pt before`, op.spaceAfter !== undefined && `${op.spaceAfter} pt after`,
    op.indent !== undefined && `first-line indent ${op.indent}"`, op.keepWithNext && 'keep with next', op.keepTogether && 'keep lines together', op.pageBreakBefore && 'start on a new page', op.list && `${op.list} list`, op.styleId && `style ${op.styleId}`];
  return bits.filter(Boolean).join(', ');
}

/** A plain-language label for the approval list, e.g. "Format “I. Objectives”: bold, 14 pt". */
export function describeOp(op: AiOp, namer?: Namer): string {
  name = namer ?? ((t) => t);
  switch (op.op) {
    case 'style': return op.styleId && !formatBits({ ...op, styleId: undefined }) ? `Set ${tgt(op.target)} to style ${op.styleId}` : `Style ${tgt(op.target)}: ${formatBits(op)}`;
    case 'format': return `Format ${where(op)}: ${formatBits(op)}`;
    case 'paragraph': return `${tgt(op.target)}: ${formatBits(op)}`;
    case 'table': return `Insert a ${op.rows?.length}×${op.rows?.[0]?.length} table after ${tgt(op.target)} (${short(op.rows?.[0]?.join(' | ') ?? '', 50)})`;
    case 'delete': return `Delete ${tgt(op.target)}${op.to ? ` through ${tgt(op.to)}` : ''}`;
    case 'pageSetup': return `Page setup: ${[op.paper, op.orientation, op.margins && `margins ${Object.entries(op.margins).map(([k, v]) => `${k} ${v}"`).join(' ')}`].filter(Boolean).join(', ')}`;
    case 'pageBreak': return `Page break after ${tgt(op.target)}`;
    case 'signatories': return `Signatories after ${tgt(op.target)}: ${op.rows?.[0]?.length} side by side (${short(op.rows?.find((r) => r.some((c) => /[A-Z]{3}/.test(c) && !/[a-z]/.test(c)))?.join(', ') ?? '', 60)})`;
    case 'resize': return `Resize ${tgt(op.target)}${op.width ? ` to ${op.width}" wide` : ''}${op.height ? `, ${op.height}" tall` : ''}${op.left !== undefined || op.top !== undefined ? ', moved' : ''}`;
    case 'image': if (op.slide) return `Picture ${short(op.path?.split(/[\\/]/).pop() ?? '', 40)} on slide ${op.slide}${op.width ? `, ${op.width}" wide` : ''}`;
      return `Picture ${short(op.path?.split(/[\\/]/).pop() ?? '', 40)} ${op.placement === 'before' ? 'before' : 'after'} ${tgt(op.target)}${op.width ? `, ${op.width}" wide` : ''}, ${op.align ?? 'center'}`;
    case 'cells': return `Fill ${op.rows?.length}×${op.rows?.[0]?.length} cells from ${op.target}`;
    case 'numberFormat': return `Number format ${op.numberFormat} on ${op.target}`;
    case 'align': return `Align ${tgt(op.target)} ${op.align}`;
    case 'fill': return `Fill ${tgt(op.target)} with #${op.fill}`;
    case 'notes': return `Speaker notes for slide ${op.slide}: “${short(op.text ?? '', 50)}”`;
    case 'bullets': return `Rewrite ${tgt(op.target)} as ${op.lines?.length} line(s): “${short(op.lines?.join(' / ') ?? '', 60)}”`;
    case 'duplicateSlide': return `Add a copy of slide ${op.slide} after it${op.rows?.length ? `, with new text in ${op.rows.length} box(es)` : ''}`;
    case 'deleteSlide': return `Delete slide ${op.slide}`;
    case 'moveSlide': return `Move slide ${op.slide} to position ${op.position}`;
    default: return op.op;
  }
}
