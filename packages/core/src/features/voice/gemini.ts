import { GoogleGenAI } from '@google/genai';
import type { Config } from '../../config.ts';

/** Prefer native-audio Live models (natural voice, and they can keep talking while a tool runs). */
export function rankLiveModels(names: string[]): string[] {
  const score = (n: string) => (n.includes('native-audio') ? 4 : 0) + (n.includes('2.5') ? 2 : 0) + (n.includes('preview') ? 0 : 1);
  return [...names].sort((a, b) => score(b) - score(a));
}

let cached: string | null = null;

/** The Live model to use: GEMINI_LIVE_MODEL, else the best one this key can open a live session with. */
export async function liveModel(cfg: Config): Promise<string> {
  if (cfg.geminiLiveModel) return cfg.geminiLiveModel;
  if (cached) return cached;
  const ai = new GoogleGenAI({ apiKey: cfg.geminiApiKey });
  const names: string[] = [];
  const pager = await ai.models.list({ config: { pageSize: 200 } });
  for await (const m of pager) {
    if (m.name && (m.supportedActions ?? []).includes('bidiGenerateContent')) names.push(m.name.replace(/^models\//, ''));
  }
  if (!names.length) throw new Error('This Gemini key has no Live (voice) models.');
  cached = rankLiveModels(names)[0];
  return cached;
}

/**
 * A one-use token the browser opens one voice session with. The API key itself never leaves this computer's server.
 * Against a local mock (GEMINI_BASE_URL) the token is a placeholder.
 */
export async function sessionToken(cfg: Config): Promise<{ token: string; model: string; baseUrl?: string }> {
  if (cfg.geminiBaseUrl) return { token: 'mock-token', model: cfg.geminiLiveModel || 'mock-live', baseUrl: cfg.geminiBaseUrl };
  const model = await liveModel(cfg);
  const ai = new GoogleGenAI({ apiKey: cfg.geminiApiKey, httpOptions: { apiVersion: 'v1alpha' } });
  const now = Date.now();
  const token = await ai.authTokens.create({
    config: { uses: 1, expireTime: new Date(now + 30 * 60_000).toISOString(), newSessionExpireTime: new Date(now + 60_000).toISOString() },
  });
  if (!token.name) throw new Error('Gemini did not return a session token.');
  return { token: token.name, model };
}
