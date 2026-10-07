import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadBuiltIn } from "./content.ts";
import { LEVELS, LEVEL_SKILLS } from "./meta.ts";
import { validateQuest } from "./validate.ts";

describe("built-in LEVELS content", () => {
  const quests = loadBuiltIn();
  it("has six quests and one challenge per level, plus a placement test", () => {
    for (const { level } of LEVELS) {
      assert.ok(quests.filter((q) => q.level === level && q.kind === "quest").length >= 6, `level ${level} quests`);
      assert.equal(quests.filter((q) => q.level === level && q.kind === "challenge").length, 1, `level ${level} challenge`);
    }
    const placement = quests.filter((q) => q.kind === "placement");
    assert.equal(placement.length, 1);
    for (const { level } of LEVELS) {
      assert.ok(placement[0]!.items.filter((i) => i.level === level).length >= 3, `placement items for level ${level}`);
    }
  });
  it("covers every focus skill with 7+ items across 2+ quests, so mastery is reachable", () => {
    for (const { level } of LEVELS) {
      for (const skill of LEVEL_SKILLS[level]!) {
        const qs = quests.filter((q) => q.level === level && q.kind === "quest" && q.items.some((i) => i.skill === skill));
        const items = qs.reduce((n, q) => n + q.items.filter((i) => i.skill === skill).length, 0);
        assert.ok(qs.length >= 2 && items >= 7, `level ${level} ${skill}: ${items} items in ${qs.length} quests`);
      }
    }
    assert.equal(new Set(quests.map((q) => q.title)).size, quests.length, "titles are unique");
  });
  it("gives every quest 2+ words and every challenge 10 items", () => {
    for (const q of quests) {
      if (q.kind === "quest") assert.ok(q.words.length >= 2, `${q.id} words`);
      if (q.kind === "challenge") assert.equal(q.items.length, 10, `${q.id} items`);
    }
  });
});

describe("validateQuest", () => {
  it("reports readable problems", () => {
    const { quest, errors } = validateQuest({ id: "x", level: 9, kind: "quest", items: [{ type: "mc", choices: ["a"], answer: 3 }] });
    assert.equal(quest, null);
    assert.ok(errors.some((e) => e.includes("level must be")));
    assert.ok(errors.some((e) => e.includes("choices needs")));
    assert.ok(errors.some((e) => e.includes("tip")));
  });
  it("normalizes a valid quest", () => {
    const { quest, errors } = validateQuest({
      id: "L9-Test".toLowerCase(), level: 2, kind: "quest", title: "T",
      tip: { skill: "details", title: "a", text: "b" }, passage: { title: "p", text: "words" },
      words: [{ word: "w", meaning: "m" }],
      items: Array.from({ length: 4 }, (_, i) => ({ type: "short", skill: "details", prompt: "q", accept: ["a"], why: "w" })),
    });
    assert.deepEqual(errors, []);
    assert.equal(quest?.items[3]?.id, "i4");
    assert.equal(quest?.words[0]?.example, "");
  });
});
