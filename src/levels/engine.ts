// Pure grading logic for LEVELS items. No database, no I/O.
import { CHALLENGE_PASS, QUEST_PASS } from "./meta.ts";
import type { Item, ItemResult, PublicItem, Quest } from "./types.ts";

/** Lowercase, strip punctuation, collapse whitespace so "The Dog." matches "the dog". */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Shuffle until the order differs from the original (for 3+ distinct entries it always can). */
function reordered(list: readonly string[]): string[] {
  for (let tries = 0; tries < 10; tries++) {
    const s = shuffle(list);
    if (s.some((v, i) => v !== list[i])) return s;
  }
  return [...list].reverse();
}

export function checkItem(item: Item, answer: unknown): boolean {
  if (item.type === "mc") {
    if (typeof answer === "number") return answer === item.answer;
    return normalize(String(answer ?? "")) === normalize(item.choices[item.answer] ?? "");
  }
  if (item.type === "order") {
    if (!Array.isArray(answer) || answer.length !== item.steps.length) return false;
    return answer.every((v, i) => String(v) === item.steps[i]);
  }
  const given = normalize(String(answer ?? ""));
  return given !== "" && item.accept.some((a) => normalize(a) === given);
}

/** Correct answer in a form the client can display after checking. */
export function revealAnswer(item: Item): unknown {
  if (item.type === "mc") return item.choices[item.answer];
  if (item.type === "order") return item.steps;
  return item.accept[0];
}

export function toPublicItem(item: Item): PublicItem {
  const base = { id: item.id, skill: item.skill, prompt: item.prompt, ...(item.level ? { level: item.level } : {}) };
  if (item.type === "mc") return { ...base, type: "mc", choices: reordered(item.choices) };
  if (item.type === "order") return { ...base, type: "order", steps: reordered(item.steps) };
  return { ...base, type: "short" };
}

export interface GradeOutcome {
  results: ItemResult[];
  score: number;
  total: number;
  passed: boolean;
}

export function passMark(kind: Quest["kind"]): number {
  return kind === "challenge" ? CHALLENGE_PASS : QUEST_PASS;
}

export function gradeQuest(quest: Quest, answers: Record<string, unknown>): GradeOutcome {
  const results = quest.items.map((item) => ({ id: item.id, skill: item.skill, correct: checkItem(item, answers[item.id]) }));
  const score = results.filter((r) => r.correct).length;
  const total = results.length;
  return { results, score, total, passed: total > 0 && score / total >= passMark(quest.kind) };
}

export interface SkillStat {
  skill: string;
  correct: number;
  total: number;
  accuracy: number;
}

/** Aggregate per-skill accuracy over many attempts' results. */
export function skillStats(allResults: readonly ItemResult[][]): SkillStat[] {
  const acc = new Map<string, { correct: number; total: number }>();
  for (const results of allResults) {
    for (const r of results) {
      const s = acc.get(r.skill) ?? { correct: 0, total: 0 };
      s.total += 1;
      if (r.correct) s.correct += 1;
      acc.set(r.skill, s);
    }
  }
  return [...acc.entries()]
    .map(([skill, s]) => ({ skill, ...s, accuracy: s.total ? Math.round((100 * s.correct) / s.total) : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

/** Weakest skills with at least `minItems` attempts, lowest accuracy first. */
export function weakestSkills(stats: SkillStat[], count = 2, minItems = 2): SkillStat[] {
  return stats.filter((s) => s.total >= minItems && s.accuracy < 100).slice(0, count);
}
