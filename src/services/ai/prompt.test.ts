import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDraft } from "./prompt.ts";

describe("parseDraft", () => {
  it("reads a bare JSON object", () => {
    const d = parseDraft('{"score": 8, "feedback": "Good work."}', 10);
    assert.deepEqual(d, { score: 8, feedback: "Good work." });
  });
  it("reads the claude --output-format json envelope", () => {
    const env = JSON.stringify({ type: "result", result: 'Here: {"score": 12, "feedback": "ok"}' });
    assert.equal(parseDraft(env, 10).score, 10); // clamped to max
  });
  it("reads JSON wrapped in code fences", () => {
    const d = parseDraft('```json\n{"score": 3.5, "feedback": "x"}\n```', 5);
    assert.equal(d.score, 3.5);
  });
  it("throws on garbage", () => {
    assert.throws(() => parseDraft("no json here", 10));
  });
});
