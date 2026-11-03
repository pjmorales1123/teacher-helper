/**
 * Imports the per-document format specs researched for Homeroom (docs/format-specs/*.md in that repo) as
 * Guro Buddy knowledge. Re-run after the specs change:
 *   node scripts/import-format-specs.mjs ../homeroom/docs/format-specs
 * Each spec keeps its own text; this adds which formats it applies to and the words that recognize it.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] ?? '../homeroom/docs/format-specs';
const OUT = new URL('../packages/core/knowledge/format-specs/', import.meta.url).pathname;

/** kinds and recognition words per spec id. Unlisted specs are skipped with a warning. */
const MAP = {
  'accomplishment': ['docx, xlsx', 'accomplishment report|actual accomplishment|daily log|for the period'],
  'action-plan': ['docx, xlsx', 'action plan|success indicator|persons? (involved|responsible)|time frame|means of verification'],
  'action-research-proposal': ['docx', 'action research|research proposal|context and rationale|proposed (innovation|intervention)|dissemination'],
  'activity-proposal': ['docx', 'activity proposal|activity design|proponent|purpose of the activity|budget(ary)? (allocation|requirements?)'],
  'conversation-script': ['docx', 'conversation script|dialogue|role ?play|speaker\\s*\\|'],
  'elo-lesson-and-slides': ['docx, pptx', '\\bELO\\b|slide outline|lesson exemplar'],
  'guidance-referral': ['docx', 'referral|guidance|counseling|counselling|reason for referral'],
  'home-visitation': ['docx', 'home visit|visitation|parent-teacher conference|\\bPTC\\b'],
  'hpta-minutes': ['docx', '\\bHPTA\\b|\\bPTA\\b|minutes|quorum|resolution|adjourn'],
  'ilaw-lesson-plan': ['docx', '\\bILAW\\b|intentions|learning experience|ways forward|pre-lesson|learner context|declaration of ai'],
  'incident-report': ['docx', 'incident|anecdotal|alleged (victim|perpetrator)|complainant'],
  'irip': ['docx, xlsx', '\\bIRIP\\b|reading intervention|\\bARAL\\b|tutor'],
  'lac-plan': ['docx, xlsx', '\\bLAC\\b plan|learning action cell|five-month|\\bNEAP\\b'],
  'lac-reflection': ['docx', '\\bLAC\\b.*reflection|engagement report|member reflection'],
  'lac-session-report': ['docx', '\\bLAC\\b session|session report|facilitator|members present'],
  'narrative-report': ['docx', 'narrative report|highlights|brief description|organized by|action items'],
  'project-work-plan': ['docx, xlsx', 'project work plan|budget matrix|\\bSIP\\b|\\bAIP\\b|root cause|problem statement'],
  'quiz-activity-sheet': ['docx, pptx', 'quiz|activity sheet|worksheet|answer key|\\bSet [AB]\\b'],
  'read-aloud-passage': ['docx', 'read-aloud|reading passage|\\bPhil-IRI\\b|comprehension questions'],
  'rubric': ['docx, xlsx', 'rubric|criteria|performance level|scoring guide'],
  'sim-catch-up-kit': ['docx', 'strategic intervention material|\\bSIM\\b|guide card|activity card|enrichment card'],
  'test-paper-and-tos': ['docx, xlsx', 'table of specifications?|\\bTOS\\b|periodical test|summative test|item placement|no\\. of items'],
};

const ADAPT = `> Imported from the Homeroom format research (status: STATUS). Written for that app: where it says the content
> comes from "Code", the "Profile", a "picker" or the "Teacher", in Guro Buddy it comes from the teacher or the open
> document: keep what is there, never invent it, leave a placeholder. Its page setup applies only when the document
> has no format of its own: the teacher's format always wins. Its "free checks" are what to verify before replying.`;

mkdirSync(OUT, { recursive: true });
let n = 0;
for (const f of readdirSync(SRC).filter((x) => x.endsWith('.md')).sort()) {
  const id = f.replace(/\.md$/, '');
  if (!MAP[id]) { console.warn(`skip ${id}: add it to MAP`); continue; }
  const text = readFileSync(join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const head = m?.[1] ?? '';
  const get = (k) => new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(head)?.[1]?.trim() ?? '';
  const status = get('status') || 'unknown';
  const [kinds, match] = MAP[id];
  const front = [
    '---', `kinds: ${kinds}`, `title: ${get('name') || id} (format spec)`, `match: ${match}`,
    `source: Homeroom format spec, status ${status}; basis: ${get('basis').replace(/\n/g, ' ').slice(0, 400)}`, '---',
  ].join('\n');
  writeFileSync(join(OUT, f), `${front}\n${ADAPT.replace('STATUS', status)}\n\n${(m ? text.slice(m[0].length) : text).trim()}\n`);
  n++;
}
console.log(`imported ${n} specs into ${OUT}`);
