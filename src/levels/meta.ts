// Rank names and skill taxonomy. Students see rank names only; teachers also see the grade band.
export interface LevelMeta {
  level: number;
  name: string;
  band: string;
  words: string;
}

export const LEVELS: readonly LevelMeta[] = [
  { level: 1, name: "Warrior", band: "Grade 3", words: "90–130" },
  { level: 2, name: "Elite", band: "Grade 4", words: "130–170" },
  { level: 3, name: "Master", band: "Grade 5", words: "170–210" },
  { level: 4, name: "Grandmaster", band: "Grade 6", words: "210–260" },
  { level: 5, name: "Epic", band: "Grade 7", words: "250–300" },
  { level: 6, name: "Legend", band: "Grade 8", words: "290–350" },
];
export const MAX_LEVEL = LEVELS.length;

export function levelMeta(level: number): LevelMeta {
  return LEVELS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1]!;
}

export type Strand = "vocabulary" | "comprehension" | "analysis";

export const SKILLS: Record<string, { label: string; strand: Strand }> = {
  "context-clues": { label: "Context clues", strand: "vocabulary" },
  "word-parts": { label: "Word parts", strand: "vocabulary" },
  synonyms: { label: "Synonyms & antonyms", strand: "vocabulary" },
  "multiple-meaning": { label: "Multiple meanings", strand: "vocabulary" },
  "main-idea": { label: "Main idea", strand: "comprehension" },
  details: { label: "Key details", strand: "comprehension" },
  sequence: { label: "Sequence", strand: "comprehension" },
  "cause-effect": { label: "Cause & effect", strand: "comprehension" },
  inference: { label: "Inference", strand: "comprehension" },
  summary: { label: "Summarizing", strand: "comprehension" },
  purpose: { label: "Author's purpose", strand: "analysis" },
  "point-of-view": { label: "Point of view", strand: "analysis" },
  compare: { label: "Compare & contrast", strand: "analysis" },
  evidence: { label: "Using evidence", strand: "analysis" },
  theme: { label: "Theme", strand: "analysis" },
  figurative: { label: "Figurative language", strand: "analysis" },
};

export const SKILL_IDS = Object.keys(SKILLS);

/** The skills each rank is responsible for. A student masters all of them to unlock the rank's Challenge. */
export const LEVEL_SKILLS: Record<number, readonly string[]> = {
  1: ["details", "sequence", "main-idea", "context-clues"],
  2: ["cause-effect", "inference", "synonyms", "summary"],
  3: ["word-parts", "compare", "evidence", "figurative"],
  4: ["purpose", "multiple-meaning", "summary", "cause-effect"],
  5: ["point-of-view", "evidence", "figurative", "context-clues"],
  6: ["theme", "compare", "purpose", "evidence"],
};
/** A skill is mastered at a level when MASTERY_NEED of the last MASTERY_WINDOW items on it (at that level) were right. */
export const MASTERY_WINDOW = 6;
export const MASTERY_NEED = 5;

export const QUEST_PASS = 0.7;
export const CHALLENGE_PASS = 0.8;
export const XP = { item: 10, questFirstPass: 25, challengePass: 50, reviewWord: 5, combo: 5 } as const;
export const COMBO_FROM = 3; // third correct answer in a row and beyond earns the combo bonus
export const DAILY_GOAL = 50; // XP per day
export const REVIEW_DAYS = [1, 3, 7, 14, 30] as const;

export function stars(score: number, total: number): number {
  const r = total ? score / total : 0;
  return r >= 1 ? 3 : r >= 0.85 ? 2 : r >= QUEST_PASS ? 1 : 0;
}
