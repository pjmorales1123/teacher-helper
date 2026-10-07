import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadBanks } from "./bank.ts";
import { checkAnswer, drawRun, multiplier, runXp, speedBonus, topicStats, unlockedTiers } from "./engine.ts";
import { GRAMMAR_TIERS, RUN_SIZE } from "./meta.ts";

describe("grammar bank", () => {
  const banks = loadBanks();
  it("has every tier with its assigned topics and balanced answers", () => {
    for (const t of GRAMMAR_TIERS) {
      const b = banks.get(t.tier)!;
      assert.ok(b.items.length >= 40, `tier ${t.tier} has 40 items`);
      const topics = new Set(b.items.map((i) => i.topic));
      assert.deepEqual([...topics].sort(), [...t.topics].sort(), `tier ${t.tier} topics`);
      const idx = [0, 0, 0, 0]; for (const i of b.items) idx[i.answer]!++;
      assert.ok(Math.max(...idx) - Math.min(...idx) <= 6, `tier ${t.tier} answer positions are balanced: ${idx}`);
      assert.equal(new Set(b.items.map((i) => i.sentence.toLowerCase())).size, b.items.length, `tier ${t.tier} sentences are unique`);
    }
  });
  it("draws a full run leaning toward weak topics without repeating recent items", () => {
    const b = banks.get(1)!;
    const stats = topicStats([[{ id: "x", topic: "article", correct: false, ms: 0 }, { id: "y", topic: "article", correct: false, ms: 0 }, { id: "z", topic: "sva", correct: true, ms: 0 }]]);
    const recent = new Set(b.items.slice(0, 5).map((i) => i.id));
    const run = drawRun(b.items, stats, RUN_SIZE, recent);
    assert.equal(run.length, RUN_SIZE);
    assert.equal(new Set(run.map((i) => i.id)).size, RUN_SIZE);
    assert.ok(run.every((i) => !recent.has(i.id)));
    assert.ok(run.filter((i) => i.topic === "article").length >= 2, "weak topic is well represented");
    assert.ok(checkAnswer(run[0]!, run[0]!.choices[run[0]!.answer]!.toUpperCase()));
  });
});

describe("grammar scoring", () => {
  it("multiplies streaks and rewards speed", () => {
    assert.equal(multiplier(2), 1); assert.equal(multiplier(3), 2); assert.equal(multiplier(6), 3); assert.equal(multiplier(30), 3);
    assert.equal(speedBonus(0), 5); assert.equal(speedBonus(15000), 0); assert.equal(speedBonus(7500), 3);
    const r = (correct: boolean, ms = 15000) => ({ id: "", topic: "sva", correct, ms });
    assert.equal(runXp([r(true), r(true), r(true), r(false), r(true)]), 5 + 5 + 10 + 5);
  });
  it("unlocks a tier once the one below scored 8", () => {
    assert.deepEqual(unlockedTiers(new Map()), [1]);
    assert.deepEqual(unlockedTiers(new Map([[1, 7]])), [1]);
    assert.deepEqual(unlockedTiers(new Map([[1, 8], [2, 10]])), [1, 2, 3]);
  });
});
