import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import type { Config } from './config.ts';
import { openDb } from './lib/db.ts';
import { createDocumentStore } from './features/documents/store.ts';
import { documentRoutes } from './features/documents/routes.ts';
import { createHistory } from './features/ai/history.ts';
import { aiRoutes } from './features/ai/routes.ts';
import { aiStatusRoute } from './features/ai/status.ts';
import { createFolderSettings } from './features/files/folders.ts';
import { fileRoutes } from './features/files/routes.ts';

/** Builds the HTTP app. Kept separate from server.ts so tests can call app.inject(). */
export async function buildApp(cfg: Config, opts: { logger?: boolean } = {}) {
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: cfg.maxUploadBytes });
  const db = openDb(cfg.dataDir);
  app.addHook('onClose', async () => db.close());

  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: cfg.maxUploadBytes },
    (_req, body, done) => done(null, body));
  await app.register(multipart, { limits: { fileSize: cfg.maxUploadBytes, files: 1 } });

  const store = createDocumentStore(db, cfg.dataDir);
  documentRoutes(app, store);
  const folders = createFolderSettings(db);
  aiRoutes(app, cfg, store, createHistory(db), folders);
  fileRoutes(app, folders);
  aiStatusRoute(app, cfg);
  app.get('/api/health', async () => ({ ok: true }));

  if (existsSync(cfg.webDist)) {
    await app.register(fastifyStatic, { root: cfg.webDist });
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith('/api/') ? reply.code(404).send({ error: 'Not found.' }) : reply.sendFile('index.html'));
  }
  return app;
}
