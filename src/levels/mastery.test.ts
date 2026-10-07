import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allMastered, countedAttempts, passesSkill, skillMastery } from "./mastery.ts";
import { nextUp } from "./next-up.ts";
import type { BestRow } from "./repo.ts";
import type { Attempt, ItemResult, Quest } from "./types.ts";

const quest = (id: string, order: number, tip: string | null, skills: string[], kind: Quest["kind"] = "quest"): Quest => ({
  id, level: 1, kind, order, title: id, tip: tip ? { skill: tip, title: "t", text: "t" } : null, passage: null, words: [],
  items: skills.map((skill, i) => ({ id: `i${i}`, type: "short", skill, prompt: "", accept: ["a"], why: "" })),
});
// Warrior passages: details is the tip in a and d; secondary (no hint) in b and the challenge.
const a = quest("a", 1, "details", ["details", "details", "details", "sequence", "sequence", "sequence"]);
const b = quest("b", 2, "sequence", ["sequence", "sequence", "sequence", "details", "details", "details"]);
const d = quest("d", 3, "details", ["details", "details", "details", "main-idea", "main-idea", "main-idea"]);
const ch = quest("ch", 9, null, ["details", "details", "details", "sequence", "sequence", "sequence", "main-idea", "main-idea", "main-idea", "context-clues", "context-clues", "context-clues"], "challenge");
const quests = new Map([a, b, d, ch].map((q) => [q.id, q]));
let n = 0;
/** An attempt on quest q where `wrong` lists skills answered wrong (one item each, or all if "all:skill"). */
const attempt = (q: Quest, day: string, wrong: string[] = []): Attempt => {
  const results: ItemResult[] = q.items.map((it, i) => ({
    id: it.id, skill: it.skill,
    correct: !(wrong.includes("all:" + it.skill) || (wrong.includes(it.skill) && q.items.findIndex((x) => x.skill === it.skill) === i)),
  }));
  return { id: ++n, student_id: "s", quest_id: q.id, level: 1, kind: q.kind, score: 0, total: 0, passed: 1, results: JSON.stringify(results), created_at: `${day} 10:00:00` };
};
const details = (ms: ReturnType<typeof skillMastery>) => ms.find((m) => m.skill === "details")!;

describe("passage evidence", () => {
  it("passes a skill with at most one miss, both right when only two items", () => {
    assert.equal(passesSkill(3, 3), true); assert.equal(passesSkill(2, 3), true); assert.equal(passesSkill(1, 3), false);
    assert.equal(passesSkill(2, 2), true); assert.equal(passesSkill(1, 2), false); assert.equal(passesSkill(1, 1), false);
  });
  it("needs three passages including one without the hint", () => {
    const m1 = details(skillMastery(1, [attempt(a, "2026-01-01"), attempt(d, "2026-01-02")], quests));
    assert.equal(m1.passes, 2); assert.equal(m1.noHintPass, false); assert.equal(m1.state, "progress");
    const hinted = details(skillMastery(1, [attempt(a, "2026-01-01"), attempt(d, "2026-01-02"), attempt(a, "2026-01-03")], quests));
    assert.equal(hinted.passes, 2, "replaying a passage never counts twice");
    const m3 = details(skillMastery(1, [attempt(a, "2026-01-01"), attempt(d, "2026-01-02"), attempt(b, "2026-01-03", ["details"])], quests));
    assert.equal(m3.passes, 3); assert.equal(m3.noHintPass, true); assert.equal(m3.state, "mastered");
  });
  it("ignores same-day replays and keeps the latest counted attempt per passage", () => {
    const hist = [attempt(a, "2026-01-01", ["all:details"]), attempt(a, "2026-01-01")];
    assert.equal(countedAttempts(hist).length, 1);
    assert.equal(details(skillMastery(1, hist, quests)).passes, 0, "the same-day replay does not replace the fail");
    const later = [...hist, attempt(a, "2026-01-02")];
    assert.equal(details(skillMastery(1, later, quests)).passes, 1, "a later day replaces the evidence");
  });
  it("turns shaky when the latest no-hint text fails, and recovers with one more pass", () => {
    const base = [attempt(a, "2026-01-01"), attempt(d, "2026-01-02"), attempt(b, "2026-01-03")];
    const shaky = [...base, attempt(ch, "2026-01-04", ["all:details"])];
    const m = details(skillMastery(1, shaky, quests));
    assert.equal(m.state, "shaky"); assert.equal(m.mastered, false); assert.equal(m.passes, 3);
    assert.equal(details(skillMastery(1, [...shaky, attempt(ch, "2026-01-05")], quests)).state, "mastered");
    assert.equal(allMastered(skillMastery(1, shaky, quests)), false);
  });
});

describe("nextUp", () => {
  const best = (passed: number): BestRow => ({ quest_id: "", best: 1, total: 1, passed, tries: 1 });
  it("starts a skill on its tip passage, then asks for a no-hint passage", () => {
    const fresh = skillMastery(1, [], quests);
    const first = nextUp([a, b, d], ch, fresh, new Map(), null, "2026-01-09");
    assert.equal(first?.skill, "details"); assert.equal(first?.questId, "a");
    const two = skillMastery(1, [attempt(a, "2026-01-01"), attempt(d, "2026-01-02")], quests);
    const pick = nextUp([a, b, d], ch, two.filter((m) => m.skill === "details"), new Map(), "details", "2026-01-09");
    assert.equal(pick?.questId, "b", "no-hint passage preferred once passes exist");
    assert.match(pick!.reason, /no hint/);
  });
  it("never offers a passage played today, and points at the Challenge once all are mastered", () => {
    const two = skillMastery(1, [attempt(a, "2026-01-09", ["all:details"]), attempt(d, "2026-01-02")], quests).filter((m) => m.skill === "details");
    assert.equal(nextUp([a, d], ch, two, new Map(), null, "2026-01-09")?.questId, undefined, "a is today, d is passed");
    const all = skillMastery(1, [], quests).map((m) => ({ ...m, mastered: true, state: "mastered" as const }));
    assert.equal(nextUp([a, b, d], ch, all, new Map(), null, "2026-01-09")?.questId, "ch");
    assert.equal(nextUp([a, b, d], ch, all, new Map([["ch", best(1)]]), null, "2026-01-09"), null);
  });
});
