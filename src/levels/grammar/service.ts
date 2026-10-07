// Grammar Rush run lifecycle: start (draw), answer (grade + hearts), finish (XP, best, unlocks, badges).
import type { Db } from "../../db/connection.ts";
import { todayLocal } from "../dates.ts";
import { awardBadges, getProgress, updateProgress } from "../repo.ts";
import { nextStreak } from "../progression.ts";
import { logXp } from "../xp-log.ts";
import type { Banks } from "./bank.ts";
import { checkAnswer, cleared, drawRun, multiplier, runXp, toPublic, topicStats, unlockedTiers } from "./engine.ts";
import { DAILY_RUSH_XP, GRAMMAR_TOPICS, HEARTS, RUN_SIZE, SECONDS_PER_ITEM, GXP } from "./meta.ts";
import { addRun, bestByTier, listRuns, runsOnDay } from "./repo.ts";
import type { GrammarItem, RunResult } from "./types.ts";

interface Run { tier: number; items: GrammarItem[]; results: RunResult[]; hearts: number; startedAt: number }
const runs = new Map<string, Run>(); // studentId -> live run (one at a time)

const recentResults = (db: Db, studentId: string) => listRuns(db, studentId, 30).map((r) => JSON.parse(r.results) as RunResult[]);

export function startRun(db: Db, banks: Banks, studentId: string, tier: number) {
  const bank = banks.get(tier);
  if (!bank) throw new Error("No such tier.");
  if (!unlockedTiers(bestByTier(db, studentId)).includes(tier)) throw new Error("Clear the tier below first.");
  const history = recentResults(db, studentId);
  const recentIds = new Set(history.slice(0, 2).flat().map((r) => r.id));
  const items = drawRun(bank.items, topicStats(history), RUN_SIZE, recentIds);
  runs.set(studentId, { tier, items, results: [], hearts: HEARTS, startedAt: Date.now() });
  return { tier, name: bank.name, hearts: HEARTS, seconds: SECONDS_PER_ITEM, items: items.map(toPublic) };
}

export function answerRun(studentId: string, itemId: string, answer: unknown, ms: number) {
  const run = runs.get(studentId);
  if (!run) throw new Error("Start a run first.");
  const idx = run.results.length;
  const item = run.items[idx];
  if (!item || item.id !== itemId) throw new Error("That is not the current question.");
  const correct = checkAnswer(item, answer);
  const clampedMs = Math.max(0, Math.min(Number(ms) || SECONDS_PER_ITEM * 1000, SECONDS_PER_ITEM * 1000));
  run.results.push({ id: item.id, topic: item.topic, correct, ms: clampedMs });
  if (!correct) run.hearts -= 1;
  let streak = 0; for (const r of run.results) streak = r.correct ? streak + 1 : 0;
  const xpSoFar = runXp(run.results);
  const over = run.hearts <= 0 || run.results.length >= run.items.length;
  return { correct, answer: item.choices[item.answer], why: item.why, topic: GRAMMAR_TOPICS[item.topic] ?? item.topic, hearts: run.hearts, streak, multiplier: multiplier(streak), xpSoFar, over };
}

export function finishRun(db: Db, studentId: string) {
  const run = runs.get(studentId);
  if (!run) throw new Error("Start a run first.");
  runs.delete(studentId);
  const today = todayLocal();
  const score = run.results.filter((r) => r.correct).length;
  const total = run.items.length;
  const before = bestByTier(db, studentId);
  const isClear = cleared(score) && run.hearts > 0;
  const firstClear = isClear && !cleared(before.get(run.tier) ?? 0);
  const raw = runXp(run.results) + (firstClear ? GXP.clearBonus : 0);
  const todayXp = runsOnDay(db, studentId, today).xp;
  const xp = Math.max(0, Math.min(raw, DAILY_RUSH_XP - todayXp));
  addRun(db, { studentId, tier: run.tier, score, total, xp, hearts: run.hearts, results: run.results });
  const p = getProgress(db, studentId);
  updateProgress(db, studentId, { xp: p.xp + xp, streak: nextStreak(p, today), last_active: today });
  logXp(db, studentId, today, xp);
  const badges: string[] = [];
  if (isClear) badges.push("rush-clear");
  if (score === total && run.hearts === HEARTS) badges.push("rush-flawless");
  const newBadges = awardBadges(db, studentId, badges);
  const after = bestByTier(db, studentId);
  const unlocked = unlockedTiers(after);
  return {
    tier: run.tier, score, total, hearts: run.hearts, xp, rawXp: raw, capped: xp < raw, cleared: isClear, firstClear,
    best: after.get(run.tier) ?? score, newBest: score > (before.get(run.tier) ?? -1),
    unlockedNext: isClear && unlocked.includes(run.tier + 1) && !unlockedTiers(before).includes(run.tier + 1),
    newBadges, byTopic: topicStats([run.results]).map((s) => ({ ...s, label: GRAMMAR_TOPICS[s.topic] ?? s.topic })),
    review: run.items.slice(0, run.results.length).map((it, i) => ({ sentence: it.sentence, answer: it.choices[it.answer], correct: run.results[i]!.correct, why: it.why })),
  };
}

export function grammarHome(db: Db, banks: Banks, studentId: string) {
  const best = bestByTier(db, studentId);
  const unlocked = unlockedTiers(best);
  const history = recentResults(db, studentId);
  const stats = topicStats(history);
  const today = runsOnDay(db, studentId, todayLocal());
  return {
    tiers: [...banks.values()].sort((a, b) => a.tier - b.tier).map((b) => ({ tier: b.tier, name: b.name, unlocked: unlocked.includes(b.tier), best: best.get(b.tier) ?? null, cleared: cleared(best.get(b.tier) ?? 0), size: RUN_SIZE })),
    runs: history.length, todayXp: today.xp, dailyCap: DAILY_RUSH_XP, hearts: HEARTS, seconds: SECONDS_PER_ITEM,
    weakest: stats.filter((s) => s.total >= 3).slice(0, 2).map((s) => ({ ...s, label: GRAMMAR_TOPICS[s.topic] ?? s.topic })),
    live: runs.has(studentId),
  };
}
