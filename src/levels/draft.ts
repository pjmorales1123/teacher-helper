// Asks the teacher's subscription CLI to draft a quest in our JSON format.
// The draft is validated and returned for the teacher to edit; it is never
// published automatically.
import type { Config } from "../config.ts";
import { cliSpec, runCli } from "../services/ai/cli.ts";
import { SKILLS, SKILL_IDS, levelMeta } from "./meta.ts";
import { validateQuest, type Validation } from "./validate.ts";

export interface DraftRequest {
  level: number;
  skill: string;
  topic: string;
  kind: "quest" | "challenge";
}

export function buildDraftPrompt(req: DraftRequest, id: string): string {
  const meta = levelMeta(req.level);
  const skillLabel = SKILLS[req.skill]?.label ?? req.skill;
  const isQuest = req.kind === "quest";
  return [
    "You are writing an English reading practice item set for a Filipino public-school app.",
    `Target reading band: ${meta.band} (passage of ${meta.words} words, sentence length and vocabulary suited to that grade).`,
    `Focus skill: ${skillLabel} (id "${req.skill}").${req.topic ? ` Topic or setting: ${req.topic}.` : ""}`,
    "Use Philippine settings, names and everyday situations. Write an ORIGINAL passage; no copyrighted text.",
    isQuest
      ? "Include a tip (mini-lesson): tip.text MUST be 3-5 full sentences that teach the focus skill explicitly, then items that apply it."
      : "This is a level Challenge: no tip, exactly 10 items mixing at least five different skills.",
    `Items: ${isQuest ? "6 items, at least 3 on the focus skill" : "10 items"}. Types: "mc" (4 choices, one correct),`,
    '"order" (3-5 steps in correct order), "short" (typed answer with a list of accepted spellings). Mostly mc.',
    "Every item needs a one-sentence \"why\" that quotes or points to the text.",
    `Allowed skill ids: ${SKILL_IDS.join(", ")}.`,
    "Include 2-3 Tier-2 vocabulary words from the passage with a child-friendly meaning and an example sentence.",
    "",
    "Respond with ONLY one JSON object, no markdown fences, exactly in this shape:",
    JSON.stringify({
      id, level: req.level, kind: req.kind, order: 5, title: "...",
      tip: isQuest ? { skill: req.skill, title: "...", text: "..." } : null,
      passage: { title: "...", text: "..." },
      words: [{ word: "...", meaning: "...", example: "..." }],
      items: [
        { id: "i1", type: "mc", skill: req.skill, prompt: "...", choices: ["...", "...", "...", "..."], answer: 0, why: "..." },
        { id: "i2", type: "order", skill: "sequence", prompt: "...", steps: ["...", "...", "..."], why: "..." },
        { id: "i3", type: "short", skill: "details", prompt: "...", accept: ["..."], why: "..." },
      ],
    }),
  ].join("\n");
}

/** Finds the first JSON object in CLI output (handles the claude JSON envelope and code fences). */
export function extractJson(text: string): unknown {
  let body = text;
  try {
    const outer = JSON.parse(text) as { result?: unknown };
    if (typeof outer.result === "string") body = outer.result;
    else return outer;
  } catch {
    /* plain text */
  }
  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) body = fenced[1];
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The AI reply did not contain a JSON object.");
  return JSON.parse(body.slice(start, end + 1));
}

export async function draftQuest(config: Config, req: DraftRequest, id: string): Promise<Validation & { raw: unknown }> {
  const { stdout } = await runCli(cliSpec(config.aiBackend, null), buildDraftPrompt(req, id), config.aiTimeoutMs);
  const raw = extractJson(stdout);
  if (raw && typeof raw === "object") (raw as Record<string, unknown>).id = id;
  return { ...validateQuest(raw), raw };
}
