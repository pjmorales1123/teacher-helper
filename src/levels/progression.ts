// Level map, streaks, XP and placement rules. Pure functions over repo data.
import { daysBetween } from "./dates.ts";
import type { GradeOutcome } from "./engine.ts";
import { COMBO_FROM, MAX_LEVEL, XP, levelMeta, stars } from "./meta.ts";
import type { BestRow } from "./repo.ts";
import type { Progress, Quest } from "./types.ts";

export interface QuestStatus {
  id: string;
  title: string;
  order: number;
  skill: string | null;
  tries: number;
  best: number;
  total: number;
  passed: boolean;
  stars: number;
  custom: boolean;
}

export function questStatus(q: Quest, best: BestRow | undefined): QuestStatus {
  return {
    id: q.id, title: q.title, order: q.order, skill: q.tip?.skill ?? null,
    tries: best?.tries ?? 0, best: best?.best ?? 0, total: best?.total ?? q.items.length,
    passed: Boolean(best?.passed), stars: best ? stars(best.best, best.total) : 0, custom: Boolean(q.custom),
  };
}

export interface LevelView {
  level: number;
  name: string;
  quests: QuestStatus[];
  challenge: (QuestStatus & { unlocked: boolean }) | null;
  maxLevel: boolean;
}

export function levelView(level: number, quests: Quest[], challenges: Quest[], bests: Map<string, BestRow>): LevelView {
  const qs = quests.map((q) => questStatus(q, bests.get(q.id)));
  const c = challenges[0];
  const unlocked = qs.length > 0 && qs.every((q) => q.passed);
  return {
    level, name: levelMeta(level).name, quests: qs,
    challenge: c ? { ...questStatus(c, bests.get(c.id)), unlocked } : null,
    maxLevel: level >= MAX_LEVEL,
  };
}

/** Streak after activity today: continues if yesterday was active, restarts otherwise. */
export function nextStreak(p: Pick<Progress, "streak" | "last_active">, today: string): number {
  if (!p.last_active) return 1;
  const gap = daysBetween(p.last_active, today);
  if (gap === 0) return Math.max(1, p.streak);
  return gap === 1 ? p.streak + 1 : 1;
}

/** Streak as it stands now (0 if the student skipped a day). */
export function currentStreak(p: Pick<Progress, "streak" | "last_active">, today: string): number {
  if (!p.last_active) return 0;
  return daysBetween(p.last_active, today) <= 1 ? p.streak : 0;
}

/** Bonus XP for every correct answer that is the COMBO_FROM-th or later in an unbroken run. */
export function comboBonus(results: readonly { correct: boolean }[]): number {
  let run = 0;
  let bonus = 0;
  for (const r of results) {
    run = r.correct ? run + 1 : 0;
    if (run >= COMBO_FROM) bonus += XP.combo;
  }
  return bonus;
}

export function xpFor(kind: Quest["kind"], outcome: GradeOutcome, firstPass: boolean): number {
  let xp = outcome.score * XP.item + comboBonus(outcome.results);
  if (kind === "quest" && firstPass) xp += XP.questFirstPass;
  if (kind === "challenge" && outcome.passed) xp += XP.challengePass;
  return xp;
}

/** Placement: a round of 3 items per level; stop at the first failed round. */
export const PLACEMENT_ROUND_SIZE = 3;
export const PLACEMENT_ROUND_PASS = 2;

export function placementStep(round: number, correct: number): { placed: number | null; nextRound: number } {
  const passed = correct >= PLACEMENT_ROUND_PASS;
  if (!passed) return { placed: Math.max(1, round - 1), nextRound: 1 };
  if (round >= MAX_LEVEL) return { placed: MAX_LEVEL, nextRound: 1 };
  return { placed: null, nextRound: round + 1 };
}
