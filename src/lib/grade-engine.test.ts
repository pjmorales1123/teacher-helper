import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeGrade, transmute } from "./grade-engine.ts";
import { findTransmutationPreset, findWeightPreset } from "./presets.ts";

const std = findWeightPreset("standard");
const sy = findTransmutationPreset("sy2026-27");

describe("transmute", () => {
  it("maps the passing initial grade to 75", () => {
    assert.equal(transmute(70, sy), 75);
    assert.equal(transmute(60, findTransmutationPreset("legacy-60")), 75);
  });
  it("maps 100 to 100 and 0 to the floor", () => {
    assert.equal(transmute(100, sy), 100);
    assert.equal(transmute(0, sy), 60);
  });
  it("zero-based preset is the identity", () => {
    const zb = findTransmutationPreset("zero-based");
    assert.equal(transmute(82, zb), 82);
    assert.equal(transmute(40, zb), 40);
  });
  it("is monotonic across the passing boundary", () => {
    assert.ok(transmute(69.9, sy) < transmute(70, sy));
  });
});

describe("computeGrade", () => {
  it("follows the E-Class Record method", () => {
    const result = computeGrade(
      [
        { component: "WW", score: 40, maxScore: 50 }, // 80%
        { component: "PT", score: 90, maxScore: 100 }, // 90%
        { component: "EX", score: 35, maxScore: 50 }, // 70%
      ],
      std,
      sy,
    );
    // 80*0.2 + 90*0.5 + 70*0.3 = 16 + 45 + 21 = 82
    assert.equal(result.initialGrade, 82);
    assert.equal(result.transmutedGrade, 85);
    assert.equal(result.passing, true);
    assert.equal(result.complete, true);
  });
  it("marks incomplete components and skips formative-free weights", () => {
    const result = computeGrade([{ component: "WW", score: 10, maxScore: 10 }], std, sy);
    assert.equal(result.complete, false);
    assert.equal(result.components[1]?.percentage, null);
    assert.equal(result.initialGrade, 20);
  });
  it("adds extra points to PT but caps at the highest possible", () => {
    const items = [{ component: "PT" as const, score: 95, maxScore: 100 }];
    const r = computeGrade(items, std, sy, { PT: 10 });
    assert.equal(r.components[1]?.raw, 100);
  });
});
