import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixTarget } from './targets.ts';

const ids = new Set(['body:p0', 'body:p12', 'T1.R2.C3']);
const exists = (id: string) => ids.has(id);

test('shortened or bracketed ids map to the real paragraph or cell', () => {
  assert.equal(fixTarget('p0', exists), 'body:p0');
  assert.equal(fixTarget('[body:p12]', exists), 'body:p12');
  assert.equal(fixTarget('[T1.R2.C3]', exists), 'T1.R2.C3');
  assert.equal(fixTarget('body:p0', exists), 'body:p0');
});

test('unknown ids are left alone so they are reported, never guessed', () => {
  assert.equal(fixTarget('p99', exists), 'p99');
  assert.equal(fixTarget(undefined, exists), undefined);
});
