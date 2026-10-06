// Everything about one student on one page: grades, each activity with
// status and score, and effort claims. Used by the printable report.
import type { Db } from "../../db/connection.ts";
import type { Student } from "../../lib/types.ts";
import { listActivities } from "../activities/repo.ts";
import { listClaimsForStudent, type ClaimRow } from "../effort-claims/repo.ts";
import { listForStudent } from "../submissions/repo.ts";
import { reportForStudent, type StudentReport } from "./report.ts";

export interface ActivityLine {
  id: number;
  title: string;
  component: string;
  term: number;
  max_score: number;
  formative: number;
  due_date: string | null;
  status: "missing" | "submitted" | "checked";
  score: number | null;
  feedback: string | null;
  submitted_at: string | null;
}

export interface FullStudentReport {
  grades: StudentReport;
  activities: ActivityLine[];
  claims: ClaimRow[];
  generated_at: string;
}

export function activityLines(db: Db, student: Student): ActivityLine[] {
  const mine = new Map(listForStudent(db, student.id).map((s) => [s.activity_id, s]));
  return listActivities(db, student.section || undefined).map((a) => {
    const sub = mine.get(a.id);
    return {
      id: a.id, title: a.title, component: a.component, term: a.term, max_score: a.max_score,
      formative: a.formative, due_date: a.due_date,
      status: sub ? (sub.status === "approved" ? "checked" : "submitted") : "missing",
      score: sub?.status === "approved" ? sub.score : null,
      feedback: sub?.status === "approved" ? sub.feedback : null,
      submitted_at: sub?.submitted_at ?? null,
    };
  });
}

export function studentReport(db: Db, student: Student): FullStudentReport {
  return {
    grades: reportForStudent(db, student),
    activities: activityLines(db, student),
    claims: listClaimsForStudent(db, student.id),
    generated_at: new Date().toISOString(),
  };
}
