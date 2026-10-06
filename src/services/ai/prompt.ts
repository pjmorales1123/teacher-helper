// Builds the pre-score prompt. The AI only drafts; the teacher approves.
import type { Activity, Submission } from "../../lib/types.ts";

export interface PrescoreDraft {
  score: number;
  feedback: string;
}

export function buildPrescorePrompt(
  activity: Activity,
  submission: Submission,
  imagePath: string | null,
): string {
  const work =
    submission.kind === "text"
      ? `STUDENT WORK (essay text):\n${submission.content}`
      : `STUDENT WORK: a photo of handwritten/printed work is at this path. Read and transcribe it first:\n${imagePath}`;
  return [
    "You are helping a Filipino public-school teacher draft a score for one student's submission.",
    "The teacher will review and approve or change your draft. Be fair, consistent and specific.",
    "",
    `ACTIVITY: ${activity.title} (${activity.component}, Term ${activity.term})`,
    `MAXIMUM SCORE: ${activity.max_score}`,
    section("COMPETENCIES", activity.competencies),
    section("INSTRUCTIONS GIVEN TO STUDENTS", activity.instructions),
    section("RUBRIC", activity.rubric),
    "",
    work,
    "",
    "Respond with ONLY a JSON object on a single line, no markdown fences, in this shape:",
    `{"score": <number from 0 to ${activity.max_score}>, "feedback": "<2-4 sentences for the student, mention effort shown and one improvement>"}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function section(title: string, body: string): string | null {
  return body.trim() ? `${title}:\n${body.trim()}` : null;
}

/** Pull a {score, feedback} object out of free-form CLI output. */
export function parseDraft(text: string, maxScore: number): PrescoreDraft {
  const candidates: string[] = [];
  try {
    const outer = JSON.parse(text) as Record<string, unknown>;
    if (typeof outer.result === "string") candidates.push(outer.result);
    if (typeof outer.score === "number") candidates.push(text);
  } catch {
    /* not a JSON envelope */
  }
  candidates.push(text);
  for (const candidate of candidates) {
    const match = candidate.match(/\{[\s\S]*?"score"[\s\S]*?\}/);
    if (!match) continue;
    try {
      const obj = JSON.parse(match[0]) as { score?: unknown; feedback?: unknown };
      const score = Number(obj.score);
      if (!Number.isFinite(score)) continue;
      return {
        score: Math.min(maxScore, Math.max(0, score)),
        feedback: typeof obj.feedback === "string" ? obj.feedback.trim() : "",
      };
    } catch {
      /* try next */
    }
  }
  throw new Error("The AI reply did not contain a {score, feedback} JSON object.");
}
