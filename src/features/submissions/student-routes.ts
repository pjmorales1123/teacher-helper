// Student-facing API: see required work and status, submit, file effort
// claims, and view own grades. Everything is scoped to the signed-in student.
import { Router } from "express";
import type { Db } from "../../db/connection.ts";
import { bad, intParam, notFound, str } from "../../lib/http.ts";
import { requireStudent } from "../../services/auth.ts";
import type { Storage } from "../../services/storage.ts";
import { getActivity, listActivities } from "../activities/repo.ts";
import { createClaim, listClaimsForStudent } from "../effort-claims/repo.ts";
import { reportForStudent } from "../grades/report.ts";
import { getStudent } from "../students/repo.ts";
import { listForStudent, upsertSubmission } from "./repo.ts";

export function studentApiRoutes(db: Db, storage: Storage): Router {
  const r = Router();
  r.use(requireStudent);

  r.get("/me", (_req, res) => {
    const s = getStudent(db, res.locals.studentId as string);
    if (!s) notFound("Student");
    res.json({ id: s.id, name: s.name, section: s.section });
  });

  /** Activities with this student's submission status and approved score. */
  r.get("/activities", (_req, res) => {
    const mine = new Map(listForStudent(db, res.locals.studentId as string).map((s) => [s.activity_id, s]));
    const rows = listActivities(db).map((a) => {
      const sub = mine.get(a.id);
      return {
        id: a.id, title: a.title, component: a.component, term: a.term,
        max_score: a.max_score, formative: a.formative, due_date: a.due_date,
        instructions: a.instructions, competencies: a.competencies, rubric: a.rubric,
        status: sub ? (sub.status === "approved" ? "checked" : "submitted") : "missing",
        score: sub?.status === "approved" ? sub.score : null,
        feedback: sub?.status === "approved" ? sub.feedback : null,
        submitted_at: sub?.submitted_at ?? null,
        kind: sub?.kind ?? null,
      };
    });
    res.json(rows);
  });

  r.post("/submissions", (req, res) => {
    const studentId = res.locals.studentId as string;
    const body = req.body as Record<string, unknown>;
    const activityId = intParam(String(body.activity_id ?? ""), "Activity id");
    if (!getActivity(db, activityId)) notFound("Activity");
    const kind = body.kind;
    let content: string;
    if (kind === "text") {
      content = str(body.text, "Essay text", { required: true, max: 50000 });
    } else if (kind === "image") {
      content = storage.saveImageDataUrl(String(body.image ?? ""), `${studentId}-a${activityId}`);
    } else {
      bad("Kind must be text or image.");
    }
    const id = upsertSubmission(db, { activityId, studentId, kind, content });
    res.status(201).json({ id });
  });

  r.get("/claims", (_req, res) => {
    res.json(listClaimsForStudent(db, res.locals.studentId as string));
  });

  r.post("/claims", (req, res) => {
    const body = req.body as Record<string, unknown>;
    const activityId = intParam(String(body.activity_id ?? ""), "Activity id");
    if (!getActivity(db, activityId)) notFound("Activity");
    const note = str(body.note, "Note", { required: true, max: 2000 });
    const id = createClaim(db, { studentId: res.locals.studentId as string, activityId, note });
    res.status(201).json({ id });
  });

  r.get("/grades", (_req, res) => {
    const s = getStudent(db, res.locals.studentId as string);
    if (!s) notFound("Student");
    res.json(reportForStudent(db, s));
  });

  return r;
}
