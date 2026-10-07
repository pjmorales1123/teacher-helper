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
  it("gives every focus skill 4+ evidence passages (3+ items), with a tip on it and 2+ no-hint passages", () => {
    const on = (q: { items: { skill: string }[] }, skill: string) => q.items.filter((i) => i.skill === skill).length;
    for (const { level } of LEVELS) {
      const mine = quests.filter((q) => q.level === level && q.kind !== "placement");
      const challenge = mine.find((q) => q.kind === "challenge")!;
      assert.equal(challenge.items.length, 12, `level ${level} challenge has 12 items`);
      for (const skill of LEVEL_SKILLS[level]!) {
        assert.equal(on(challenge, skill), 3, `level ${level} challenge has 3 items on ${skill}`);
        const ev = mine.filter((q) => on(q, skill) >= 3);
        assert.ok(ev.some((q) => q.tip?.skill === skill), `level ${level} ${skill} has a tip passage`);
        assert.ok(ev.filter((q) => q.tip?.skill !== skill).length >= 2, `level ${level} ${skill} has 2+ no-hint passages`);
        assert.ok(ev.length >= 4, `level ${level} ${skill}: ${ev.length} evidence passages`);
      }
      for (const q of mine.filter((q) => q.kind === "quest")) {
        assert.ok(LEVEL_SKILLS[level]!.includes(q.tip!.skill), `${q.id} tip is a focus skill`);
        const ev = LEVEL_SKILLS[level]!.filter((s) => on(q, s) >= 3);
        assert.ok(ev.includes(q.tip!.skill) && ev.length >= 3, `${q.id} is evidence for 3 focus skills incl. its tip (${ev})`);
      }
    }
    assert.equal(new Set(quests.map((q) => q.title)).size, quests.length, "titles are unique");
  });
  it("gives every quest 2+ words", () => {
    for (const q of quests) if (q.kind === "quest") assert.ok(q.words.length >= 2, `${q.id} words`);
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
      items: Array.from({ length: 6 }, (_, i) => ({ type: "mc", skill: i < 3 ? "details" : "sequence", prompt: "q", choices: ["a", "b"], answer: 0, why: "w" })),
    });
    assert.deepEqual(errors, []);
    assert.equal(quest?.items[3]?.id, "i4");
    assert.equal(quest?.words[0]?.example, "");
  });
});
