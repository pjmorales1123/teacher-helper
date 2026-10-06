// Teacher grading: review submissions, ask the AI for a draft, approve.
import { Router } from "express";
import type { Db } from "../../db/connection.ts";
import { bad, intParam, notFound, num, str } from "../../lib/http.ts";
import type { AiAdapter } from "../../services/ai/adapter.ts";
import { sectionParam } from "../../lib/section.ts";
import { requireTeacher } from "../../services/auth.ts";
import type { Storage } from "../../services/storage.ts";
import { getActivity } from "../activities/repo.ts";
import { prescoreActivity } from "./batch.ts";
import { approveScore, getSubmission, listSubmissions, reopenSubmission, saveDraft } from "../submissions/repo.ts";

export function gradingRoutes(db: Db, ai: AiAdapter, storage: Storage): Router {
  const r = Router();
  r.use(requireTeacher);

  r.get("/submissions", (req, res) => {
    const activityId = typeof req.query.activity === "string" ? Number(req.query.activity) : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    res.json(listSubmissions(db, { activityId: activityId || undefined, status, section: sectionParam(req.query.section) }));
  });

  r.get("/submissions/:id", (req, res) => {
    const s = getSubmission(db, intParam(req.params.id, "Submission id"));
    if (!s) notFound("Submission");
    res.json(s);
  });

  r.get("/submissions/:id/image", (req, res) => {
    const s = getSubmission(db, intParam(req.params.id, "Submission id"));
    if (!s || s.kind !== "image") notFound("Image");
    res.sendFile(storage.pathFor(s.content));
  });

  r.post("/submissions/:id/prescore", async (req, res) => {
    const s = getSubmission(db, intParam(req.params.id, "Submission id"));
    if (!s) notFound("Submission");
    if (s.status === "approved") bad("Already approved. Reopen it first to re-score.");
    const activity = getActivity(db, s.activity_id);
    if (!activity) notFound("Activity");
    const imagePath = s.kind === "image" ? storage.pathFor(s.content) : null;
    const draft = await ai.prescore(activity, s, imagePath);
    saveDraft(db, s.id, draft.score, draft.feedback);
    res.json({ draft, backend: ai.backend });
  });

  r.post("/activities/:id/prescore-all", async (req, res) => {
    const result = await prescoreActivity(db, ai, storage, intParam(req.params.id, "Activity id"));
    if (!result) notFound("Activity");
    res.json(result);
  });

  r.post("/submissions/:id/approve", (req, res) => {
    const s = getSubmission(db, intParam(req.params.id, "Submission id"));
    if (!s) notFound("Submission");
    const body = req.body as Record<string, unknown>;
    const score = num(body.score, "Score", { min: 0, max: s.max_score });
    const feedback = str(body.feedback, "Feedback", { max: 5000 });
    approveScore(db, s.id, score, feedback);
    res.json({ ok: true });
  });

  r.post("/submissions/:id/reopen", (req, res) => {
    const id = intParam(req.params.id, "Submission id");
    if (!getSubmission(db, id)) notFound("Submission");
    reopenSubmission(db, id);
    res.json({ ok: true });
  });

  return r;
}
