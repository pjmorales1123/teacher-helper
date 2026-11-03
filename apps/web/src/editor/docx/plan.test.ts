// Run with: npm test (root)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLine, planDocxEdits } from './plan.ts';

test('in-paragraph edits become proposals', () => {
  const { proposals, inserts } = planDocxEdits([{ target: 'A1', find: 'teh', replace: 'the' }], 't1');
  assert.deepEqual(proposals, [{ id: 't1-0', edit: { target: 'A1', find: 'teh', replace: 'the' }, paraId: 'A1', find: 'teh', text: 'the' }]);
  assert.deepEqual(inserts, []);
});

test('leading newline means new paragraphs only, with optional styles', () => {
  const e = { target: 'B2', find: '', replace: '\n{Heading2} Findings\nMost learners improved.\n' };
  const { proposals, inserts } = planDocxEdits([e], 't2');
  assert.equal(proposals.length, 0);
  assert.deepEqual(inserts[0].paragraphs, [{ text: 'Findings', styleId: 'Heading2' }, { text: 'Most learners improved.' }]);
});

test('replace plus continuation splits into both', () => {
  const { proposals, inserts } = planDocxEdits([{ target: 'C3', find: 'old', replace: 'new\nnext para' }], 't3');
  assert.equal(proposals[0].text, 'new');
  assert.deepEqual(inserts[0].paragraphs, [{ text: 'next para' }]);
  assert.deepEqual(parseLine('plain'), { text: 'plain' });
});
