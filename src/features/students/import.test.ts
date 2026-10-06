import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../../db/connection.ts";
import { importStudents, splitCsvLine } from "./import.ts";
import { listStudents } from "./repo.ts";

describe("splitCsvLine", () => {
  it("handles quotes and tabs", () => {
    assert.deepEqual(splitCsvLine('1,"Cruz, Juan",7-A,1234'), ["1", "Cruz, Juan", "7-A", "1234"]);
    assert.deepEqual(splitCsvLine("1\tAna\t7-B\t5678"), ["1", "Ana", "7-B", "5678"]);
  });
});

describe("importStudents", () => {
  it("skips a header row and reports bad lines", () => {
    const db = openDatabase(":memory:");
    const r = importStudents(db, "﻿Student ID,Name,Section,PIN\n1,Ana,7-A,1234\n,NoId,7-A,1\n2,Ben,7-A,12\n3,Cy,7-B,\n");
    assert.equal(r.imported, 2);
    assert.deepEqual(r.skipped.map((s) => s.line), [3, 4]);
    assert.deepEqual(listStudents(db).map((s) => s.id), ["1", "3"]);
  });
});
