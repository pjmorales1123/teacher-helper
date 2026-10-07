// Student LEVELS API: home map, placement, word review. Quest play is in student-play.ts.
import { Router } from "express";
import type { Db } from "../db/connection.ts";
import { bad } from "../lib/http.ts";
import { requireStudent } from "../services/auth.ts";
import { BADGES } from "./badges.ts";
import type { ContentStore } from "./content.ts";
import { todayLocal } from "./dates.ts";
import { checkItem, toPublicItem } from "./engine.ts";
import { DAILY_GOAL, LEVELS, SKILLS, levelMeta } from "./meta.ts";
import { getSetting } from "../db/connection.ts";
import { getStudent } from "../features/students/repo.ts";
import { weeklyLeaderboard, xpOnDay } from "./xp-log.ts";
import { PLACEMENT_ROUND_SIZE, currentStreak, placementStep } from "./progression.ts";
import { getProgress, listBadges, updateProgress } from "./repo.ts";
import { viewFor } from "./view.ts";
import { finishReview } from "./service.ts";
import { studentPlayRoutes } from "./student-play.ts";
import type { Banks } from "./grammar/bank.ts";
import { grammarStudentRoutes } from "./grammar/student-routes.ts";
import { buildReview, countDue, dueWords, listWords } from "./words.ts";

const pendingReviews = new Map<string, Map<number, number>>(); // studentId -> wordId -> correct choice

export function levelsStudentRoutes(db: Db, store: ContentStore, banks: Banks): Router {
  const r = Router();
  r.use(requireStudent);
  const sid = (res: { locals: Record<string, unknown> }) => res.locals.studentId as string;

  r.get("/home", (_req, res) => {
    const studentId = sid(res);
    const p = getProgress(db, studentId);
    const today = todayLocal();
    const held = new Set(listBadges(db, studentId).map((b) => b.badge));
    const student = getStudent(db, studentId);
    const showBoard = getSetting(db, "lv_leaderboard", "1") === "1" && Boolean(student?.section);
    const board = showBoard ? weeklyLeaderboard(db, student!.section, today) : [];
    const streak = currentStreak(p, today);
    res.json({
      placed: Boolean(p.placed), level: p.level, levelName: levelMeta(p.level).name, xp: p.xp,
      streak, streakAtRisk: streak > 0 && p.last_active !== today,
      todayXp: xpOnDay(db, studentId, today), dailyGoal: DAILY_GOAL,
      leaderboard: board.slice(0, 10).map((r) => ({ ...r, me: r.id === studentId })),
      myRank: board.find((r) => r.id === studentId)?.rank ?? null, boardSize: board.length,
      dueWords: countDue(db, studentId, today), wordCount: listWords(db, studentId).length,
      levels: LEVELS.map((l) => ({ level: l.level, name: l.name, reached: l.level <= p.level })),
      map: viewFor(db, store, studentId, p.level),
      badges: BADGES.map((b) => ({ ...b, earned: held.has(b.id) })),
      skills: SKILLS,
    });
  });

  /** Current placement round: 3 items for the round's level. */
  r.get("/placement", (_req, res) => {
    const p = getProgress(db, sid(res));
    const test = store.placement()[0];
    if (!test) bad("No placement test is installed.");
    const items = test.items.filter((i) => i.level === p.placement_round).slice(0, PLACEMENT_ROUND_SIZE);
    res.json({ round: p.placement_round, levelName: levelMeta(p.placement_round).name, items: items.map(toPublicItem) });
  });

  r.post("/placement", (req, res) => {
    const studentId = sid(res);
    const p = getProgress(db, studentId);
    const test = store.placement()[0];
    if (!test) bad("No placement test is installed.");
    const answers = (req.body as { answers?: Record<string, unknown> }).answers ?? {};
    const items = test.items.filter((i) => i.level === p.placement_round).slice(0, PLACEMENT_ROUND_SIZE);
    const correct = items.filter((i) => checkItem(i, answers[i.id])).length;
    const step = placementStep(p.placement_round, correct);
    if (step.placed !== null) {
      updateProgress(db, studentId, { level: step.placed, placed: 1, placement_round: 1, last_active: todayLocal() });
      res.json({ done: true, correct, level: step.placed, levelName: levelMeta(step.placed).name });
      return;
    }
    updateProgress(db, studentId, { placement_round: step.nextRound });
    res.json({ done: false, correct, nextRound: step.nextRound, levelName: levelMeta(step.nextRound).name });
  });

  r.post("/placement/skip", (_req, res) => {
    updateProgress(db, sid(res), { level: 1, placed: 1, placement_round: 1 });
    res.json({ ok: true });
  });

  r.get("/words", (_req, res) => res.json(listWords(db, sid(res))));

  r.get("/review", (_req, res) => {
    const studentId = sid(res);
    const due = dueWords(db, studentId, todayLocal());
    const pool = store.all().flatMap((q) => q.words);
    const { items, answers } = buildReview(due, pool);
    pendingReviews.set(studentId, answers);
    res.json({ items });
  });

  r.post("/review", (req, res) => {
    const studentId = sid(res);
    const answers = pendingReviews.get(studentId);
    if (!answers || !answers.size) bad("Start a review first.");
    pendingReviews.delete(studentId);
    const given = (req.body as { answers?: Record<string, unknown> }).answers ?? {};
    res.json(finishReview(db, studentId, answers, given));
  });

  r.use("/grammar", grammarStudentRoutes(db, banks));
  r.use(studentPlayRoutes(db, store));
  return r;
}
