// Validates quest JSON (built-in files and teacher-authored content).
// Returns a normalized Quest or a list of readable problems.
import { MAX_LEVEL, SKILLS } from "./meta.ts";
import type { Item, Quest, QuestKind, Word } from "./types.ts";

const KINDS: QuestKind[] = ["quest", "challenge", "placement"];
const ID_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function validateItem(raw: unknown, i: number, kind: QuestKind, errors: string[]): Item | null {
  const at = `items[${i}]`;
  if (!isObj(raw)) return errors.push(`${at} must be an object`), null;
  const id = text(raw.id) || `i${i + 1}`;
  const type = raw.type;
  const skill = text(raw.skill);
  const prompt = text(raw.prompt);
  const why = text(raw.why);
  if (!SKILLS[skill]) errors.push(`${at}.skill "${skill}" is not a known skill`);
  if (!prompt) errors.push(`${at}.prompt is required`);
  if (!why) errors.push(`${at}.why (explanation) is required`);
  let level: number | undefined;
  if (kind === "placement") {
    level = Number(raw.level);
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) errors.push(`${at}.level must be 1–${MAX_LEVEL}`);
  }
  const base = { id, skill, prompt, why, ...(level ? { level } : {}) };
  if (type === "mc") {
    const choices = Array.isArray(raw.choices) ? raw.choices.map(text).filter(Boolean) : [];
    const answer = Number(raw.answer);
    if (choices.length < 2 || choices.length > 5) errors.push(`${at}.choices needs 2–5 entries`);
    if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) errors.push(`${at}.answer must index a choice`);
    return { ...base, type: "mc", choices, answer };
  }
  if (type === "order") {
    const steps = Array.isArray(raw.steps) ? raw.steps.map(text).filter(Boolean) : [];
    if (steps.length < 3 || steps.length > 6) errors.push(`${at}.steps needs 3–6 entries`);
    if (new Set(steps).size !== steps.length) errors.push(`${at}.steps must be distinct`);
    return { ...base, type: "order", steps };
  }
  if (type === "short") {
    const accept = Array.isArray(raw.accept) ? raw.accept.map(text).filter(Boolean) : [];
    if (!accept.length) errors.push(`${at}.accept needs at least one accepted answer`);
    return { ...base, type: "short", accept };
  }
  errors.push(`${at}.type must be mc, order or short`);
  return null;
}

function validateWord(raw: unknown, i: number, errors: string[]): Word {
  const w = isObj(raw) ? raw : {};
  const word = text(w.word);
  const meaning = text(w.meaning);
  if (!word || !meaning) errors.push(`words[${i}] needs word and meaning`);
  return { word, meaning, example: text(w.example) };
}

export interface Validation {
  quest: Quest | null;
  errors: string[];
}

export function validateQuest(raw: unknown): Validation {
  const errors: string[] = [];
  if (!isObj(raw)) return { quest: null, errors: ["Quest must be a JSON object"] };
  const id = text(raw.id).toLowerCase();
  if (!ID_RE.test(id)) errors.push('id must be 2–40 chars of a-z, 0-9 and "-" (e.g. "l2-q5")');
  const level = Number(raw.level);
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) errors.push(`level must be 1–${MAX_LEVEL}`);
  const kind = (KINDS as string[]).includes(String(raw.kind)) ? (raw.kind as QuestKind) : "quest";
  if (raw.kind !== undefined && kind !== raw.kind) errors.push("kind must be quest, challenge or placement");
  const title = text(raw.title);
  if (!title) errors.push("title is required");
  const order = Number.isInteger(Number(raw.order)) ? Number(raw.order) : 99;

  let tip: Quest["tip"] = null;
  if (isObj(raw.tip)) {
    tip = { skill: text(raw.tip.skill), title: text(raw.tip.title), text: text(raw.tip.text) };
    if (!SKILLS[tip.skill]) errors.push(`tip.skill "${tip.skill}" is not a known skill`);
    if (!tip.title || !tip.text) errors.push("tip needs title and text");
  } else if (kind === "quest") errors.push("a quest needs a tip (mini-lesson)");

  let passage: Quest["passage"] = null;
  if (isObj(raw.passage)) {
    passage = { title: text(raw.passage.title), text: text(raw.passage.text) };
    if (!passage.text) errors.push("passage.text is required");
  } else if (kind !== "placement") errors.push("passage is required");

  const words = Array.isArray(raw.words) ? raw.words.map((w, i) => validateWord(w, i, errors)) : [];
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((it, i) => validateItem(it, i, kind, errors))
    .filter((it): it is Item => it !== null);
  const min = kind === "quest" ? 4 : 6;
  if (items.length < min) errors.push(`a ${kind} needs at least ${min} items`);
  if (items.length > 24) errors.push("too many items (max 24)");
  if (new Set(items.map((it) => it.id)).size !== items.length) errors.push("item ids must be unique");
  if (kind === "quest" && tip) {
    const on = (skill: string) => items.filter((it) => it.skill === skill).length;
    if (on(tip.skill) < 3) errors.push(`a quest needs at least 3 items on its tip skill (${tip.skill}) so it can count as mastery evidence`);
    if (!Object.keys(SKILLS).some((sk) => sk !== tip.skill && on(sk) >= 3)) errors.push("a quest needs at least 3 items on a second skill (no-hint evidence for that skill)");
  }
  if (items.filter((it) => it.type !== "mc").length > 2) errors.push("at most 2 order/short items per passage; mastery evidence should be multiple choice");

  if (errors.length) return { quest: null, errors };
  return { quest: { id, level, kind, order, title, tip, passage, words, items }, errors };
}
