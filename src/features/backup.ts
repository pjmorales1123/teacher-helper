// Lets the teacher download the SQLite database file as a backup.
// Uploaded images live in DATA_DIR/uploads and are backed up by copying that folder.
import { Router } from "express";
import type { Db } from "../db/connection.ts";
import { requireTeacher } from "../services/auth.ts";

export function backupRoutes(db: Db, dbPath: string): Router {
  const r = Router();
  r.use(requireTeacher);
  r.get("/database", (_req, res) => {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    const stamp = new Date().toISOString().slice(0, 10);
    res.download(dbPath, `teacher-helper-${stamp}.db`);
  });
  return r;
}
