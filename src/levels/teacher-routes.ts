// Teacher LEVELS API: class progress, per-student detail, level overrides, content management.
import { Router } from "express";
import type { Config } from "../config.ts";
import type { Db } from "../db/connection.ts";
import { bad, notFound, num, str } from "../lib/http.ts";
import { sectionParam } from "../lib/section.ts";
import { requireTeacher } from "../services/auth.ts";
import { getStudent } from "../features/students/repo.ts";
import type { ContentStore } from "./content.ts";
import { draftQuest } from "./draft.ts";
import { LEVELS, MAX_LEVEL, SKILLS } from "./meta.ts";
import { resetPlacement, setLevel } from "./repo.ts";
import { getSetting, setSetting } from "../db/connection.ts";
import { classOverview, studentDetail } from "./teacher-report.ts";
import { validateQuest } from "./validate.ts";

interface CustomRow {
  id: string;
  level: number;
  kind: string;
  title: string;
  json: string;
  published: number;
  updated_at: string;
}

export function levelsTeacherRoutes(db: Db, store: ContentStore, config: Config): Router {
  const r = Router();
  r.use(requireTeacher);

  r.get("/meta", (_req, res) => res.json({ levels: LEVELS, skills: SKILLS, leaderboard: getSetting(db, "lv_leaderboard", "1") === "1" }));
  r.put("/settings", (req, res) => {
    const body = req.body as { leaderboard?: unknown };
    if (typeof body.leaderboard === "boolean") setSetting(db, "lv_leaderboard", body.leaderboard ? "1" : "0");
    res.json({ ok: true, leaderboard: getSetting(db, "lv_leaderboard", "1") === "1" });
  });
  r.get("/overview", (req, res) => res.json(classOverview(db, store, sectionParam(req.query.section))));

  r.get("/students/:id", (req, res) => {
    const s = getStudent(db, String(req.params.id));
    if (!s) notFound("Student");
    res.json(studentDetail(db, store, { id: s.id, name: s.name, section: s.section }));
  });

  r.put("/students/:id/level", (req, res) => {
    const s = getStudent(db, String(req.params.id));
    if (!s) notFound("Student");
    const level = num((req.body as { level?: unknown }).level, "Level", { min: 1, max: MAX_LEVEL });
    setLevel(db, s.id, Math.round(level));
    res.json({ ok: true });
  });

  r.post("/students/:id/reset-placement", (req, res) => {
    const s = getStudent(db, String(req.params.id));
    if (!s) notFound("Student");
    resetPlacement(db, s.id);
    res.json({ ok: true });
  });

  /** Every quest: built-in (read-only) and custom (editable, published or draft). */
  r.get("/content", (_req, res) => {
    const custom = db.prepare("SELECT id, level, kind, title, published, updated_at FROM lv_quests ORDER BY level, id").all() as unknown as CustomRow[];
    const customIds = new Set(custom.map((c) => c.id));
    const builtIn = store.all().filter((q) => !q.custom && !customIds.has(q.id))
      .map((q) => ({ id: q.id, level: q.level, kind: q.kind, title: q.title, items: q.items.length, builtIn: true, published: true }));
    res.json([...builtIn, ...custom.map((c) => ({ ...c, published: Boolean(c.published), builtIn: false }))]);
  });

  r.get("/content/:id", (req, res) => {
    const id = String(req.params.id);
    const row = db.prepare("SELECT * FROM lv_quests WHERE id = ?").get(id) as unknown as CustomRow | undefined;
    if (row) return res.json({ id, builtIn: false, published: Boolean(row.published), json: row.json });
    const q = store.get(id);
    if (!q) notFound("Quest");
    const { custom: _c, ...plain } = q;
    res.json({ id, builtIn: true, published: true, json: JSON.stringify(plain, null, 2) });
  });

  r.post("/content/validate", (req, res) => {
    const { quest, errors } = validateQuest(req.body);
    res.json({ ok: !!quest, errors, summary: quest ? { items: quest.items.length, words: quest.words.length } : null });
  });

  /** Save a custom quest (new or edited). Body: { json: object, published: boolean }. */
  r.put("/content/:id", (req, res) => {
    const id = String(req.params.id).toLowerCase();
    const body = req.body as { json?: unknown; published?: unknown };
    const { quest, errors } = validateQuest(body.json);
    if (!quest) bad(`Quest is not valid: ${errors.join("; ")}`);
    if (quest.id !== id) bad("The id in the JSON must match the saved id.");
    if (quest.kind === "placement") bad("Only the built-in placement test is supported.");
    db.prepare(
      `INSERT INTO lv_quests (id, level, kind, title, json, published, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET level = excluded.level, kind = excluded.kind, title = excluded.title,
         json = excluded.json, published = excluded.published, updated_at = excluded.updated_at`,
    ).run(id, quest.level, quest.kind, quest.title, JSON.stringify(quest, null, 2), body.published ? 1 : 0);
    res.json({ ok: true, id });
  });

  r.delete("/content/:id", (req, res) => {
    const changes = db.prepare("DELETE FROM lv_quests WHERE id = ?").run(String(req.params.id)).changes;
    if (!changes) notFound("Custom quest");
    res.json({ ok: true });
  });

  r.post("/content/draft", async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const level = Math.round(num(body.level, "Level", { min: 1, max: MAX_LEVEL }));
    const skill = str(body.skill, "Skill", { required: true });
    if (!SKILLS[skill]) bad("Unknown skill.");
    const kind = body.kind === "challenge" ? "challenge" : "quest";
    const topic = str(body.topic, "Topic", { max: 200 });
    const id = `l${level}-${kind === "challenge" ? "c" : "q"}-${Date.now().toString(36)}`;
    const result = await draftQuest(config, { level, skill, topic, kind }, id);
    res.json({ id, ok: !!result.quest, errors: result.errors, json: JSON.stringify(result.quest ?? result.raw, null, 2) });
  });

  return r;
}
