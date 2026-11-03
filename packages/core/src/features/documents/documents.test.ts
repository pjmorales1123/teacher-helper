import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../../app.ts';
import { loadConfig } from '../../config.ts';

const SAMPLE = new URL('../../../../../apps/web/public/samples/lesson-plan.docx', import.meta.url);

function multipart(name: string, bytes: Uint8Array) {
  const boundary = '----guro' + Date.now();
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: application/octet-stream\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { payload: Buffer.concat([head, bytes, tail]), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

async function withApp(fn: (app: Awaited<ReturnType<typeof buildApp>>) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'guro-test-'));
  const app = await buildApp(loadConfig({ DATA_DIR: dir, WEB_DIST: join(dir, 'none') }));
  try { await fn(app); } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
}

test('upload, open, save a new version, list versions, delete', () => withApp(async (app) => {
  const bytes = await readFile(SAMPLE);
  const up = await app.inject({ method: 'POST', url: '/api/documents', ...multipart('Lesson Plan.docx', bytes) });
  assert.equal(up.statusCode, 201);
  const doc = up.json();
  assert.equal(doc.kind, 'docx');
  assert.equal(doc.name, 'Lesson Plan.docx');

  const got = await app.inject({ url: `/api/documents/${doc.id}/content` });
  assert.equal(got.statusCode, 200);
  assert.deepEqual(got.rawPayload, bytes);

  const saved = await app.inject({
    method: 'PUT', url: `/api/documents/${doc.id}/content?note=AI%20edits`,
    payload: bytes, headers: { 'content-type': 'application/octet-stream' },
  });
  assert.equal(saved.json().version, 2);

  const meta = (await app.inject({ url: `/api/documents/${doc.id}` })).json();
  assert.deepEqual(meta.versions.map((v: any) => v.note), ['AI edits', 'Uploaded']);
  assert.equal((await app.inject({ url: `/api/documents/${doc.id}/content?version=1` })).statusCode, 200);
  assert.equal((await app.inject({ url: `/api/documents/${doc.id}/content?version=9` })).statusCode, 404);

  assert.equal((await app.inject({ method: 'DELETE', url: `/api/documents/${doc.id}` })).statusCode, 204);
  assert.deepEqual((await app.inject({ url: '/api/documents' })).json(), []);
}));

test('rejects legacy and fake files', () => withApp(async (app) => {
  const legacy = await app.inject({ method: 'POST', url: '/api/documents', ...multipart('old.doc', Buffer.from('PK\x03\x04xx')) });
  assert.equal(legacy.statusCode, 415);
  const fake = await app.inject({ method: 'POST', url: '/api/documents', ...multipart('fake.docx', Buffer.from('hello')) });
  assert.equal(fake.statusCode, 415);
  const bad = await app.inject({ url: '/api/documents/../../etc/passwd/content' });
  assert.equal(bad.statusCode, 404);
}));

test('rename keeps the extension', () => withApp(async (app) => {
  const doc = (await app.inject({ method: 'POST', url: '/api/documents', ...multipart('a.docx', await readFile(SAMPLE)) })).json();
  const ok = await app.inject({ method: 'PATCH', url: `/api/documents/${doc.id}`, payload: { name: 'DLL Week 3.docx' } });
  assert.equal(ok.json().name, 'DLL Week 3.docx');
  const bad = await app.inject({ method: 'PATCH', url: `/api/documents/${doc.id}`, payload: { name: 'x.xlsx' } });
  assert.equal(bad.statusCode, 400);
}));
