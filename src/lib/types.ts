// Shared domain types used across features.
export type Component = "WW" | "PT" | "EX";
export type Term = 1 | 2 | 3;
export type SubmissionStatus = "submitted" | "prescored" | "approved";
export type ClaimStatus = "pending" | "approved" | "rejected";

export interface Student {
  id: string;
  name: string;
  section: string;
  pin: string;
  created_at: string;
}

export interface Activity {
  id: number;
  title: string;
  component: Component;
  term: Term;
  max_score: number;
  formative: number;
  competencies: string;
  instructions: string;
  rubric: string;
  section: string; // '' means every section
  due_date: string | null;
  created_at: string;
}

export interface Submission {
  id: number;
  activity_id: number;
  student_id: string;
  kind: "text" | "image";
  content: string;
  status: SubmissionStatus;
  draft_score: number | null;
  draft_feedback: string | null;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  approved_at: string | null;
}

export interface EffortClaim {
  id: number;
  student_id: string;
  activity_id: number;
  note: string;
  status: ClaimStatus;
  points: number;
  teacher_note: string;
  created_at: string;
  decided_at: string | null;
}

export const COMPONENTS: readonly Component[] = ["WW", "PT", "EX"];
export const TERMS: readonly Term[] = [1, 2, 3];

export function isComponent(v: unknown): v is Component {
  return typeof v === "string" && (COMPONENTS as readonly string[]).includes(v);
}

export function isTerm(v: unknown): v is Term {
  return v === 1 || v === 2 || v === 3;
}
