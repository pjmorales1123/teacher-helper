import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkItem, gradeQuest, normalize, skillStats, toPublicItem, weakestSkills } from "./engine.ts";
import { comboBonus, nextStreak, currentStreak, placementStep, xpFor } from "./progression.ts";
import { buildReview, nextBox } from "./words.ts";
import { earnedBadges } from "./badges.ts";
import { addDays, daysBetween } from "./dates.ts";
import type { Item, Quest } from "./types.ts";

const mc: Item = { id: "a", type: "mc", skill: "details", prompt: "?", choices: ["x", "y"], answer: 1, why: "w" };
const order: Item = { id: "b", type: "order", skill: "sequence", prompt: "?", steps: ["1", "2", "3"], why: "w" };
const short: Item = { id: "c", type: "short", skill: "details", prompt: "?", accept: ["Bantay", "the dog"], why: "w" };

describe("checkItem", () => {
  it("grades each type", () => {
    assert.equal(checkItem(mc, 1), true);
    assert.equal(checkItem(mc, "1"), true);
    assert.equal(checkItem(mc, 0), false);
    assert.equal(checkItem(order, ["1", "2", "3"]), true);
    assert.equal(checkItem(order, ["2", "1", "3"]), false);
    assert.equal(checkItem(short, "  bantay! "), true);
    assert.equal(checkItem(short, "The DOG."), true);
    assert.equal(checkItem(short, ""), false);
  });
  it("hides answers and shuffles steps for the client", () => {
    const pub = toPublicItem(order) as { steps: string[] };
    assert.deepEqual([...pub.steps].sort(), ["1", "2", "3"]);
    assert.notDeepEqual(pub.steps, ["1", "2", "3"]);
    assert.ok(!("answer" in toPublicItem(mc)));
    assert.ok(!("accept" in toPublicItem(short)));
  });
  it("normalizes text", () => assert.equal(normalize("  Héllo,  World! "), "héllo world"));
});

describe("gradeQuest and skills", () => {
  const quest: Quest = { id: "q", level: 1, kind: "quest", order: 1, title: "t", tip: null, passage: null, words: [], items: [mc, order, short] };
  it("passes at 70% for quests and 80% for challenges", () => {
    const two = gradeQuest(quest, { a: 1, b: ["1", "2", "3"], c: "no" });
    assert.equal(two.score, 2);
    assert.equal(two.passed, false); // 66%
    const all = gradeQuest(quest, { a: 1, b: ["1", "2", "3"], c: "bantay" });
    assert.equal(all.passed, true);
    assert.equal(gradeQuest({ ...quest, kind: "challenge" }, { a: 1, b: ["1", "2", "3"], c: "x" }).passed, false);
  });
  it("aggregates skill accuracy and finds the weakest", () => {
    const stats = skillStats([
      [{ id: "1", skill: "details", correct: true }, { id: "2", skill: "details", correct: false }],
      [{ id: "3", skill: "sequence", correct: true }, { id: "4", skill: "sequence", correct: true }],
    ]);
    assert.equal(stats[0]?.skill, "details");
    assert.equal(stats[0]?.accuracy, 50);
    assert.deepEqual(weakestSkills(stats).map((s) => s.skill), ["details"]);
  });
});

describe("progression", () => {
  it("counts streaks by calendar day", () => {
    assert.equal(nextStreak({ streak: 0, last_active: null }, "2026-10-06"), 1);
    assert.equal(nextStreak({ streak: 2, last_active: "2026-10-05" }, "2026-10-06"), 3);
    assert.equal(nextStreak({ streak: 2, last_active: "2026-10-06" }, "2026-10-06"), 2);
    assert.equal(nextStreak({ streak: 5, last_active: "2026-10-01" }, "2026-10-06"), 1);
    assert.equal(currentStreak({ streak: 5, last_active: "2026-10-01" }, "2026-10-06"), 0);
  });
  it("awards xp with combo bonuses", () => {
    const outcome = { results: [], score: 5, total: 6, passed: true };
    assert.equal(xpFor("quest", outcome, true), 75);
    assert.equal(xpFor("quest", outcome, false), 50);
    assert.equal(xpFor("challenge", outcome, false), 100);
    const r = (c: boolean) => ({ correct: c });
    assert.equal(comboBonus([r(true), r(true), r(true), r(true), r(false), r(true)]), 10);
    assert.equal(comboBonus([r(true), r(false), r(true), r(true)]), 0);
  });
  it("places at the last passed level", () => {
    assert.deepEqual(placementStep(1, 1), { placed: 1, nextRound: 1 });
    assert.deepEqual(placementStep(1, 2), { placed: null, nextRound: 2 });
    assert.deepEqual(placementStep(3, 1), { placed: 2, nextRound: 1 });
    assert.deepEqual(placementStep(6, 3), { placed: 6, nextRound: 1 });
  });
  it("moves words through Leitner boxes", () => {
    assert.deepEqual(nextBox(1, true), { box: 2, days: 3 });
    assert.deepEqual(nextBox(5, true), { box: 5, days: 30 });
    assert.deepEqual(nextBox(4, false), { box: 1, days: 1 });
    assert.equal(addDays("2026-10-30", 3), "2026-11-02");
    assert.equal(daysBetween("2026-10-30", "2026-11-02"), 3);
  });
  it("builds review items with the right answer index", () => {
    const due = [{ id: 1, word: "shade", meaning: "cool spot", example: "In the shade.", box: 1, due: "x" }];
    const pool = [{ word: "a", meaning: "m1", example: "" }, { word: "b", meaning: "m2", example: "" }, { word: "c", meaning: "m3", example: "" }];
    const { items, answers } = buildReview(due, pool);
    assert.equal(items[0]?.choices.length, 4);
    assert.equal(items[0]?.choices[answers.get(1)!], "cool spot");
    assert.equal(items[0]?.example, "In the _____.");
  });
  it("lists earned badges", () => {
    const b = earnedBadges({ attempts: 1, perfectQuest: true, streak: 3, reviews: 0, mastered: 0, flawlessChallenge: false, level: 3 });
    assert.deepEqual(b, ["first-quest", "perfect-quest", "streak-3", "level-2", "level-3"]);
  });
});
