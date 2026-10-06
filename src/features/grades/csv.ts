// CSV export of grade reports, one row per student, for the E-Class Record.
import type { StudentReport } from "./report.ts";

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function reportsToCsv(reports: StudentReport[]): string {
  const header = ["Student ID", "Name", "Section"];
  for (const t of [1, 2, 3]) {
    header.push(`T${t} WW %`, `T${t} PT %`, `T${t} EX %`, `T${t} Initial`, `T${t} Transmuted`);
  }
  header.push("Final");
  const lines = [header.map(cell).join(",")];
  for (const r of reports) {
    const row: unknown[] = [r.studentId, r.name, r.section];
    for (const t of r.terms) {
      const g = t.grade;
      row.push(...g.components.map((c) => c.percentage));
      row.push(g.complete ? g.initialGrade : "", g.complete ? g.transmutedGrade : "");
    }
    row.push(r.finalGrade);
    lines.push(row.map(cell).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}
