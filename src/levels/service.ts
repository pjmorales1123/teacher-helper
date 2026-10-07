// What happens after a student finishes something: attempts, XP, streak,
// level-ups, word bank and badges. Shared by quest and review routes.
import type { Db } from "../db/connection.ts";
import { earnedBadges } from "./badges.ts";
import type { ContentStore } from "./content.ts";
import { todayLocal } from "./dates.ts";
import { gradeQuest, revealAnswer, skillStats, weakestSkills, type GradeOutcome } from "./engine.ts";
import { MAX_LEVEL, XP, levelMeta, stars } from "./meta.ts";
import { comboBonus, nextStreak, xpFor } from "./progression.ts";
import { addAttempt, awardBadges, bestByQuest, countAttempts, getProgress, listAttempts, updateProgress } from "./repo.ts";
import type { ItemResult, Quest } from "./types.ts";
import { masteryFor } from "./view.ts";
import { addWords, applyReview, countMastered } from "./words.ts";
import { logXp } from "./xp-log.ts";

export interface QuestFinish extends GradeOutcome {
  stars: number;
  xp: number;
  combo: number;
  firstPass: boolean;
  leveledUp: boolean;
  level: number;
  levelName: string;
  newBadges: string[];
  review: { id: string; correct: boolean; answer: unknown; why: string }[];
  practice: { skill: string; accuracy: number; quests: { id: string; title: string }[] }[];
  skillsUp: { skill: string; label: string; before: number; after: number; need: number; mastered: boolean; justMastered: boolean }[];
  allMastered: boolean;
}

function refreshBadges(db: Db, studentId: string, extra: Partial<Parameters<typeof earnedBadges>[0]>): string[] {
  const p = getProgress(db, studentId);
  return awardBadges(db, studentId, earnedBadges({
    attempts: countAttempts(db, studentId), perfectQuest: false, flawlessChallenge: false,
    streak: p.streak, reviews: p.reviews, mastered: countMastered(db, studentId), level: p.level, ...extra,
  }));
}

/** Other quests in the level that practise the given skill (2+ items on it), new ones first. */
function questsForSkill(store: ContentStore, level: number, skill: string, except: string, bests: Map<string, { passed: number }>): { id: string; title: string }[] {
  return store.forLevel(level, "quest")
    .filter((q) => q.id !== except && q.items.filter((i) => i.skill === skill).length >= 2)
    .sort((a, b) => Number(Boolean(bests.get(a.id)?.passed)) - Number(Boolean(bests.get(b.id)?.passed)))
    .map((q) => ({ id: q.id, title: q.title }));
}

export function finishQuest(db: Db, store: ContentStore, studentId: string, quest: Quest, answers: Record<string, unknown>): QuestFinish {
  const today = todayLocal();
  const outcome = gradeQuest(quest, answers);
  const bests = bestByQuest(db, studentId);
  const before = bests.get(quest.id);
  const firstPass = outcome.passed && !before?.passed;
  const p = getProgress(db, studentId);
  const masteryBefore = masteryFor(db, studentId, quest.level);
  addAttempt(db, { studentId, questId: quest.id, level: quest.level, kind: quest.kind, ...outcome });
  const masteryAfter = masteryFor(db, studentId, quest.level);

  const xp = xpFor(quest.kind, outcome, firstPass);
  const leveledUp = quest.kind === "challenge" && outcome.passed && quest.level === p.level && p.level < MAX_LEVEL;
  const level = leveledUp ? p.level + 1 : p.level;
  updateProgress(db, studentId, { xp: p.xp + xp, level, streak: nextStreak(p, today), last_active: today });
  logXp(db, studentId, today, xp);
  if (quest.kind === "quest") addWords(db, studentId, quest.words, today);

  const perfect = outcome.total > 0 && outcome.score === outcome.total;
  const newBadges = refreshBadges(db, studentId, {
    perfectQuest: quest.kind === "quest" && perfect, flawlessChallenge: quest.kind === "challenge" && perfect,
  });

  const review = quest.items.map((it, i) => ({ id: it.id, correct: outcome.results[i]!.correct, answer: revealAnswer(it), why: it.why }));
  let practice: QuestFinish["practice"] = [];
  if (!outcome.passed) {
    const recent = quest.kind === "challenge"
      ? listAttempts(db, studentId, 20).map((a) => JSON.parse(a.results) as ItemResult[]) : [outcome.results];
    practice = weakestSkills(skillStats(recent), 2, 2).map((s) => ({
      skill: s.skill, accuracy: s.accuracy, quests: questsForSkill(store, quest.level, s.skill, quest.id, bests),
    })).filter((x) => x.quests.length);
  }
  const touched = new Set(outcome.results.map((r) => r.skill));
  const skillsUp = masteryAfter.filter((m) => touched.has(m.skill)).map((m) => {
    const b = masteryBefore.find((x) => x.skill === m.skill);
    return { skill: m.skill, label: m.label, before: b?.correct ?? 0, after: m.correct, need: m.need, mastered: m.mastered, justMastered: m.mastered && !b?.mastered };
  });
  return {
    ...outcome, stars: quest.kind === "quest" ? stars(outcome.score, outcome.total) : (outcome.passed ? 3 : 0),
    xp, combo: comboBonus(outcome.results), firstPass, leveledUp, level, levelName: levelMeta(level).name, newBadges, review, practice,
    skillsUp, allMastered: masteryAfter.every((m) => m.mastered),
  };
}

export interface ReviewFinish {
  correct: number;
  total: number;
  xp: number;
  newBadges: string[];
  results: { id: number; correct: boolean; answer: number }[];
}

export function finishReview(db: Db, studentId: string, answers: Map<number, number>, given: Record<string, unknown>): ReviewFinish {
  const today = todayLocal();
  const results = [...answers.entries()].map(([id, answer]) => {
    const correct = Number(given[String(id)]) === answer;
    applyReview(db, studentId, id, correct, today);
    return { id, correct, answer };
  });
  const correct = results.filter((r) => r.correct).length;
  const p = getProgress(db, studentId);
  const xp = correct * XP.reviewWord;
  updateProgress(db, studentId, { xp: p.xp + xp, reviews: p.reviews + 1, streak: nextStreak(p, today), last_active: today });
  logXp(db, studentId, today, xp);
  return { correct, total: results.length, xp, newBadges: refreshBadges(db, studentId, {}), results };
}
