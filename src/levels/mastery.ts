// Skill mastery as evidence across passages. A student masters a skill at a rank by
// passing its items (at most one miss) on three different passages, at least one of
// which did not teach that skill in its tip. Pure functions; see docs/levels.md.
import { LEVEL_SKILLS, MASTERY_TEXTS, SHARP_TEXTS, SKILLS, type Strand } from "./meta.ts";
import type { Attempt, ItemResult, Quest } from "./types.ts";

export interface Evidence {
  questId: string;
  title: string;
  kind: Quest["kind"];
  noHint: boolean; // the passage did not teach this skill in its tip
  correct: number;
  total: number;
  passed: boolean;
  day: string;
}
export type MasteryState = "progress" | "mastered" | "shaky";
export interface SkillMastery {
  skill: string;
  label: string;
  strand: Strand | "";
  evidence: Evidence[]; // one per passage (latest counted attempt), oldest first
  passes: number;
  need: number;
  noHintPass: boolean;
  state: MasteryState;
  mastered: boolean;
  sharp: boolean;
}

export const MIN_ITEMS = 3; // items a passage needs on a skill to count as evidence (2 in a Challenge)
const itemsOn = (q: Quest, skill: string) => q.items.filter((i) => i.skill === skill).length;
export const isEvidence = (q: Quest, skill: string) => itemsOn(q, skill) >= (q.kind === "challenge" ? 2 : MIN_ITEMS);

/** Pass = at most one miss (both right when only two items). */
export function passesSkill(correct: number, total: number): boolean {
  return total >= 2 && (total === 2 ? correct === 2 : total - correct <= 1);
}

function scoreOn(results: readonly ItemResult[], skill: string): { correct: number; total: number } {
  const mine = results.filter((r) => r.skill === skill);
  return { correct: mine.filter((r) => r.correct).length, total: mine.length };
}

/** Attempts that count: the first attempt on a passage each day (same-day replays are practice). */
export function countedAttempts(oldestFirst: readonly Attempt[]): Attempt[] {
  const seen = new Set<string>();
  return oldestFirst.filter((a) => {
    const key = `${a.quest_id}|${a.created_at.slice(0, 10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Mastery of every focus skill of `level` from that level's attempts (oldest first). */
export function skillMastery(level: number, attemptsOldestFirst: readonly Attempt[], quests: ReadonlyMap<string, Quest>): SkillMastery[] {
  const counted = countedAttempts(attemptsOldestFirst);
  return (LEVEL_SKILLS[level] ?? []).map((skill) => {
    const latest = new Map<string, Evidence>();
    for (const a of counted) {
      const q = quests.get(a.quest_id);
      if (!q || !isEvidence(q, skill)) continue;
      const { correct, total } = scoreOn(JSON.parse(a.results) as ItemResult[], skill);
      latest.delete(q.id);
      latest.set(q.id, { questId: q.id, title: q.title, kind: q.kind, noHint: q.tip?.skill !== skill, correct, total, passed: passesSkill(correct, total), day: a.created_at.slice(0, 10) });
    }
    const evidence = [...latest.values()];
    const passes = evidence.filter((e) => e.passed).length;
    const noHintPass = evidence.some((e) => e.passed && e.noHint);
    const last = evidence[evidence.length - 1];
    const enough = passes >= MASTERY_TEXTS && noHintPass;
    const state: MasteryState = !enough ? "progress" : last?.passed === false ? "shaky" : "mastered";
    return {
      skill, label: SKILLS[skill]?.label ?? skill, strand: SKILLS[skill]?.strand ?? "", evidence, passes, need: MASTERY_TEXTS,
      noHintPass, state, mastered: state === "mastered", sharp: state === "mastered" && passes >= SHARP_TEXTS,
    };
  });
}

export function allMastered(mastery: readonly SkillMastery[]): boolean {
  return mastery.length > 0 && mastery.every((m) => m.mastered);
}
