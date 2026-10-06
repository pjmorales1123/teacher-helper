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
  section      TEXT NOT NULL DEFAULT '',
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

CREATE TABLE IF NOT EXISTS lv_progress (
  student_id      TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  level           INTEGER NOT NULL DEFAULT 1,
  xp              INTEGER NOT NULL DEFAULT 0,
  streak          INTEGER NOT NULL DEFAULT 0,
  last_active     TEXT,
  placed          INTEGER NOT NULL DEFAULT 0,
  placement_round INTEGER NOT NULL DEFAULT 1,
  reviews         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lv_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quest_id   TEXT NOT NULL,
  level      INTEGER NOT NULL,
  kind       TEXT NOT NULL,
  score      INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  passed     INTEGER NOT NULL,
  results    TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lv_words (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  word       TEXT NOT NULL,
  meaning    TEXT NOT NULL,
  example    TEXT NOT NULL DEFAULT '',
  box        INTEGER NOT NULL DEFAULT 1,
  due        TEXT NOT NULL,
  UNIQUE (student_id, word)
);

CREATE TABLE IF NOT EXISTS lv_badges (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge      TEXT NOT NULL,
  earned_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (student_id, badge)
);

CREATE TABLE IF NOT EXISTS lv_quests (
  id         TEXT PRIMARY KEY,
  level      INTEGER NOT NULL,
  kind       TEXT NOT NULL,
  title      TEXT NOT NULL,
  json       TEXT NOT NULL,
  published  INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lv_attempts_student ON lv_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_claims_student ON effort_claims(student_id);
`;
