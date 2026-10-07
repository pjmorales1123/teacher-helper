// Grammar Rush tiers, topics and scoring rules.
export const GRAMMAR_TOPICS: Record<string, string> = {
  sva: "Subject–verb agreement",
  pronoun: "Pronouns",
  possessive: "Possessives & homophones",
  tense: "Verb tense",
  article: "Articles",
  plural: "Plurals",
  preposition: "Prepositions",
  "adjective-adverb": "Adjectives vs adverbs",
  comparison: "Comparatives & superlatives",
  conjunction: "Conjunctions",
  modal: "Modals",
  passive: "Passive voice",
  conditional: "Conditionals",
  relative: "Relative pronouns",
  reported: "Reported speech",
  parallel: "Parallel structure",
  subjunctive: "Subjunctive & formal forms",
};
export const GRAMMAR_TIERS = [
  { tier: 1, name: "Warrior", topics: ["sva", "pronoun", "article", "plural"] },
  { tier: 2, name: "Elite", topics: ["sva", "possessive", "tense", "preposition"] },
  { tier: 3, name: "Master", topics: ["tense", "pronoun", "adjective-adverb", "comparison", "conjunction"] },
  { tier: 4, name: "Grandmaster", topics: ["tense", "sva", "modal", "pronoun"] },
  { tier: 5, name: "Epic", topics: ["conditional", "passive", "relative", "reported"] },
  { tier: 6, name: "Legend", topics: ["subjunctive", "sva", "parallel", "conditional", "modal"] },
] as const;
export const MAX_TIER = GRAMMAR_TIERS.length;
export const RUN_SIZE = 10;
export const HEARTS = 3;
export const SECONDS_PER_ITEM = 15;
export const CLEAR_SCORE = 8; // out of RUN_SIZE unlocks the next tier
export const GXP = { correct: 5, speedMax: 5, streakStep: 3, maxMultiplier: 3, clearBonus: 30 } as const;
export const BANK_MIN = 30;
export const DAILY_RUSH_XP = 150; // XP from Grammar Rush counted per day (runs still count for best scores)
