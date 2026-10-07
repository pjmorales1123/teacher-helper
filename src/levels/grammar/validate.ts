// Validates a Grammar Rush bank file.
import { GRAMMAR_TOPICS, MAX_TIER } from "./meta.ts";
import type { GrammarBank, GrammarItem } from "./types.ts";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function validateItem(raw: unknown, i: number, errors: string[]): GrammarItem | null {
  const at = `items[${i}]`;
  if (!isObj(raw)) return errors.push(`${at} must be an object`), null;
  const id = text(raw.id) || `g${i + 1}`;
  const topic = text(raw.topic);
  const sentence = text(raw.sentence);
  const why = text(raw.why);
  const choices = Array.isArray(raw.choices) ? raw.choices.map(text) : [];
  const answer = Number(raw.answer);
  if (!GRAMMAR_TOPICS[topic]) errors.push(`${at}.topic "${topic}" is not a known topic`);
  if ((sentence.match(/___/g) ?? []).length !== 1) errors.push(`${at}.sentence needs exactly one ___ blank`);
  if (choices.length !== 4 || choices.some((c) => !c)) errors.push(`${at}.choices needs exactly 4 non-empty entries`);
  if (new Set(choices.map((c) => c.toLowerCase())).size !== choices.length) errors.push(`${at}.choices must be distinct`);
  if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) errors.push(`${at}.answer must index a choice`);
  if (!why) errors.push(`${at}.why is required`);
  return { id, topic, sentence, choices, answer, why };
}

export function validateBank(raw: unknown): { bank: GrammarBank | null; errors: string[] } {
  const errors: string[] = [];
  if (!isObj(raw)) return { bank: null, errors: ["Bank must be a JSON object"] };
  const tier = Number(raw.tier);
  if (!Number.isInteger(tier) || tier < 1 || tier > MAX_TIER) errors.push(`tier must be 1–${MAX_TIER}`);
  const name = text(raw.name) || `Tier ${tier}`;
  const items = (Array.isArray(raw.items) ? raw.items : []).map((it, i) => validateItem(it, i, errors)).filter((it): it is GrammarItem => it !== null);
  if (new Set(items.map((it) => it.id)).size !== items.length) errors.push("item ids must be unique");
  if (errors.length) return { bank: null, errors };
  return { bank: { tier, name, items }, errors };
}
