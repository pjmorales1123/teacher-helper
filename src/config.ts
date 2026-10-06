// Loads .env (if present) into process.env without overriding existing values,
// then exposes a typed, validated config object. No secrets live in code.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type AiBackend = "claude" | "codex";

export interface Config {
  port: number;
  host: string;
  dataDir: string;
  uploadsDir: string;
  dbPath: string;
  aiBackend: AiBackend;
  aiTimeoutMs: number;
  teacherPassword: string;
  teacherPasswordIsDefault: boolean;
}

function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function intFrom(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(cwd = process.cwd()): Config {
  loadDotEnv(resolve(cwd, ".env"));
  const env = process.env;
  const backend = (env.AI_BACKEND ?? "claude").toLowerCase();
  const aiBackend: AiBackend = backend === "codex" ? "codex" : "claude";
  const dataDir = resolve(cwd, env.DATA_DIR ?? "./data");
  const teacherPassword = env.TEACHER_PASSWORD?.trim() || "change-me";
  return {
    port: intFrom(env.PORT, 3000),
    host: env.HOST?.trim() || "0.0.0.0",
    dataDir,
    uploadsDir: resolve(dataDir, "uploads"),
    dbPath: resolve(dataDir, "teacher-helper.db"),
    aiBackend,
    aiTimeoutMs: intFrom(env.AI_TIMEOUT_SECONDS, 120) * 1000,
    teacherPassword,
    teacherPasswordIsDefault: teacherPassword === "change-me",
  };
}
