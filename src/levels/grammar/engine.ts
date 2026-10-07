// Grammar Rush rules: adaptive draw, scoring with speed and streak, tier unlocks. Pure.
import { shuffle } from "../engine.ts";
import { CLEAR_SCORE, GRAMMAR_TIERS, GXP, SECONDS_PER_ITEM } from "./meta.ts";
import type { GrammarItem, PublicGrammarItem, RunResult } from "./types.ts";

export interface TopicStat { topic: string; correct: number; total: number; accuracy: number }

export function topicStats(runs: readonly (readonly RunResult[])[]): TopicStat[] {
  const acc = new Map<string, { correct: number; total: number }>();
  for (const results of runs) for (const r of results) {
    const s = acc.get(r.topic) ?? { correct: 0, total: 0 };
    s.total += 1; if (r.correct) s.correct += 1; acc.set(r.topic, s);
  }
  return [...acc.entries()].map(([topic, s]) => ({ topic, ...s, accuracy: s.total ? Math.round((100 * s.correct) / s.total) : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

/** Draws `size` items, leaning toward topics the student gets wrong, never the same item twice, spread across topics. */
export function drawRun(items: readonly GrammarItem[], stats: readonly TopicStat[], size: number, recentIds: ReadonlySet<string> = new Set()): GrammarItem[] {
  const acc = new Map(stats.map((s) => [s.topic, s.accuracy]));
  const weight = (topic: string) => 0.35 + (100 - (acc.get(topic) ?? 60)) / 100; // unseen topics count as 60%
  const pool = items.filter((i) => !recentIds.has(i.id));
  const ranked = shuffle(pool.length >= size ? pool : items).map((it) => ({ it, key: weight(it.topic) * Math.random() })).sort((a, b) => b.key - a.key);
  const out: GrammarItem[] = [];
  const perTopic = new Map<string, number>();
  const cap = Math.max(2, Math.ceil(size / 3));
  for (const { it } of ranked) {
    if (out.length >= size) break;
    if ((perTopic.get(it.topic) ?? 0) >= cap) continue;
    out.push(it); perTopic.set(it.topic, (perTopic.get(it.topic) ?? 0) + 1);
  }
  for (const { it } of ranked) { if (out.length >= size) break; if (!out.includes(it)) out.push(it); }
  return out;
}

export const toPublic = (it: GrammarItem): PublicGrammarItem => ({ id: it.id, topic: it.topic, sentence: it.sentence, choices: shuffle(it.choices) });

export function checkAnswer(it: GrammarItem, answer: unknown): boolean {
  return typeof answer === "string" && answer.trim().toLowerCase() === (it.choices[it.answer] ?? "").toLowerCase();
}

/** Multiplier from the current unbroken streak (3+ → ×2, 6+ → ×3). */
export function multiplier(streak: number): number {
  return Math.min(GXP.maxMultiplier, 1 + Math.floor(streak / GXP.streakStep));
}
export function speedBonus(ms: number): number {
  return Math.round(GXP.speedMax * Math.max(0, 1 - ms / (SECONDS_PER_ITEM * 1000)));
}
/** XP for a run: per correct item (base + speed) × multiplier at that moment. */
export function runXp(results: readonly RunResult[]): number {
  let streak = 0, xp = 0;
  for (const r of results) {
    if (!r.correct) { streak = 0; continue; }
    streak += 1;
    xp += (GXP.correct + speedBonus(r.ms)) * multiplier(streak);
  }
  return xp;
}
export const cleared = (score: number) => score >= CLEAR_SCORE;

/** Tier t is open when t = 1 or the tier below was cleared. */
export function unlockedTiers(bestByTier: ReadonlyMap<number, number>): number[] {
  return GRAMMAR_TIERS.filter((t) => t.tier === 1 || cleared(bestByTier.get(t.tier - 1) ?? 0)).map((t) => t.tier);
}
