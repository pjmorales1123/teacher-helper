import type { AiResult } from '../../lib/types';

/**
 * Smaller models sometimes shorten ids ("p0" for "body:p0") or keep the brackets ("[body:p3]", "[T1.R2.C3]").
 * Map such a target to the real id when exactly that id exists; leave anything else for the normal "not found" path.
 */
export function fixTarget(id: string | undefined, exists: (id: string) => boolean): string | undefined {
  if (!id || exists(id)) return id;
  const bare = id.trim().replace(/^\[|\]$/g, '').trim();
  for (const c of [bare, `body:${bare}`, bare.replace(/^body:/, '')]) if (exists(c)) return c;
  return id;
}

export function fixTargets(r: AiResult, exists: (id: string) => boolean): AiResult {
  return {
    ...r,
    edits: r.edits.map((e) => ({ ...e, target: fixTarget(e.target, exists)! })),
    ops: r.ops.map((o) => ({ ...o, target: fixTarget(o.target, exists), to: fixTarget(o.to, exists) })),
  };
}
