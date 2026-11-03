import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DocKind } from '../documents/kinds.ts';

/** A knowledge file. Without `match` it always applies to its kinds; with it, only to documents that look like it. */
export interface Skill { name: string; title: string; source: string; kinds: DocKind[]; match: RegExp | null; body: string; spec: boolean }

const DIR = new URL('../../../skills/', import.meta.url).pathname;
/** Per-document format specs (imported by scripts/import-format-specs.mjs): long, so only the best one is used. */
const SPEC_DIR = new URL('../../../knowledge/format-specs/', import.meta.url).pathname;
const MAX_MATCHED = 3;
const MAX_SPECS = 1;
let cache: Skill[] | null = null;

const field = (head: string, key: string) => new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(head)?.[1]?.trim() ?? '';

/** Loads the markdown knowledge files once (teachers and schools may add their own to the folder). */
export function loadSkills(dir = DIR, specDir = SPEC_DIR): Skill[] {
  if (cache && dir === DIR) return cache;
  const skills = [...readDir(dir, false), ...(existsSync(specDir) ? readDir(specDir, true) : [])];
  if (dir === DIR) cache = skills;
  return skills;
}

function readDir(dir: string, spec: boolean): Skill[] {
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => {
    const text = readFileSync(join(dir, f), 'utf8');
    const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
    const head = m?.[1] ?? '';
    const match = field(head, 'match');
    return {
      name: f.replace(/\.md$/, ''), title: field(head, 'title') || f, source: field(head, 'source'),
      kinds: field(head, 'kinds').split(',').map((k) => k.trim()) as DocKind[],
      match: match ? new RegExp(match, 'gi') : null,
      body: (m ? text.slice(m[0].length) : text).trim(), spec,
    };
  });
}

/**
 * Picks the knowledge for this document: the always-on files for its format, plus up to three document-type
 * guides and the one format spec whose keywords appear most in its name and opening text.
 */
export function pickSkills(kind: DocKind, docText: string, skills = loadSkills()) {
  const head = docText.slice(0, 6000);
  const own = skills.filter((s) => s.kinds.includes(kind));
  const ranked = own.filter((s) => s.match).map((s) => ({ s, hits: (head.match(s.match!) ?? []).length }))
    .filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits);
  const guides = ranked.filter((x) => !x.s.spec).slice(0, MAX_MATCHED).map((x) => x.s);
  const specs = ranked.filter((x) => x.s.spec).slice(0, MAX_SPECS).map((x) => x.s);
  return { always: own.filter((s) => !s.match), matched: [...guides, ...specs] };
}

/** The knowledge block appended to the system prompt. */
export function skillsFor(kind: DocKind, docText = ''): string {
  const { always, matched } = pickSkills(kind, docText);
  const parts = [...always, ...matched].map((s) => `## Knowledge: ${s.title}${s.source ? `\n(Source: ${s.source})` : ''}\n${s.body}`);
  const detected = matched.length
    ? `This document looks like: ${matched.map((s) => s.title).join('; ')}. Use that knowledge for what goes where.`
    : 'The document type was not recognized: follow the structure the document already has.';
  return `\n\n# Reference knowledge\n${detected}\n\n${parts.join('\n\n')}`;
}
