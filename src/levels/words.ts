// Word bank with Leitner spaced review. Box 1 = new, box 5 = mastered.
import type { Db } from "../db/connection.ts";
import { shuffle } from "./engine.ts";
import { REVIEW_DAYS } from "./meta.ts";
import type { Word } from "./types.ts";
import { addDays } from "./dates.ts";

export interface BankWord extends Word {
  id: number;
  box: number;
  due: string;
}

export const MAX_BOX = REVIEW_DAYS.length;
export const REVIEW_SIZE = 10;

/** Adds words a student has not met yet; existing entries keep their box. */
export function addWords(db: Db, studentId: string, words: Word[], today: string): number {
  const ins = db.prepare(
    "INSERT OR IGNORE INTO lv_words (student_id, word, meaning, example, box, due) VALUES (?, ?, ?, ?, 1, ?)",
  );
  let added = 0;
  for (const w of words) added += Number(ins.run(studentId, w.word.toLowerCase(), w.meaning, w.example, today).changes);
  return added;
}

export function listWords(db: Db, studentId: string): BankWord[] {
  return db.prepare("SELECT id, word, meaning, example, box, due FROM lv_words WHERE student_id = ? ORDER BY box DESC, word")
    .all(studentId) as unknown as BankWord[];
}

export function dueWords(db: Db, studentId: string, today: string, limit = REVIEW_SIZE): BankWord[] {
  return db.prepare("SELECT id, word, meaning, example, box, due FROM lv_words WHERE student_id = ? AND due <= ? ORDER BY box, due LIMIT ?")
    .all(studentId, today, limit) as unknown as BankWord[];
}

export function countDue(db: Db, studentId: string, today: string): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM lv_words WHERE student_id = ? AND due <= ?").get(studentId, today) as { n: number };
  return Number(row.n);
}

export function countMastered(db: Db, studentId: string): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM lv_words WHERE student_id = ? AND box >= ?").get(studentId, MAX_BOX) as { n: number };
  return Number(row.n);
}

/** Next box and due date after a review answer. */
export function nextBox(box: number, correct: boolean): { box: number; days: number } {
  const next = correct ? Math.min(MAX_BOX, box + 1) : 1;
  return { box: next, days: REVIEW_DAYS[next - 1]! };
}

export function applyReview(db: Db, studentId: string, wordId: number, correct: boolean, today: string): void {
  const row = db.prepare("SELECT box FROM lv_words WHERE id = ? AND student_id = ?").get(wordId, studentId) as { box: number } | undefined;
  if (!row) return;
  const { box, days } = nextBox(row.box, correct);
  db.prepare("UPDATE lv_words SET box = ?, due = ? WHERE id = ?").run(box, addDays(today, days), wordId);
}

export interface ReviewItem {
  id: number;
  word: string;
  example: string;
  choices: string[];
}

/** Builds meaning multiple-choice items; distractors come from the student's other words, then the pool. */
export function buildReview(due: BankWord[], pool: Word[]): { items: ReviewItem[]; answers: Map<number, number> } {
  const answers = new Map<number, number>();
  const meanings = [...new Set([...due, ...pool].map((w) => w.meaning))];
  const items = due.map((w) => {
    const others = shuffle(meanings.filter((m) => m !== w.meaning)).slice(0, 3);
    const choices = shuffle([w.meaning, ...others]);
    answers.set(w.id, choices.indexOf(w.meaning));
    return { id: w.id, word: w.word, example: w.example.replace(new RegExp(w.word, "ig"), "_____"), choices };
  });
  return { items, answers };
}
