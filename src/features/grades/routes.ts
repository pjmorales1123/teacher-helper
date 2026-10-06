// Grade reports and grading presets (teacher).
import { Router } from "express";
import type { Db } from "../../db/connection.ts";
import { getSetting, setSetting } from "../../db/connection.ts";
import { bad, notFound } from "../../lib/http.ts";
import {
  DEFAULT_TRANSMUTATION_PRESET,
  DEFAULT_WEIGHT_PRESET,
  TRANSMUTATION_PRESETS,
  WEIGHT_PRESETS,
} from "../../lib/presets.ts";
import { requireTeacher } from "../../services/auth.ts";
import { getStudent, listStudents } from "../students/repo.ts";
import { reportsToCsv } from "./csv.ts";
import { reportForStudent } from "./report.ts";

export function gradeRoutes(db: Db): Router {
  const r = Router();
  r.use(requireTeacher);

  r.get("/settings", (_req, res) => {
    res.json({
      weight_preset: getSetting(db, "weight_preset", DEFAULT_WEIGHT_PRESET),
      transmutation_preset: getSetting(db, "transmutation_preset", DEFAULT_TRANSMUTATION_PRESET),
      weight_presets: WEIGHT_PRESETS,
      transmutation_presets: TRANSMUTATION_PRESETS,
    });
  });

  r.put("/settings", (req, res) => {
    const body = req.body as Record<string, unknown>;
    const w = String(body.weight_preset ?? "");
    const t = String(body.transmutation_preset ?? "");
    if (!WEIGHT_PRESETS.some((p) => p.id === w)) bad("Unknown weight preset.");
    if (!TRANSMUTATION_PRESETS.some((p) => p.id === t)) bad("Unknown transmutation preset.");
    setSetting(db, "weight_preset", w);
    setSetting(db, "transmutation_preset", t);
    res.json({ ok: true });
  });

  r.get("/", (_req, res) => {
    res.json(listStudents(db).map((s) => reportForStudent(db, s)));
  });

  r.get("/export.csv", (_req, res) => {
    const csv = reportsToCsv(listStudents(db).map((s) => reportForStudent(db, s)));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="grades-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send("\uFEFF" + csv);
  });

  r.get("/:studentId", (req, res) => {
    const s = getStudent(db, req.params.studentId);
    if (!s) notFound("Student");
    res.json(reportForStudent(db, s));
  });

  return r;
}
