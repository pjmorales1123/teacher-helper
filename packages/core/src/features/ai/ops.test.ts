import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkOp, normalizeOps } from './ops-schema.ts';
import { normalizeResult } from './schema.ts';

test('accepts valid ops and normalizes colors', () => {
  const r = checkOp({ op: 'format', target: 'body:p3', find: 'Objectives', bold: true, color: '#1f4e79', fontSize: 14 }, 'docx');
  assert.ok('op' in r);
  assert.equal(r.op.color, '1F4E79');
});

test('rejects ops from another format, bad values and missing fields', () => {
  assert.match(String((checkOp({ op: 'bullets', target: 'S1.T1', lines: ['a'] }, 'docx') as any).reason), /not available/);
  assert.match(String((checkOp({ op: 'format', target: 'x', color: 'red' }, 'docx') as any).reason), /hex/);
  assert.match(String((checkOp({ op: 'format', target: 'x', fontSize: 200 }, 'docx') as any).reason), /fontSize/);
  assert.match(String((checkOp({ op: 'table', target: 'x', rows: [] }, 'docx') as any).reason), /rows/);
  assert.match(String((checkOp({ op: 'notes', text: 'hi' }, 'pptx') as any).reason), /slide/);
  assert.match(String((checkOp({ op: 'pageSetup', margins: { top: 9 } }, 'docx') as any).reason), /margins/);
});

test('normalizeOps keeps good ops and reports dropped ones', () => {
  const { ops, dropped } = normalizeOps([
    { op: 'style', target: '0!A1:G1', bold: true, fill: '#DDEBF7' },
    { op: 'paragraph', target: 'x' },
    null,
  ], 'xlsx');
  assert.equal(ops.length, 1);
  assert.equal(dropped.length, 2);
});

test('normalizeResult carries ops in edit mode and strips them in ask mode', () => {
  const raw = { reply: 'ok', edits: [], ops: [{ op: 'pageSetup', paper: 'A4', margins: { top: 1, bottom: 1, left: 1, right: 1 } }] };
  assert.equal(normalizeResult(raw, 'edit', 'docx')?.ops.length, 1);
  assert.equal(normalizeResult(raw, 'ask', 'docx')?.ops.length, 0);
});

test('cross-format synonyms are mapped instead of dropped', () => {
  const r = checkOp({ op: 'align', target: 'T1.R2.C2', align: 'center' }, 'docx');
  assert.ok('op' in r && r.op.op === 'paragraph');
});
