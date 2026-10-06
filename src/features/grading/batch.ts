// Pre-score every unscored submission of one activity, one after another
// (the CLI is a single logged-in session, so we do not run it in parallel).
import type { Db } from "../../db/connection.ts";
import type { AiAdapter } from "../../services/ai/adapter.ts";
import type { Storage } from "../../services/storage.ts";
import { getActivity } from "../activities/repo.ts";
import { listSubmissions, saveDraft } from "../submissions/repo.ts";

export interface BatchResult {
  done: number;
  failed: { student: string; error: string }[];
  skipped: number;
}

export async function prescoreActivity(
  db: Db,
  ai: AiAdapter,
  storage: Storage,
  activityId: number,
): Promise<BatchResult | null> {
  const activity = getActivity(db, activityId);
  if (!activity) return null;
  const all = listSubmissions(db, { activityId });
  const pending = all.filter((s) => s.status === "submitted");
  const result: BatchResult = { done: 0, failed: [], skipped: all.length - pending.length };
  for (const s of pending) {
    try {
      const imagePath = s.kind === "image" ? storage.pathFor(s.content) : null;
      const draft = await ai.prescore(activity, s, imagePath);
      saveDraft(db, s.id, draft.score, draft.feedback);
      result.done++;
    } catch (err) {
      result.failed.push({ student: s.student_name, error: (err as Error).message });
    }
  }
  return result;
}
