// Assembles the Express app: JSON API under /api, static UI from src/web.
import express, { type NextFunction, type Request, type Response } from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Config } from "./config.ts";
import type { Db } from "./db/connection.ts";
import { activityRoutes } from "./features/activities/routes.ts";
import { authRoutes } from "./features/auth-routes.ts";
import { backupRoutes } from "./features/backup.ts";
import { effortClaimRoutes } from "./features/effort-claims/routes.ts";
import { gradeRoutes } from "./features/grades/routes.ts";
import { gradingRoutes } from "./features/grading/routes.ts";
import { overviewRoutes } from "./features/overview/routes.ts";
import { studentRoutes } from "./features/students/routes.ts";
import { studentApiRoutes } from "./features/submissions/student-routes.ts";
import { HttpError } from "./lib/http.ts";
import type { AiAdapter } from "./services/ai/adapter.ts";
import type { Storage } from "./services/storage.ts";
import { createContentStore, loadBuiltIn } from "./levels/content.ts";
import { levelsStudentRoutes } from "./levels/student-routes.ts";
import { levelsTeacherRoutes } from "./levels/teacher-routes.ts";
import { loadBanks } from "./levels/grammar/bank.ts";

export interface AppDeps {
  config: Config;
  db: Db;
  ai: AiAdapter;
  storage: Storage;
}

const WEB_DIR = join(dirname(fileURLToPath(import.meta.url)), "web");

export function createApp({ config, db, ai, storage }: AppDeps): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "12mb" }));
  const content = createContentStore(db, loadBuiltIn());
  const banks = loadBanks();

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, aiBackend: config.aiBackend, passwordIsDefault: config.teacherPasswordIsDefault });
  });
  app.use("/api/auth", authRoutes(db, config));
  app.use("/api/students", studentRoutes(db));
  app.use("/api/activities", activityRoutes(db));
  app.use("/api/grading", gradingRoutes(db, ai, storage));
  app.use("/api/claims", effortClaimRoutes(db));
  app.use("/api/grades", gradeRoutes(db));
  app.use("/api/overview", overviewRoutes(db));
  app.use("/api/backup", backupRoutes(db, config.dbPath));
  app.use("/api/levels", levelsTeacherRoutes(db, content, config, banks));
  app.use("/api/student/levels", levelsStudentRoutes(db, content, banks));
  app.use("/api/student", studentApiRoutes(db, storage));
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Unknown API route." });
  });

  app.use(express.static(WEB_DIR, { extensions: ["html"] }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const e = err as { type?: string; status?: number; message?: string };
    if (e.type === "entity.too.large") {
      res.status(413).json({ error: "Upload is too large (max 12 MB)." });
      return;
    }
    if (e.type === "entity.parse.failed") {
      res.status(400).json({ error: "Request body is not valid JSON." });
      return;
    }
    console.error(err);
    res.status(500).json({ error: e.message || "Something went wrong." });
  });

  return app;
}
