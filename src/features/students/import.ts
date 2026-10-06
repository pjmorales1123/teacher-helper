// CSV import of students. Accepts "id, name, section, pin" rows, with or
// without a header row, quoted fields, and either comma or tab separators.
import type { Db } from "../../db/connection.ts";
import { upsertStudent } from "./repo.ts";

export interface ImportResult {
  imported: number;
  skipped: { line: number; reason: string }[];
}

/** Split one CSV line into trimmed cells, honouring double quotes. */
export function splitCsvLine(line: string): string[] {
  const sep = line.includes("\t") && !line.includes(",") ? "\t" : ",";
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { cells.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function isHeader(cells: string[]): boolean {
  const first = (cells[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return ["id", "studentid", "lrn", "no", "number"].includes(first);
}

export function importStudents(db: Db, text: string): ImportResult {
  const result: ImportResult = { imported: 0, skipped: [] };
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  lines.forEach((raw, index) => {
    if (!raw.trim()) return;
    const cells = splitCsvLine(raw);
    if (index === 0 && isHeader(cells)) return;
    const [id = "", name = "", section = "", pin = ""] = cells;
    const lineNo = index + 1;
    if (!id || !/^[A-Za-z0-9-]+$/.test(id)) return void result.skipped.push({ line: lineNo, reason: "bad or missing ID" });
    if (!name) return void result.skipped.push({ line: lineNo, reason: "missing name" });
    if (pin && !/^\d{4,12}$/.test(pin)) return void result.skipped.push({ line: lineNo, reason: "PIN must be 4-12 digits" });
    upsertStudent(db, { id, name, section, pin });
    result.imported++;
  });
  return result;
}
