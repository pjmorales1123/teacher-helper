// Builds grade reports from approved scores and approved effort claims.
import type { Db } from "../../db/connection.ts";
import { getSetting } from "../../db/connection.ts";
import { computeGrade, type GradeResult, type ScoredItem } from "../../lib/grade-engine.ts";
import {
  DEFAULT_TRANSMUTATION_PRESET,
  DEFAULT_WEIGHT_PRESET,
  findTransmutationPreset,
  findWeightPreset,
} from "../../lib/presets.ts";
import type { Component, Term } from "../../lib/types.ts";
import { TERMS } from "../../lib/types.ts";
import { approvedExtraPoints } from "../effort-claims/repo.ts";

export interface TermGrade {
  term: Term;
  grade: GradeResult;
}

export interface StudentReport {
  studentId: string;
  name: string;
  section: string;
  terms: TermGrade[];
  finalGrade: number | null; // average of complete terms' transmuted grades
}

function approvedItems(db: Db, studentId: string): (ScoredItem & { term: number })[] {
  return db
    .prepare(
      `SELECT a.term, a.component, s.score, a.max_score AS maxScore
       FROM submissions s JOIN activities a ON a.id = s.activity_id
       WHERE s.student_id = ? AND s.status = 'approved' AND a.formative = 0`,
    )
    .all(studentId) as unknown as (ScoredItem & { term: number })[];
}

export function reportForStudent(db: Db, student: { id: string; name: string; section: string }): StudentReport {
  const weights = findWeightPreset(getSetting(db, "weight_preset", DEFAULT_WEIGHT_PRESET));
  const transmutation = findTransmutationPreset(
    getSetting(db, "transmutation_preset", DEFAULT_TRANSMUTATION_PRESET),
  );
  const items = approvedItems(db, student.id);
  const extras = approvedExtraPoints(db, student.id);

  const terms = TERMS.map((term): TermGrade => {
    const extra: Partial<Record<Component, number>> = {};
    for (const e of extras) if (e.term === term) extra[e.component as Component] = e.points;
    const own = items.filter((i) => i.term === term);
    return { term, grade: computeGrade(own, weights, transmutation, extra) };
  });

  const complete = terms.filter((t) => t.grade.complete);
  const finalGrade = complete.length
    ? Math.round(complete.reduce((s, t) => s + t.grade.transmutedGrade, 0) / complete.length)
    : null;
  return { studentId: student.id, name: student.name, section: student.section, terms, finalGrade };
}
