import { execFile } from 'node:child_process';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../../config.ts';

/** GET /api/ai/status tells the UI whether the CLI is installed, before the teacher types anything. */
export function aiStatusRoute(app: FastifyInstance, cfg: Config) {
  let cache: { at: number; value: unknown } | null = null;
  app.get('/api/ai/status', async () => {
    if (cache && Date.now() - cache.at < 60_000) return cache.value;
    const cmd = cfg.aiBackend;
    const value = await new Promise((resolve) => {
      execFile(cmd, ['--version'], { timeout: 10_000 }, (err, stdout) => resolve(
        err ? { backend: cmd, installed: false, model: cfg.aiModel }
          : { backend: cmd, installed: true, version: stdout.trim(), model: cfg.aiModel },
      ));
    });
    cache = { at: Date.now(), value };
    return value;
  });
}
