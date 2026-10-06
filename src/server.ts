// Entry point: load config, open the database, start the HTTP server.
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openDatabase } from "./db/connection.ts";
import { createAiAdapter } from "./services/ai/adapter.ts";
import { createStorage } from "./services/storage.ts";

const config = loadConfig();
const db = openDatabase(config.dbPath);
const app = createApp({
  config,
  db,
  ai: createAiAdapter(config),
  storage: createStorage(config.uploadsDir),
});

const server = app.listen(config.port, config.host, () => {
  console.log(`Teacher Helper running at http://localhost:${config.port}`);
  console.log(`  data:       ${config.dataDir}`);
  console.log(`  AI backend: ${config.aiBackend} (subscription CLI)`);
  if (config.teacherPasswordIsDefault) {
    console.log("  NOTE: TEACHER_PASSWORD is not set. Copy .env.example to .env and set one.");
  }
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${config.port} is already in use. Set PORT in .env to another port.`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});

function shutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
