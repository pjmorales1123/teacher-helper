// Types for Grammar Rush: a leveled bank of fill-in-the-blank sentences.
export interface GrammarItem {
  id: string;
  topic: string;
  sentence: string; // contains exactly one ___ blank
  choices: string[];
  answer: number;
  why: string;
}
export interface GrammarBank {
  tier: number;
  name: string;
  items: GrammarItem[];
}
export interface PublicGrammarItem {
  id: string;
  topic: string;
  sentence: string;
  choices: string[]; // shuffled
}
export interface RunResult {
  id: string;
  topic: string;
  correct: boolean;
  ms: number;
}
