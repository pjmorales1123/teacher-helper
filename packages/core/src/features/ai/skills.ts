import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DocKind } from '../documents/kinds.ts';

interface Skill { name: string; kinds: DocKind[]; body: string }

const DIR = new URL('../../../skills/', import.meta.url).pathname;
let cache: Skill[] | null = null;

/** Loads the markdown knowledge files once. Front matter lists which formats each one applies to. */
export function loadSkills(dir = DIR): Skill[] {
  if (cache && dir === DIR) return cache;
  const skills = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const text = readFileSync(join(dir, f), 'utf8');
    const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
    const kinds = (/kinds:\s*(.+)/.exec(m?.[1] ?? '')?.[1] ?? '').split(',').map((k) => k.trim()) as DocKind[];
    return { name: f.replace(/\.md$/, ''), kinds, body: (m ? text.slice(m[0].length) : text).trim() };
  });
  if (dir === DIR) cache = skills;
  return skills;
}

/** The knowledge block appended to the system prompt for one document type. */
export function skillsFor(kind: DocKind): string {
  const parts = loadSkills().filter((s) => s.kinds.includes(kind)).map((s) => `## Knowledge: ${s.name}\n${s.body}`);
  return parts.length ? `\n\n# Reference knowledge\n${parts.join('\n\n')}` : '';
}
