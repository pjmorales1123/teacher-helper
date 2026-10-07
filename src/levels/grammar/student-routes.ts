// Student Grammar Rush API, mounted under /api/student/levels/grammar (student auth applied by the parent router).
import { Router } from "express";
import type { Db } from "../../db/connection.ts";
import { bad } from "../../lib/http.ts";
import type { Banks } from "./bank.ts";
import { answerRun, finishRun, grammarHome, startRun } from "./service.ts";

export function grammarStudentRoutes(db: Db, banks: Banks): Router {
  const r = Router();
  const sid = (res: { locals: Record<string, unknown> }) => res.locals.studentId as string;
  const run = <T>(fn: () => T): T => { try { return fn(); } catch (e) { bad((e as Error).message); } };

  r.get("/", (_req, res) => res.json(grammarHome(db, banks, sid(res))));
  r.post("/run/start", (req, res) => {
    const tier = Number((req.body as { tier?: unknown }).tier);
    if (!Number.isInteger(tier)) bad("tier is required");
    res.json(run(() => startRun(db, banks, sid(res), tier)));
  });
  r.post("/run/answer", (req, res) => {
    const b = req.body as { item?: unknown; answer?: unknown; ms?: unknown };
    res.json(run(() => answerRun(sid(res), String(b.item ?? ""), b.answer, Number(b.ms))));
  });
  r.post("/run/finish", (_req, res) => res.json(run(() => finishRun(db, sid(res)))));
  return r;
}
