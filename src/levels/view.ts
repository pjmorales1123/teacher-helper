// Builds a student's LevelView from the database: bests, attempt history and skill mastery.
import type { Db } from "../db/connection.ts";
import type { ContentStore } from "./content.ts";
import { skillMastery, type SkillMastery } from "./mastery.ts";
import { levelView, type LevelView } from "./progression.ts";
import { bestByQuest, listAttempts } from "./repo.ts";
import type { ItemResult } from "./types.ts";

/** Results of a student's attempts at `level`, oldest first. */
export function levelResults(db: Db, studentId: string, level: number): ItemResult[][] {
  return listAttempts(db, studentId, 400).filter((a) => a.level === level).reverse()
    .map((a) => JSON.parse(a.results) as ItemResult[]);
}

export function masteryFor(db: Db, studentId: string, level: number): SkillMastery[] {
  return skillMastery(level, levelResults(db, studentId, level));
}

export function viewFor(db: Db, store: ContentStore, studentId: string, level: number): LevelView {
  return levelView(level, store.forLevel(level, "quest"), store.forLevel(level, "challenge"), bestByQuest(db, studentId), masteryFor(db, studentId, level));
}
