// Activities: posted work with competencies, instructions and rubric.
// Teachers manage them; students read them (through the student routes).
import { Router } from "express";
import type { Db } from "../../db/connection.ts";
import { bad, intParam, notFound, num, str } from "../../lib/http.ts";
import { isComponent, isTerm } from "../../lib/types.ts";
import { requireTeacher } from "../../services/auth.ts";
import { createActivity, deleteActivity, getActivity, listActivities, updateActivity, type ActivityInput } from "./repo.ts";

export function parseActivity(body: Record<string, unknown>): ActivityInput {
  const component = body.component;
  const term = Number(body.term);
  if (!isComponent(component)) bad("Component must be WW, PT or EX.");
  if (!isTerm(term)) bad("Term must be 1, 2 or 3.");
  const due = str(body.due_date, "Due date", { max: 10 });
  return {
    title: str(body.title, "Title", { required: true, max: 160 }),
    component,
    term,
    max_score: num(body.max_score, "Maximum score", { min: 0.5, max: 1000 }),
    formative: body.formative ? 1 : 0,
    competencies: str(body.competencies, "Competencies", { max: 5000 }),
    instructions: str(body.instructions, "Instructions", { max: 10000 }),
    rubric: str(body.rubric, "Rubric", { max: 10000 }),
    due_date: due || null,
  };
}

export function activityRoutes(db: Db): Router {
  const r = Router();
  r.use(requireTeacher);

  r.get("/", (_req, res) => {
    res.json(listActivities(db));
  });

  r.get("/:id", (req, res) => {
    const a = getActivity(db, intParam(req.params.id, "Activity id"));
    if (!a) notFound("Activity");
    res.json(a);
  });

  r.post("/", (req, res) => {
    const id = createActivity(db, parseActivity(req.body as Record<string, unknown>));
    res.status(201).json({ id });
  });

  r.put("/:id", (req, res) => {
    const id = intParam(req.params.id, "Activity id");
    if (!updateActivity(db, id, parseActivity(req.body as Record<string, unknown>))) notFound("Activity");
    res.json({ ok: true });
  });

  r.delete("/:id", (req, res) => {
    if (!deleteActivity(db, intParam(req.params.id, "Activity id"))) notFound("Activity");
    res.json({ ok: true });
  });

  return r;
}
