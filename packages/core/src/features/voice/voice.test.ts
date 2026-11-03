import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../app.ts';
import { loadConfig } from '../../config.ts';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rankLiveModels } from './gemini.ts';

test('prefers native-audio 2.5 Live models', () => {
  assert.equal(rankLiveModels(['gemini-3.1-flash-live-preview', 'gemini-2.5-flash-native-audio-preview-12-2025', 'gemini-live-2.5-flash-preview'])[0],
    'gemini-2.5-flash-native-audio-preview-12-2025');
});

test('voice is off without a key and never hands out a session', async () => {
  const cfg = { ...loadConfig({ DATA_DIR: mkdtempSync(join(tmpdir(), 'guro-voice-')) }), geminiApiKey: '', geminiBaseUrl: '' };
  const app = await buildApp(cfg);
  const status = await app.inject({ method: 'GET', url: '/api/voice/status' });
  assert.equal(status.json().available, false);
  assert.match(status.json().reason, /GEMINI_API_KEY/);
  const session = await app.inject({ method: 'POST', url: '/api/voice/session' });
  assert.equal(session.statusCode, 503);
  await app.close();
});

test('a mock endpoint gets a placeholder token, never the key', async () => {
  const cfg = { ...loadConfig({ DATA_DIR: mkdtempSync(join(tmpdir(), 'guro-voice-')) }), geminiApiKey: 'secret-key', geminiBaseUrl: 'http://127.0.0.1:9' };
  const app = await buildApp(cfg);
  const body = (await app.inject({ method: 'POST', url: '/api/voice/session' })).json();
  assert.equal(body.token, 'mock-token');
  assert.ok(!JSON.stringify(body).includes('secret-key'));
  await app.close();
});
