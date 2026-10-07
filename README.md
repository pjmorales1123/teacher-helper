# Teacher Helper

"Never miss student effort." A self-hosted grading helper for DepEd teachers
(DepEd Order 015, s. 2026).

## What it does
- **Teacher** posts activities with competencies, instructions and a rubric.
  Clicks **Pre-score with AI** for a draft score and feedback, or scores by hand.
  Approves every grade. Decides on effort claims for extra points.
- **Student** signs in with ID + PIN, sees required work, status (checked or not)
  and score. Submits by phone camera, scanner-style image upload, or essay text.
  Can file effort claims.
- **Overview** shows what needs attention and exactly who has not submitted
  which activity, with overdue flags. One click pre-scores every pending
  submission of an activity. One click downloads a database backup.
- **Sections**: a picker in the sidebar filters every tab. An activity can be
  for all sections or one section; students only see their own.
- **Students** import from a CSV file (ID, name, section, PIN; header optional).
- **Reports**: click a name in Grades for a printable per-student report.
  Grades export to CSV for the E-Class Record. Activities can be duplicated.
- **Grades** follow DO 015 s. 2026: three terms, WW/PT/EX weights, transmutation.
  Weights and transmutation tables are swappable presets in `src/lib/presets.ts`.
  Formative activities are never counted.
- **AI** runs through the host PC's logged-in `claude` or `codex` subscription
  CLI. No API key anywhere. The AI only drafts; the teacher approves.
- **LEVELS** is a gamified English literacy training ground for junior high
  students reading below grade level. Students take a short placement test,
  then play reading quests (tip → passage → questions with instant feedback),
  earn stars, XP, combos, streaks and badges, chase a daily goal and a weekly
  section leaderboard, review vocabulary on a spaced schedule, and rank up
  (Warrior → Legend) by passing a Challenge. Six ranks map to Grade 3–8
  reading bands; passages are teen-interest "hi-lo" texts. Forty-two built-in quests and challenges ship with the
  app; everything is auto-graded locally (no AI tokens). Teachers see a class
  skill heatmap, per-student detail, can override a level, and can write or
  AI-draft new quests. Grammar Rush, a timed fill-the-blank grammar game
  with a 240-sentence leveled bank, lives on the same screen. See `docs/levels.md`.

## Run
Requirements: Node 22.13 or newer (uses the built-in SQLite driver, no native build).

```sh
cp .env.example .env     # set TEACHER_PASSWORD and AI_BACKEND
npm install
npm start                # http://localhost:3000
```

Students on the same LAN open `http://<teacher-pc-ip>:3000`. For remote
access use Cloudflare Tunnel or Tailscale pointed at that port.

`npm run check` runs the type check and the unit tests.

## Project layout
```
src/server.ts            entry point
src/app.ts               express app, routes, error handler
src/config.ts            .env loading (no secrets in code)
src/db/                  SQLite connection and schema
src/lib/                 grade engine, presets, shared types, http helpers
src/services/ai/         prompt builder + CLI runner (claude / codex)
src/services/auth.ts     cookie sessions: teacher password, student ID + PIN
src/services/storage.ts  image uploads under DATA_DIR/uploads
src/features/            students, activities, submissions, grading, effort-claims, grades
src/levels/              LEVELS: content (JSON quests), validator, engine, progression, routes
src/web/                 static UI (vanilla JS modules, one CSS file)
docs/                    brief and architecture notes
```
Every file stays under 150 lines.

## Data
Everything lives in `DATA_DIR` (default `./data`): `teacher-helper.db` and
`uploads/`. The Overview tab's backup button downloads the database; copy the
`uploads/` folder separately to keep submitted photos.
