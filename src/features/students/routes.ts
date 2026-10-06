// Teacher-only student roster management.
import { Router } from "express";
import type { Db } from "../../db/connection.ts";
import { bad, notFound, str } from "../../lib/http.ts";
import { requireTeacher } from "../../services/auth.ts";
import { deleteStudent, listStudents, upsertStudent } from "./repo.ts";

export function studentRoutes(db: Db): Router {
  const r = Router();
  r.use(requireTeacher);

  r.get("/", (_req, res) => {
    res.json(listStudents(db));
  });

  r.post("/", (req, res) => {
    const body = req.body as Record<string, unknown>;
    const id = str(body.id, "Student ID", { required: true, max: 40 });
    const name = str(body.name, "Name", { required: true, max: 120 });
    const section = str(body.section, "Section", { max: 60 });
    const pin = str(body.pin, "PIN", { max: 12 });
    if (!/^[A-Za-z0-9-]+$/.test(id)) bad("Student ID may only contain letters, numbers and dashes.");
    if (pin && !/^\d{4,12}$/.test(pin)) bad("PIN must be 4 to 12 digits.");
    upsertStudent(db, { id, name, section, pin });
    res.status(201).json({ ok: true });
  });

  /** Bulk import: lines of "id, name, section, pin". */
  r.post("/import", (req, res) => {
    const text = str((req.body as Record<string, unknown>).text, "Import text", { required: true });
    let count = 0;
    for (const line of text.split(/\r?\n/)) {
      const [id = "", name = "", section = "", pin = ""] = line.split(",").map((c) => c.trim());
      if (!id || !name || !/^[A-Za-z0-9-]+$/.test(id)) continue;
      upsertStudent(db, { id, name, section, pin: /^\d{4,12}$/.test(pin) ? pin : "" });
      count++;
    }
    res.json({ imported: count });
  });

  r.delete("/:id", (req, res) => {
    if (!deleteStudent(db, req.params.id)) notFound("Student");
    res.json({ ok: true });
  });

  return r;
}
