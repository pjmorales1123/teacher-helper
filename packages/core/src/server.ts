import { loadConfig } from './config.ts';
import { buildApp } from './app.ts';

const cfg = loadConfig();
const app = await buildApp(cfg, { logger: true });
await app.listen({ host: cfg.host, port: cfg.port });
app.log.info(`Guro Buddy core on http://${cfg.host}:${cfg.port} (AI: ${cfg.aiBackend}, data: ${cfg.dataDir})`);

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => { app.close().finally(() => process.exit(0)); });
}
