import type { AiOp } from './types.ts';

/** Slide shapes the AI may draw (OOXML preset geometry names). */
export const GEOMETRIES = ['rect', 'roundRect', 'ellipse', 'triangle', 'rightArrow', 'leftArrow', 'chevron', 'homePlate', 'star5', 'line'] as const;

/** Validation for sheet structure ops, slide boxes and wrapped pictures. Returns a reason when the op is unusable. */
export function checkNewOp(o: AiOp): string | null {
  switch (o.op) {
    case 'columnWidth': return o.size !== undefined && o.size >= 1 && o.size <= 120 ? null : 'columnWidth needs size 1 to 120 characters';
    case 'rowHeight': return o.size !== undefined && o.size >= 5 && o.size <= 300 ? null : 'rowHeight needs size 5 to 300 pt';
    case 'insertRows': case 'insertColumns': return o.count === undefined || (o.count >= 1 && o.count <= 200) ? null : 'count must be 1 to 200';
    case 'addSheet': case 'renameSheet':
      return typeof o.text === 'string' && /^[^\\/?*[\]:]{1,31}$/.test(o.text) ? null : `${o.op} needs a sheet name in text (up to 31 characters, no \\ / ? * [ ] :)`;
    case 'textBox':
      if (typeof o.slide !== 'number') return 'textBox needs slide';
      if (typeof o.text !== 'string' && !(Array.isArray(o.lines) && o.lines.length)) return 'textBox needs text or lines';
      return boxNeeds(o);
    case 'shape': return typeof o.slide !== 'number' ? 'shape needs slide' : boxNeeds(o);
    case 'newSlide': return typeof o.position === 'number' ? null : 'newSlide needs position (the new slide number)';
    default: return null;
  }
}

function boxNeeds(o: AiOp): string | null {
  for (const k of ['left', 'top', 'width', 'height'] as const) if (typeof o[k] !== 'number') return `${o.op} needs left, top, width and height in inches`;
  return null;
}
