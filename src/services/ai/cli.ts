// Runs the teacher's logged-in subscription CLI (claude or codex) as a child
// process. The prompt is passed on stdin. No API keys are involved.
import { spawn } from "node:child_process";
import type { AiBackend } from "../../config.ts";

export interface CliSpec {
  command: string;
  args: string[];
}

/** Command line per backend. Both read the prompt from stdin. */
export function cliSpec(backend: AiBackend, imagePath: string | null): CliSpec {
  if (backend === "codex") {
    const args = ["exec", "--skip-git-repo-check", "--sandbox", "read-only"];
    if (imagePath) args.push("--image", imagePath);
    args.push("-");
    return { command: "codex", args };
  }
  const args = ["-p", "--output-format", "json"];
  if (imagePath) args.push("--allowedTools", "Read");
  return { command: "claude", args };
}

export interface CliResult {
  stdout: string;
  stderr: string;
}

export function runCli(spec: CliSpec, prompt: string, timeoutMs: number): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(spec.command, spec.args, { stdio: ["pipe", "pipe", "pipe"] });
    } catch (err) {
      reject(err);
      return;
    }
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`${spec.command} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const hint =
        err.code === "ENOENT"
          ? `"${spec.command}" is not installed or not on PATH. Install it and log in on this PC.`
          : err.message;
      reject(new Error(hint));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${spec.command} exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(prompt);
  });
}
