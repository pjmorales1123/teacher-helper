import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSkills, pickSkills, skillsFor } from './skills.ts';

const names = (kind: Parameters<typeof pickSkills>[0], text: string) => {
  const p = pickSkills(kind, text);
  return { always: p.always.map((s) => s.name), matched: p.matched.map((s) => s.name) };
};

test('every knowledge file has kinds, a title and a valid match pattern', () => {
  for (const s of loadSkills()) {
    assert.ok(s.kinds.length && s.kinds.every((k) => ['docx', 'xlsx', 'pptx'].includes(k)), s.name);
    assert.ok(s.title && s.body.length > 100, s.name);
  }
});

test('a DLL gets the lesson-plan knowledge, not the memo or grading knowledge', () => {
  const r = names('docx', 'Daily Lesson Log\nI. OBJECTIVES\nA. Content Standards\nB. Performance Standards\nC. Learning Competencies\nIV. PROCEDURES');
  assert.ok(r.always.includes('content-accuracy') && r.always.includes('deped-documents'));
  assert.equal(r.matched[0], 'deped-lesson-plans');
  assert.ok(!r.matched.includes('official-communications') && !r.matched.includes('grading-do015'));
});

test('memos, certificates, class records and tests are recognized', () => {
  assert.equal(names('docx', 'MEMORANDUM\nTO: All Teachers\nFROM: Principal\nSUBJECT: Science Fair').matched[0], 'official-communications');
  assert.equal(names('docx', 'CERTIFICATE OF RECOGNITION is awarded to JUAN given this 3rd day').matched[0], 'certificates');
  assert.ok(names('xlsx', 'class-record.xlsx\nLearner | WW1 (20) | WW2 (20) | PT1 | Initial Grade | Transmuted').matched.includes('grading-do015'));
  assert.equal(names('docx', 'Table of Specification\nSummative Test in Science 6').matched[0], 'assessments');
});

test('an unknown document says so instead of guessing', () => {
  assert.match(skillsFor('docx', 'Grocery list: rice, eggs'), /not recognized/);
  assert.match(skillsFor('xlsx', 'class record WW1 transmuted'), /Source: DO 015/);
});

test('the best matching format spec is added for the document', () => {
  const ilaw = pickSkills('docx', 'ILAW LESSON PLAN\nIntentions\nLearner Context\nLearning Experience\nPre-Lesson\nFlow\nWays Forward');
  assert.deepEqual(ilaw.matched.filter((s) => s.spec).map((s) => s.name), ['ilaw-lesson-plan']);
  const tos = pickSkills('xlsx', 'TABLE OF SPECIFICATIONS\nSecond Periodical Test\nNo. of Items\nItem Placement');
  assert.deepEqual(tos.matched.filter((s) => s.spec).map((s) => s.name), ['test-paper-and-tos']);
});
