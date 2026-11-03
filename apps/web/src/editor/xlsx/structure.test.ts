import { test } from 'node:test';
import assert from 'node:assert/strict';
import { structureOps } from './structure.ts';

const names = ['Written Works', 'Summary'];

test('column widths expand per column', () => {
  assert.deepEqual(structureOps({ op: 'columnWidth', target: '0!B:C', size: 12 }, names), [
    { type: 'setColWidth', sheet: 0, col: 1, width: 12 }, { type: 'setColWidth', sheet: 0, col: 2, width: 12 }]);
});

test('rows, columns, merges and sheets map to raw ops', () => {
  assert.deepEqual(structureOps({ op: 'insertRows', target: 'Summary!5', count: 2 }, names), [{ type: 'insertRows', sheet: 1, at: 4, count: 2 }]);
  assert.deepEqual(structureOps({ op: 'deleteRows', target: '0!5:7' }, names), [{ type: 'deleteRows', sheet: 0, at: 4, count: 3 }]);
  assert.deepEqual(structureOps({ op: 'insertColumns', target: '0!C' }, names), [{ type: 'insertCols', sheet: 0, at: 2, count: 1 }]);
  assert.deepEqual(structureOps({ op: 'merge', target: '0!A1:F1' }, names), [{ type: 'mergeCells', sheet: 0, range: { start: { row: 0, col: 0 }, end: { row: 0, col: 5 } } }]);
  assert.deepEqual(structureOps({ op: 'renameSheet', target: 'Summary', text: 'Q1' }, names), [{ type: 'renameSheet', sheet: 1, name: 'Q1' }]);
  assert.deepEqual(structureOps({ op: 'addSheet', text: 'Q2' }, names), [{ type: 'addSheet', index: 2, name: 'Q2' }]);
});

test('bad targets give readable reasons', () => {
  assert.throws(() => structureOps({ op: 'columnWidth', target: '0!B5', size: 9 }, names), /not a column/);
  assert.throws(() => structureOps({ op: 'deleteRows', target: '9!2' }, names), /Unknown sheet/);
});
