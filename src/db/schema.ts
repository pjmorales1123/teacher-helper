// Database schema. Statements are idempotent so they can run on every start.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS students (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  section    TEXT NOT NULL DEFAULT '',
  pin        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activities (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  component    TEXT NOT NULL CHECK (component IN ('WW','PT','EX')),
  term         INTEGER NOT NULL CHECK (term IN (1,2,3)),
  max_score    REAL NOT NULL CHECK (max_score > 0),
  formative    INTEGER NOT NULL DEFAULT 0,
  competencies TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  rubric       TEXT NOT NULL DEFAULT '',
  due_date     TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS submissions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id    INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  student_id     TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('text','image')),
  content        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'submitted'
                 CHECK (status IN ('submitted','prescored','approved')),
  draft_score    REAL,
  draft_feedback TEXT,
  score          REAL,
  feedback       TEXT,
  submitted_at   TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at    TEXT,
  UNIQUE (activity_id, student_id)
);

CREATE TABLE IF NOT EXISTS effort_claims (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected')),
  points      REAL NOT NULL DEFAULT 0,
  teacher_note TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at  TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_claims_student ON effort_claims(student_id);
`;
