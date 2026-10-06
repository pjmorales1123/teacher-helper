import { Router } from "express";
import type { Db } from "../../db/connection.ts";
import { requireTeacher } from "../../services/auth.ts";
import { buildOverview } from "./repo.ts";

export function overviewRoutes(db: Db): Router {
  const r = Router();
  r.use(requireTeacher);
  r.get("/", (_req, res) => {
    res.json(buildOverview(db));
  });
  return r;
}
