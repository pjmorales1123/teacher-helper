import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reportsToCsv } from "./csv.ts";
import { computeGrade } from "../../lib/grade-engine.ts";
import { findTransmutationPreset, findWeightPreset } from "../../lib/presets.ts";

describe("reportsToCsv", () => {
  it("writes a header and one quoted row per student", () => {
    const grade = computeGrade([], findWeightPreset("standard"), findTransmutationPreset("sy2026-27"));
    const csv = reportsToCsv([
      { studentId: "1", name: 'Ana "Nene" Cruz, Jr.', section: "7-A", finalGrade: null,
        terms: [1, 2, 3].map((term) => ({ term: term as 1 | 2 | 3, grade })) },
    ]);
    const [header, row] = csv.trim().split("\r\n");
    assert.equal(header?.split(",").length, 19);
    assert.ok(row?.startsWith('1,"Ana ""Nene"" Cruz, Jr.",7-A,'));
  });
});
