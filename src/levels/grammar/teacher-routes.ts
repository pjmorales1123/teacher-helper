// Teacher Grammar Rush API: class topic heatmap, per-student tiers, and the question bank.
import { Router } from "express";
import type { Db } from "../../db/connection.ts";
import type { Banks } from "./bank.ts";
import { topicStats, unlockedTiers } from "./engine.ts";
import { GRAMMAR_TIERS, GRAMMAR_TOPICS } from "./meta.ts";
import { bestByTier, listClassRuns, listRuns } from "./repo.ts";
import type { RunResult } from "./types.ts";

export function grammarStudentSummary(db: Db, studentId: string) {
  const best = bestByTier(db, studentId);
  const runs = listRuns(db, studentId, 50);
  const stats = topicStats(runs.map((r) => JSON.parse(r.results) as RunResult[]));
  return {
    tier: Math.max(...unlockedTiers(best)), runs: runs.length,
    tiers: GRAMMAR_TIERS.map((t) => ({ tier: t.tier, name: t.name, best: best.get(t.tier) ?? null })),
    topics: stats.map((s) => ({ ...s, label: GRAMMAR_TOPICS[s.topic] ?? s.topic })),
    recent: runs.slice(0, 10).map((r) => ({ id: r.id, tier: r.tier, score: r.score, total: r.total, xp: r.xp, hearts: r.hearts, at: r.created_at })),
  };
}

export function grammarTeacherRoutes(db: Db, banks: Banks): Router {
  const r = Router();
  r.get("/overview", (req, res) => {
    const section = typeof req.query.section === "string" && req.query.section ? req.query.section : undefined;
    const runs = listClassRuns(db, section);
    const perStudent = new Map<string, number>();
    for (const run of runs) perStudent.set(run.student_id, (perStudent.get(run.student_id) ?? 0) + 1);
    res.json({
      runs: runs.length, players: perStudent.size,
      topics: topicStats(runs.map((x) => JSON.parse(x.results) as RunResult[])).map((s) => ({ ...s, label: GRAMMAR_TOPICS[s.topic] ?? s.topic })),
      tiers: GRAMMAR_TIERS.map((t) => ({ tier: t.tier, name: t.name, runs: runs.filter((x) => x.tier === t.tier).length })),
    });
  });
  r.get("/bank", (_req, res) => res.json([...banks.values()].sort((a, b) => a.tier - b.tier).map((b) => ({
    tier: b.tier, name: b.name, topics: GRAMMAR_TIERS[b.tier - 1]?.topics.map((t) => ({ id: t, label: GRAMMAR_TOPICS[t] })) ?? [],
    items: b.items.map((it) => ({ ...it, topicLabel: GRAMMAR_TOPICS[it.topic] ?? it.topic })),
  }))));
  r.get("/students/:id", (req, res) => res.json(grammarStudentSummary(db, String(req.params.id))));
  return r;
}
