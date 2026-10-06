import type { Db } from "../../db/connection.ts";
import type { Student } from "../../lib/types.ts";

export type PublicStudent = Omit<Student, "pin">;

export function listStudents(db: Db): PublicStudent[] {
  return db
    .prepare("SELECT id, name, section, created_at FROM students ORDER BY section, name")
    .all() as unknown as PublicStudent[];
}

export function getStudent(db: Db, id: string): Student | undefined {
  return db.prepare("SELECT * FROM students WHERE id = ?").get(id) as unknown as Student | undefined;
}

export function upsertStudent(db: Db, s: { id: string; name: string; section: string; pin: string }): void {
  db.prepare(
    `INSERT INTO students (id, name, section, pin) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, section = excluded.section,
       pin = CASE WHEN excluded.pin = '' THEN students.pin ELSE excluded.pin END`,
  ).run(s.id, s.name, s.section, s.pin);
}

export function deleteStudent(db: Db, id: string): boolean {
  return db.prepare("DELETE FROM students WHERE id = ?").run(id).changes > 0;
}
