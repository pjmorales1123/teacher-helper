import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClaudeStreamParser } from './claude-stream.ts';
import { decodePartialString } from './reply-extractor.ts';
import { normalizeResult } from './schema.ts';
import type { AiEvent } from './types.ts';

const delta = (partial_json: string) => JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json } } });

test('streams the reply text out of partial JSON, then reads the final result', () => {
  const events: AiEvent[] = [];
  const p = createClaudeStreamParser((e) => events.push(e));
  ['{"reply": "Na', 'ayos ko \\"na\\"', ' ang\\nmga', ' typo.", "edits": [{"target":"p:1"'].forEach((c) => p.line(delta(c)));
  p.line(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, structured_output: { reply: 'x', edits: [] }, total_cost_usd: 0.01 }));
  const text = events.filter((e) => e.type === 'delta').map((e: any) => e.text).join('');
  assert.equal(text, 'Naayos ko "na" ang\nmga typo.');
  assert.equal(p.final()?.isError, false);
  assert.equal(p.final()?.costUsd, 0.01);
});

test('partial string decoder stops at incomplete escapes', () => {
  assert.equal(decodePartialString('abc\\'), 'abc');
  assert.equal(decodePartialString('caf\\u00e9 ok"rest'), 'café ok');
  assert.equal(decodePartialString('x\\u00'), 'x');
});

test('error results and junk lines are handled', () => {
  const p = createClaudeStreamParser(() => {});
  p.line('not json');
  p.line(JSON.stringify({ type: 'result', subtype: 'error_during_execution', is_error: true, result: 'Not logged in' }));
  assert.equal(p.final()?.isError, true);
  assert.equal(p.final()?.text, 'Not logged in');
});

test('normalizeResult drops malformed and no-op edits, and all edits in ask mode', () => {
  const raw = { reply: 'ok', edits: [{ target: 'p:1', find: 'teh', replace: 'the' }, { target: 'p:2', find: 'a', replace: 'a' }, { target: 3 }, null] };
  assert.deepEqual(normalizeResult(raw, 'edit', 'docx')?.edits, [{ target: 'p:1', find: 'teh', replace: 'the' }]);
  assert.deepEqual(normalizeResult(raw, 'ask', 'docx')?.edits, []);
  assert.equal(normalizeResult({ edits: [] }, 'edit', 'docx'), null);
});
