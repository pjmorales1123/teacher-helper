import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allMastered, nextUp, skillMastery } from "./mastery.ts";
import type { BestRow } from "./repo.ts";
import type { ItemResult, Quest } from "./types.ts";

const r = (skill: string, correct: boolean): ItemResult => ({ id: "x", skill, correct });
const quest = (id: string, order: number, skills: string[]): Quest => ({
  id, level: 1, kind: "quest", order, title: id, tip: null, passage: null, words: [],
  items: skills.map((skill, i) => ({ id: `i${i}`, type: "short", skill, prompt: "", accept: ["a"], why: "" })),
});

describe("skillMastery", () => {
  it("needs 5 of the last 6 on a level's focus skills", () => {
    const m = skillMastery(1, [[r("details", true), r("details", true), r("main-idea", false)], Array.from({ length: 4 }, () => r("details", true))]);
    const details = m.find((x) => x.skill === "details")!;
    assert.equal(details.correct, 6);
    assert.equal(details.recent.length, 6);
    assert.equal(details.mastered, true);
    assert.equal(m.find((x) => x.skill === "main-idea")!.mastered, false);
    assert.equal(m.find((x) => x.skill === "sequence")!.correct, 0);
    assert.equal(allMastered(m), false);
  });
  it("forgets old mistakes: only the window counts", () => {
    const hist = [[r("sequence", false), r("sequence", false)], Array.from({ length: 6 }, () => r("sequence", true))];
    assert.equal(skillMastery(1, hist).find((x) => x.skill === "sequence")!.mastered, true);
  });
});

describe("nextUp", () => {
  const a = quest("a", 1, ["details", "details", "sequence"]);
  const b = quest("b", 2, ["main-idea", "main-idea", "details"]);
  const c = quest("c", 3, ["main-idea", "main-idea", "context-clues", "context-clues"]);
  const ch = { ...quest("ch", 9, ["details"]), kind: "challenge" as const };
  const best = (passed: number, tries = 1): BestRow => ({ quest_id: "", best: 1, total: 1, passed, tries });
  it("targets the weakest unmastered skill with an unplayed quest first", () => {
    const m = skillMastery(1, [Array.from({ length: 6 }, () => r("details", true)), [r("sequence", true), r("main-idea", false)]]);
    const pick = nextUp([a, b, c], ch, m, new Map([["a", best(1)], ["b", best(0)]]));
    assert.equal(pick?.skill, "main-idea");
    assert.equal(pick?.questId, "c", "new quest beats a failed one");
  });
  it("points at the challenge once every skill is mastered", () => {
    const m = skillMastery(1, [["details", "sequence", "main-idea", "context-clues"].flatMap((s) => Array.from({ length: 5 }, () => r(s, true)))]);
    assert.equal(allMastered(m), true);
    assert.equal(nextUp([a, b, c], ch, m, new Map())?.questId, "ch");
    assert.equal(nextUp([a, b, c], ch, m, new Map([["ch", best(1)]]))?.reason, "Go for three stars.");
  });
});
