import { resolve } from 'node:path';

/** Runtime settings, read once from the environment (.env via --env-file). */
export interface Config {
  host: string;
  port: number;
  dataDir: string;
  aiBackend: 'claude' | 'codex';
  aiModel: string;
  aiTimeoutMs: number;
  maxUploadBytes: number;
  webDist: string;
  /** Claude model for spoken requests (the voice agent's worker): fast and cheap. */
  voiceModel: string;
  /** Gemini Live (the voice that talks). Key from .env only; empty disables voice. */
  geminiApiKey: string;
  geminiLiveModel: string;
  /** Override of the Gemini endpoint, for tests against a local mock. */
  geminiBaseUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const backend = env.AI_BACKEND === 'codex' ? 'codex' : 'claude';
  return {
    host: env.HOST ?? '127.0.0.1',
    port: Number(env.PORT ?? 3000),
    dataDir: resolve(env.DATA_DIR ?? './data'),
    aiBackend: backend,
    aiModel: env.AI_MODEL ?? 'sonnet',
    aiTimeoutMs: Number(env.AI_TIMEOUT_MS ?? 180_000),
    maxUploadBytes: Number(env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024,
    voiceModel: env.GURO_VOICE_MODEL ?? 'haiku',
    geminiApiKey: env.GEMINI_API_KEY ?? '',
    geminiLiveModel: env.GEMINI_LIVE_MODEL ?? '',
    geminiBaseUrl: env.GEMINI_BASE_URL ?? '',
    webDist: resolve(env.WEB_DIST ?? new URL('../../../apps/web/dist', import.meta.url).pathname),
  };
}
