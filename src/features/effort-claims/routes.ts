// Effort claims: a student asks for extra points on an activity; the teacher
// decides. Approved points are added to that activity's component raw score.
import { Router } from "express";
import type { Db } from "../../db/connection.ts";
import { bad, intParam, notFound, num, str } from "../../lib/http.ts";
import { sectionParam } from "../../lib/section.ts";
import { requireTeacher } from "../../services/auth.ts";
import { decideClaim, listClaims } from "./repo.ts";

export function effortClaimRoutes(db: Db): Router {
  const r = Router();
  r.use(requireTeacher);

  r.get("/", (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    res.json(listClaims(db, { status, section: sectionParam(req.query.section) }));
  });

  r.post("/:id/decide", (req, res) => {
    const id = intParam(req.params.id, "Claim id");
    const body = req.body as Record<string, unknown>;
    const status = body.status;
    if (status !== "approved" && status !== "rejected") bad("Status must be approved or rejected.");
    const points = status === "approved" ? num(body.points, "Points", { min: 0, max: 1000 }) : 0;
    const note = str(body.teacher_note, "Note", { max: 1000 });
    if (!decideClaim(db, id, status, points, note)) notFound("Claim");
    res.json({ ok: true });
  });

  return r;
}
