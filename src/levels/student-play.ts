// Quest play: fetch a quest without answers, check one item, submit the whole quest.
import { Router } from "express";
import type { Db } from "../db/connection.ts";
import { bad, notFound } from "../lib/http.ts";
import type { ContentStore } from "./content.ts";
import { checkItem, revealAnswer, toPublicItem } from "./engine.ts";
import { SKILLS, levelMeta } from "./meta.ts";
import { allMastered } from "./mastery.ts";
import { getProgress } from "./repo.ts";
import { masteryFor } from "./view.ts";
import { finishQuest } from "./service.ts";
import type { Quest } from "./types.ts";

export function studentPlayRoutes(db: Db, store: ContentStore): Router {
  const r = Router();

  function playable(studentId: string, id: string): Quest {
    const q = store.get(id);
    if (!q || q.kind === "placement") notFound("Quest");
    const p = getProgress(db, studentId);
    if (q.level > p.level) bad("This quest is above your level for now.");
    if (q.kind === "challenge" && !allMastered(masteryFor(db, store, studentId, q.level))) bad("Master every skill in this rank first.");
    return q;
  }

  r.get("/quests/:id", (req, res) => {
    const q = playable(res.locals.studentId as string, String(req.params.id));
    res.json({
      id: q.id, kind: q.kind, level: q.level, levelName: levelMeta(q.level).name, title: q.title,
      tip: q.tip ? { ...q.tip, skillLabel: SKILLS[q.tip.skill]?.label ?? q.tip.skill, strand: SKILLS[q.tip.skill]?.strand ?? "comprehension" } : null,
      passage: q.passage, words: q.words, items: q.items.map(toPublicItem),
    });
  });

  /** Instant feedback for one item. Nothing is recorded. */
  r.post("/quests/:id/check", (req, res) => {
    const q = playable(res.locals.studentId as string, String(req.params.id));
    const body = req.body as { item?: string; answer?: unknown };
    const item = q.items.find((i) => i.id === String(body.item ?? ""));
    if (!item) notFound("Item");
    const correct = checkItem(item, body.answer);
    res.json({ correct, answer: revealAnswer(item), why: item.why });
  });

  r.post("/quests/:id/submit", (req, res) => {
    const studentId = res.locals.studentId as string;
    const q = playable(studentId, String(req.params.id));
    const answers = (req.body as { answers?: Record<string, unknown> }).answers;
    if (!answers || typeof answers !== "object") bad("Answers are required.");
    res.json(finishQuest(db, store, studentId, q, answers));
  });

  return r;
}
