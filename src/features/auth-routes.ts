// Sign-in endpoints for the teacher (password) and students (ID + PIN).
import { Router } from "express";
import type { Config } from "../config.ts";
import type { Db } from "../db/connection.ts";
import { str } from "../lib/http.ts";
import { currentSession, endSession, safeEqual, startSession } from "../services/auth.ts";
import { getStudent } from "./students/repo.ts";

export function authRoutes(db: Db, config: Config): Router {
  const r = Router();

  r.get("/session", (req, res) => {
    const s = currentSession(req);
    res.json(s ? { role: s.role, studentId: s.studentId } : { role: null });
  });

  r.post("/teacher", (req, res) => {
    const password = str((req.body as Record<string, unknown>).password, "Password", { required: true });
    if (!safeEqual(password, config.teacherPassword)) {
      res.status(401).json({ error: "Wrong password." });
      return;
    }
    startSession(res, { role: "teacher", studentId: null });
    res.json({ role: "teacher" });
  });

  r.post("/student", (req, res) => {
    const body = req.body as Record<string, unknown>;
    const id = str(body.id, "Student ID", { required: true });
    const pin = str(body.pin, "PIN", { required: true });
    const student = getStudent(db, id);
    if (!student || !safeEqual(pin, student.pin)) {
      res.status(401).json({ error: "Student ID or PIN is wrong." });
      return;
    }
    startSession(res, { role: "student", studentId: student.id });
    res.json({ role: "student", name: student.name });
  });

  r.post("/logout", (req, res) => {
    endSession(req, res);
    res.json({ ok: true });
  });

  return r;
}
