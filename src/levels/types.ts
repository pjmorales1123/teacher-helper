// Types for LEVELS content and progress.
export type QuestKind = "quest" | "challenge" | "placement";
export type ItemType = "mc" | "order" | "short";

export interface Word {
  word: string;
  meaning: string;
  example: string;
}

export interface BaseItem {
  id: string;
  type: ItemType;
  skill: string;
  level?: number; // placement items only
  prompt: string;
  why: string;
}
export interface McItem extends BaseItem {
  type: "mc";
  choices: string[];
  answer: number;
}
export interface OrderItem extends BaseItem {
  type: "order";
  steps: string[];
}
export interface ShortItem extends BaseItem {
  type: "short";
  accept: string[];
}
export type Item = McItem | OrderItem | ShortItem;

export interface Quest {
  id: string;
  level: number;
  kind: QuestKind;
  order: number;
  title: string;
  tip: { skill: string; title: string; text: string } | null;
  passage: { title: string; text: string } | null;
  words: Word[];
  items: Item[];
  custom?: boolean;
}

/** Item as sent to a student: no answers, order steps shuffled. */
export type PublicItem = Omit<McItem, "answer" | "why"> | (Omit<OrderItem, "why">) | Omit<ShortItem, "accept" | "why">;

export interface ItemResult {
  id: string;
  skill: string;
  correct: boolean;
}

export interface Progress {
  student_id: string;
  level: number;
  xp: number;
  streak: number;
  last_active: string | null;
  placed: number;
  placement_round: number;
  reviews: number;
}

export interface Attempt {
  id: number;
  student_id: string;
  quest_id: string;
  level: number;
  kind: QuestKind;
  score: number;
  total: number;
  passed: number;
  results: string;
  created_at: string;
}
