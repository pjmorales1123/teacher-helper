import type { FastifyInstance } from 'fastify';
import type { Config } from '../../config.ts';
import { sessionToken } from './gemini.ts';

/** Voice assistant: Gemini Live talks; spoken edit requests come back through /api/ai/turn with voice: true. */
export function voiceRoutes(app: FastifyInstance, cfg: Config) {
  const ready = () => Boolean(cfg.geminiApiKey || cfg.geminiBaseUrl);

  app.get('/api/voice/status', async () => ({
    available: ready(),
    worker: cfg.voiceModel,
    reason: ready() ? undefined : 'Add GEMINI_API_KEY to the .env file next to Guro Buddy, then restart it.',
  }));

  app.post('/api/voice/session', async (_req, reply) => {
    if (!ready()) return reply.code(503).send({ error: 'Voice is off: add GEMINI_API_KEY to .env and restart.' });
    try {
      return await sessionToken(cfg);
    } catch (e) {
      const msg = (e as Error).message;
      return reply.code(502).send({ error: /API key|401|403|PERMISSION/i.test(msg) ? 'Gemini refused the key in .env. Check GEMINI_API_KEY.' : `Could not start voice: ${msg}` });
    }
  });
}
