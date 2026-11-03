import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeOp } from './describe.ts';
import { parseRange } from './xlsx/a1.ts';
import { cellsToInputs } from './xlsx/ops.ts';

test('labels read like plain instructions and use the namer', () => {
  assert.equal(describeOp({ op: 'format', target: 'p1', find: 'Objectives', bold: true, fontSize: 14 }), 'Format “Objectives”: bold, 14 pt');
  assert.equal(describeOp({ op: 'paragraph', target: 'p2', align: 'justify' }, () => '“The learners…”'), '“The learners…”: align justify');
  assert.match(describeOp({ op: 'pageSetup', paper: 'A4', margins: { top: 1 } }), /A4, margins top 1"/);
});

test('ranges parse with sheet index or name', () => {
  assert.deepEqual(parseRange('0!A1:G1', ['Written Works']), { sheet: 0, a1: 'A1:G1' });
  assert.deepEqual(parseRange("'Written Works'!b2", ['Written Works']), { sheet: 0, a1: 'B2:B2' });
  assert.equal(parseRange('3!A1', ['Only']), null);
});

test('a cells block expands to zero-based inputs', () => {
  const inputs = cellsToInputs({ op: 'cells', target: '0!H1', rows: [['Remarks'], ['=IF(F2>=75,"Passed","Needs support")']] }, ['S']);
  assert.deepEqual(inputs.map((i) => [i.row, i.col, i.input.slice(0, 7)]), [[0, 7, 'Remarks'], [1, 7, '=IF(F2>']]);
});
