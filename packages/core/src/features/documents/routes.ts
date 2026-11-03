import type { FastifyInstance } from 'fastify';
import { cleanName, kindFromName, looksLikeOoxml, MIME } from './kinds.ts';
import type { DocumentStore } from './store.ts';

const UUID = /^[0-9a-f-]{36}$/;

/** REST API for the document library: upload, list, open, save new version, rename, delete. */
export function documentRoutes(app: FastifyInstance, store: DocumentStore) {
  const find = (id: string) => (UUID.test(id) ? store.get(id) : undefined);

  app.get('/api/documents', async () => store.list());

  app.post('/api/documents', async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'No file in the upload.' });
    const name = cleanName(file.filename);
    const kind = kindFromName(name);
    if (!kind) return reply.code(415).send({ error: 'Only .docx, .xlsx and .pptx files are supported. Save older files in the new format first.' });
    const bytes = await file.toBuffer();
    if (!looksLikeOoxml(bytes)) return reply.code(415).send({ error: 'This file is not a valid Office document.' });
    return reply.code(201).send(await store.create(name, kind, bytes));
  });

  app.get<{ Params: { id: string } }>('/api/documents/:id', async (req, reply) => {
    const doc = find(req.params.id);
    return doc ? { ...doc, versions: store.versions(doc.id) } : reply.code(404).send({ error: 'Document not found.' });
  });

  app.get<{ Params: { id: string }; Querystring: { version?: string; download?: string } }>(
    '/api/documents/:id/content',
    async (req, reply) => {
      const doc = find(req.params.id);
      if (!doc) return reply.code(404).send({ error: 'Document not found.' });
      const version = req.query.version ? Number(req.query.version) : doc.version;
      if (!Number.isInteger(version) || version < 1 || version > doc.version) {
        return reply.code(404).send({ error: 'Version not found.' });
      }
      const disposition = req.query.download ? 'attachment' : 'inline';
      return reply
        .header('content-type', MIME[doc.kind])
        .header('cache-control', 'no-store')
        .header('content-disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(doc.name)}`)
        .send(await store.read(doc, version));
    },
  );

  app.put<{ Params: { id: string }; Querystring: { note?: string }; Body: Buffer }>(
    '/api/documents/:id/content',
    async (req, reply) => {
      const doc = find(req.params.id);
      if (!doc) return reply.code(404).send({ error: 'Document not found.' });
      if (!Buffer.isBuffer(req.body) || !looksLikeOoxml(req.body)) {
        return reply.code(400).send({ error: 'Body must be the saved Office file bytes.' });
      }
      return store.save(doc, req.body, req.query.note?.slice(0, 200) ?? 'Saved');
    },
  );

  app.patch<{ Params: { id: string }; Body: { name?: string } }>('/api/documents/:id', async (req, reply) => {
    const doc = find(req.params.id);
    if (!doc) return reply.code(404).send({ error: 'Document not found.' });
    const name = cleanName(String(req.body?.name ?? ''));
    if (kindFromName(name) !== doc.kind) return reply.code(400).send({ error: `Name must end in .${doc.kind}.` });
    return store.rename(doc, name);
  });

  app.delete<{ Params: { id: string } }>('/api/documents/:id', async (req, reply) => {
    const doc = find(req.params.id);
    if (!doc) return reply.code(404).send({ error: 'Document not found.' });
    await store.remove(doc);
    return reply.code(204).send();
  });
}
