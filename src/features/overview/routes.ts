import { Router } from "express";
import type { Db } from "../../db/connection.ts";
import { sectionParam } from "../../lib/section.ts";
import { requireTeacher } from "../../services/auth.ts";
import { buildOverview } from "./repo.ts";

export function overviewRoutes(db: Db): Router {
  const r = Router();
  r.use(requireTeacher);
  r.get("/", (req, res) => {
    res.json(buildOverview(db, sectionParam(req.query.section)));
  });
  return r;
}
