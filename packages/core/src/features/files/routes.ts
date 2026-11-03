import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { browseFolders } from './browse.ts';
import { insideAllowed, suggestedFolders, type FolderSettings } from './folders.ts';

const IMAGE_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };

/** Folder permissions for the AI, and image bytes for placing pictures from those folders. */
export function fileRoutes(app: FastifyInstance, folders: FolderSettings) {
  app.get('/api/settings/folders', async () => ({ allowed: folders.list(), suggested: suggestedFolders(), web: folders.web() }));

  app.put<{ Body: { web?: boolean } }>('/api/settings/web', async (req) => ({ web: folders.setWeb(req.body?.web === true) }));

  app.put<{ Body: { allowed?: string[] } }>('/api/settings/folders', async (req, reply) => {
    if (!Array.isArray(req.body?.allowed)) return reply.code(400).send({ error: 'Send { allowed: string[] }.' });
    return { allowed: folders.set(req.body.allowed), suggested: suggestedFolders(), web: folders.web() };
  });

  app.get<{ Querystring: { path?: string } }>('/api/files/browse', async (req) => browseFolders(req.query.path));

  app.get<{ Querystring: { path?: string } }>('/api/files/image', async (req, reply) => {
    const safe = insideAllowed(String(req.query.path ?? ''), folders.list());
    const type = safe ? IMAGE_TYPES[extname(safe).toLowerCase()] : undefined;
    if (!safe || !type) return reply.code(404).send({ error: 'Picture not found in the allowed folders.' });
    return reply.header('content-type', type).header('cache-control', 'no-store').send(readFileSync(safe));
  });
}
