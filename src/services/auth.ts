// Cookie sessions kept in memory. One teacher (password from .env) and
// students who sign in with their ID and PIN.
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export interface Session {
  role: "teacher" | "student";
  studentId: string | null;
}

const COOKIE = "th_session";
const sessions = new Map<string, Session>();

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function readCookie(req: Request): string | null {
  const header = req.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function currentSession(req: Request): Session | null {
  const token = readCookie(req);
  return token ? (sessions.get(token) ?? null) : null;
}

export function startSession(res: Response, session: Session): void {
  const token = randomBytes(24).toString("hex");
  sessions.set(token, session);
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 12}`,
  );
}

export function endSession(req: Request, res: Response): void {
  const token = readCookie(req);
  if (token) sessions.delete(token);
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
}

export function requireTeacher(req: Request, res: Response, next: NextFunction): void {
  if (currentSession(req)?.role === "teacher") return next();
  res.status(401).json({ error: "Teacher sign-in required." });
}

export function requireStudent(req: Request, res: Response, next: NextFunction): void {
  const s = currentSession(req);
  if (s?.role === "student" && s.studentId) {
    res.locals.studentId = s.studentId;
    return next();
  }
  res.status(401).json({ error: "Student sign-in required." });
}
