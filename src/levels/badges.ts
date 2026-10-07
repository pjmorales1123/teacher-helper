// Badge definitions and the rule that decides which a student has earned.
import { LEVELS } from "./meta.ts";

export interface BadgeDef {
  id: string;
  name: string;
  hint: string;
}

export const BADGES: BadgeDef[] = [
  { id: "first-quest", name: "First Clear", hint: "Finish your first quest." },
  { id: "perfect-quest", name: "Perfect!", hint: "Get every item right in a quest." },
  { id: "streak-3", name: "Three-Peat", hint: "Play three days in a row." },
  { id: "streak-7", name: "Week Warrior", hint: "Play seven days in a row." },
  { id: "reviewer-10", name: "Word Collector", hint: "Finish ten word reviews." },
  { id: "word-keeper", name: "Word Keeper", hint: "Master ten words (box 5)." },
  { id: "flawless-challenge", name: "Flawless", hint: "Score 100% on a Challenge." },
  { id: "rush-clear", name: "Rush Rookie", hint: "Clear a Grammar Rush tier (8 of 10 with hearts left)." },
  { id: "rush-flawless", name: "Perfect Rush", hint: "A Grammar Rush run with 10 of 10 and all hearts." },
  ...LEVELS.slice(1).map((l) => ({ id: `level-${l.level}`, name: `${l.name} Rank`, hint: `Reach ${l.name} rank.` })),
];

export interface BadgeContext {
  attempts: number;
  perfectQuest: boolean;
  streak: number;
  reviews: number;
  mastered: number;
  flawlessChallenge: boolean;
  level: number;
}

/** Every badge the context qualifies for; the repo ignores ones already held. */
export function earnedBadges(c: BadgeContext): string[] {
  const out: string[] = [];
  if (c.attempts >= 1) out.push("first-quest");
  if (c.perfectQuest) out.push("perfect-quest");
  if (c.streak >= 3) out.push("streak-3");
  if (c.streak >= 7) out.push("streak-7");
  if (c.reviews >= 10) out.push("reviewer-10");
  if (c.mastered >= 10) out.push("word-keeper");
  if (c.flawlessChallenge) out.push("flawless-challenge");
  for (const l of LEVELS) if (l.level > 1 && c.level >= l.level) out.push(`level-${l.level}`);
  return out;
}
