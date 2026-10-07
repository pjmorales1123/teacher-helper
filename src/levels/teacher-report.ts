// Teacher-side reporting: class overview rows and per-student detail.
import type { Db } from "../db/connection.ts";
import type { ContentStore } from "./content.ts";
import { todayLocal } from "./dates.ts";
import { skillStats, weakestSkills, type SkillStat } from "./engine.ts";
import { SKILLS, levelMeta } from "./meta.ts";
import { currentStreak } from "./progression.ts";
import { listAttempts, listBadges, listProgressRows } from "./repo.ts";
import { viewFor } from "./view.ts";
import type { ItemResult } from "./types.ts";
import { listWords } from "./words.ts";
import { grammarStudentSummary } from "./grammar/teacher-routes.ts";

function resultsOf(db: Db, studentId: string, limit = 200): ItemResult[][] {
  return listAttempts(db, studentId, limit).map((a) => JSON.parse(a.results) as ItemResult[]);
}

export function classOverview(db: Db, store: ContentStore, section?: string) {
  const today = todayLocal();
  const allResults: ItemResult[][] = [];
  const levelCounts: Record<number, number> = {};
  const rows = listProgressRows(db, section).map((p) => {
    const view = viewFor(db, store, p.student_id, p.level);
    const results = resultsOf(db, p.student_id);
    allResults.push(...results);
    levelCounts[p.level] = (levelCounts[p.level] ?? 0) + 1;
    const weak = weakestSkills(skillStats(results), 1, 3)[0];
    return {
      id: p.student_id, name: p.name, section: p.section, level: p.level, levelName: levelMeta(p.level).name,
      band: levelMeta(p.level).band, placed: Boolean(p.placed), xp: p.xp, streak: currentStreak(p, today),
      lastActive: p.last_active, questsPassed: view.quests.filter((q) => q.passed).length, questsTotal: view.quests.length,
      challengePassed: Boolean(view.challenge?.passed), attempts: results.length,
      mastered: view.skills.filter((s) => s.mastered).length, skillsTotal: view.skills.length,
      weakest: weak ? { skill: weak.skill, label: SKILLS[weak.skill]?.label ?? weak.skill, accuracy: weak.accuracy } : null,
    };
  });
  const skills: SkillStat[] = skillStats(allResults).map((s) => ({ ...s }));
  return {
    students: rows,
    levels: Object.entries(levelCounts).map(([level, count]) => ({ level: Number(level), name: levelMeta(Number(level)).name, count })),
    skills: skills.map((s) => ({ ...s, label: SKILLS[s.skill]?.label ?? s.skill, strand: SKILLS[s.skill]?.strand ?? "" })),
    activeThisWeek: rows.filter((r) => r.lastActive && r.lastActive >= shiftDays(today, -7)).length,
  };
}

function shiftDays(day: string, n: number): string {
  const d = new Date(day);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function studentDetail(db: Db, store: ContentStore, student: { id: string; name: string; section: string }) {
  const today = todayLocal();
  const p = listProgressRows(db).find((r) => r.student_id === student.id);
  const level = p?.level ?? 1;
  const attempts = listAttempts(db, student.id, 100);
  const titles = new Map(store.all().map((q) => [q.id, q.title]));
  return {
    student, level, levelName: levelMeta(level).name, band: levelMeta(level).band, placed: Boolean(p?.placed),
    xp: p?.xp ?? 0, streak: p ? currentStreak(p, today) : 0, lastActive: p?.last_active ?? null, reviews: p?.reviews ?? 0,
    map: viewFor(db, store, student.id, level),
    skills: skillStats(attempts.map((a) => JSON.parse(a.results) as ItemResult[]))
      .map((s) => ({ ...s, label: SKILLS[s.skill]?.label ?? s.skill, strand: SKILLS[s.skill]?.strand ?? "" })),
    attempts: attempts.slice(0, 40).map((a) => ({
      id: a.id, questId: a.quest_id, title: titles.get(a.quest_id) ?? a.quest_id, kind: a.kind, level: a.level,
      score: a.score, total: a.total, passed: Boolean(a.passed), at: a.created_at,
    })),
    words: listWords(db, student.id),
    badges: listBadges(db, student.id),
    grammar: grammarStudentSummary(db, student.id),
  };
}
