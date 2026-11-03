import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capacity, deckContext, type DeckSlide } from './deck.ts';
import { locate, planPptx } from './plan.ts';

const deck: DeckSlide[] = [{
  n: 1, id: 'sl1', title: 'Parts', notes: '', layout: 'Title', boxes: [
    { id: 'S1.T1', slide: 1, slideId: 'sl1', shapeId: 'sh1', storyId: 'st1', text: 'Parts of a Flower', name: 'Title', wIn: 8, hIn: 1, xIn: 1, yIn: 0.5, fontPt: 40, capacity: 26 },
    { id: 'S1.T2', slide: 1, slideId: 'sl1', shapeId: 'sh2', storyId: 'st2', text: 'Stamen\nPistil', name: 'Body', wIn: 8, hIn: 4, xIn: 1, yIn: 2, fontPt: 24, capacity: 200 },
  ],
}];
const result = (over: object) => ({ reply: '', edits: [], ops: [], ...over });

test('capacity grows with box size and shrinks with font size', () => {
  assert.ok(capacity(8, 4, 18)! > capacity(8, 4, 32)!);
  assert.equal(capacity(0, 4, 18), null);
});

test('context lists boxes with size, font, capacity and notes', () => {
  const c = deckContext(deck);
  assert.match(c, /\[S1\.T2\] \(Body, 8\.0x4\.0in at 1\.0,2\.0, 24pt, fits ~200 chars\) Stamen \/ Pistil/);
  assert.match(c, /NOTES: \(none\)/);
});

test('text edits become proposals; a line break turns into a pending bullet rewrite', () => {
  const p = planPptx(result({ edits: [{ target: 'S1.T1', find: 'Parts', replace: 'The Parts' }, { target: 'S1.T2', find: 'Pistil', replace: 'Pistil\nOvary' }] }), deck, 't');
  assert.equal(p.proposals[0].edit.type, 'replaceText');
  assert.deepEqual(p.pending[0].op.lines, ['Stamen', 'Pistil', 'Ovary']);
  assert.equal(p.pending[0].ref.storyId, 'st2');
});

test('formatting, notes and fills are proposals; structure is pending; unknown targets fail', () => {
  const p = planPptx(result({ ops: [
    { op: 'format', target: 'S1.T1', find: 'Flower', bold: true, color: '1F4E79' },
    { op: 'notes', slide: 1, text: 'Ask: what is a stamen?' },
    { op: 'fill', target: 'S1.T2', fill: 'DDEBF7' },
    { op: 'duplicateSlide', slide: 1, rows: [['T1', 'Copy']] },
    { op: 'align', target: 'S9.T1', align: 'center' },
  ] }), deck, 't');
  const f = p.proposals[0].edit as { type: string; start: number; end: number };
  assert.deepEqual([f.type, f.start, f.end], ['formatText', 11, 17]);
  assert.deepEqual(p.proposals.map((x) => x.edit.type), ['formatText', 'setSlideNotes', 'setShapeFill']);
  assert.equal(p.pending[0].ref.slideId, 'sl1');
  assert.equal(p.failed.length, 1);
  assert.match(p.pending[0].label, /copy of slide 1/);
});

test('" / " is literal text when the box contains it, otherwise a line break', () => {
  assert.equal(locate('2 / 29', '2 / 29'), '2 / 29');
  assert.equal(locate('Stamen\nPistil', 'Stamen / Pistil'), 'Stamen\nPistil');
});

test('formatting a box in the same turn as replacing its text covers the new text', () => {
  const p = planPptx(result({ edits: [{ target: 'S1.T1', find: 'Parts of a Flower', replace: 'Flower Parts and What They Do' }],
    ops: [{ op: 'format', target: 'S1.T1', fontSize: 28 }] }), deck, 't');
  const f = p.proposals[1].edit as { start: number; end: number };
  assert.deepEqual([f.start, f.end], [0, 'Flower Parts and What They Do'.length]);
});

test('resize keeps unspecified sides and becomes a canvas proposal; slide pictures wait for approval', () => {
  const p = planPptx(result({ ops: [{ op: 'resize', target: 'S1.T1', width: 9 }, { op: 'image', slide: 1, path: '/p/a.png' }] }), deck, 't');
  const r = p.proposals[0].edit as { type: string; rect: { x: number; width: number; height: number } };
  assert.deepEqual([r.type, r.rect.x, r.rect.width, r.rect.height], ['setShapeRect', 914400, 9 * 914400, 914400]);
  assert.equal(p.pending[0].op.op, 'image');
});
