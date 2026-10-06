// Public entry point for AI pre-scoring. Picks the backend from config.
import type { Config } from "../../config.ts";
import type { Activity, Submission } from "../../lib/types.ts";
import { cliSpec, runCli } from "./cli.ts";
import { buildPrescorePrompt, parseDraft, type PrescoreDraft } from "./prompt.ts";

export interface AiAdapter {
  backend: string;
  prescore(activity: Activity, submission: Submission, imagePath: string | null): Promise<PrescoreDraft>;
}

export function createAiAdapter(config: Config): AiAdapter {
  return {
    backend: config.aiBackend,
    async prescore(activity, submission, imagePath) {
      const prompt = buildPrescorePrompt(activity, submission, imagePath);
      const spec = cliSpec(config.aiBackend, imagePath);
      const { stdout } = await runCli(spec, prompt, config.aiTimeoutMs);
      return parseDraft(stdout, activity.max_score);
    },
  };
}
