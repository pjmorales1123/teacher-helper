// Builds a student's LevelView from the database: bests, attempt history and skill mastery.
import type { Db } from "../db/connection.ts";
import type { ContentStore } from "./content.ts";
import { todayLocal } from "./dates.ts";
import { skillMastery, type SkillMastery } from "./mastery.ts";
import { levelView, type LevelView } from "./progression.ts";
import { bestByQuest, listAttempts } from "./repo.ts";
import type { Attempt } from "./types.ts";

/** A student's attempts at `level`, oldest first. */
export function levelAttempts(db: Db, studentId: string, level: number): Attempt[] {
  return listAttempts(db, studentId, 400).filter((a) => a.level === level).reverse();
}

export function masteryFor(db: Db, store: ContentStore, studentId: string, level: number): SkillMastery[] {
  const quests = new Map(store.all().map((q) => [q.id, q]));
  return skillMastery(level, levelAttempts(db, studentId, level), quests);
}

export function viewFor(db: Db, store: ContentStore, studentId: string, level: number): LevelView {
  const attempts = levelAttempts(db, studentId, level);
  const quests = new Map(store.all().map((q) => [q.id, q]));
  const last = attempts[attempts.length - 1];
  const lastSkill = last ? quests.get(last.quest_id)?.tip?.skill ?? null : null;
  return levelView(level, store.forLevel(level, "quest"), store.forLevel(level, "challenge"), bestByQuest(db, studentId),
    skillMastery(level, attempts, quests), lastSkill, todayLocal());
}
