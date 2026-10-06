# Architecture notes

## Stack
Node 22 + TypeScript run directly (`node src/server.ts`, type stripping),
Express 5, SQLite via `node:sqlite`. No build step, one runtime dependency.

## Request flow
1. `src/web` pages call `/api/*` with `fetch`. Sessions are an HttpOnly cookie
   mapped to an in-memory table (restart signs everyone out).
2. Feature routers validate input with `src/lib/http.ts` helpers and throw
   `HttpError`; the app-level handler turns errors into `{ error }` JSON.
3. Repos are thin SQL functions over one shared `DatabaseSync` connection.

## Grading
`src/lib/grade-engine.ts` is pure. For each term and component:
`PS = raw / highest possible * 100`, `WS = PS * weight / 100`,
`IG = sum(WS)`, transmuted via the active preset. Approved effort-claim
points are added to the component raw score, capped at the highest possible.
Only `status = 'approved'` submissions on non-formative activities count.
The final grade is the average of complete terms' transmuted grades.

Transmutation presets are parametric (passing initial → 75, floor 60) so the
SY 2026-27 "70 → 75" rule and a later zero-based rule are both data.

## Sections
`students.section` is free text. `activities.section` is '' (every section)
or one section name. The teacher's picker sends `?section=` to list endpoints
(`src/lib/section.ts`); student endpoints always scope to the student's own
section. New columns are added by `migrate()` in `src/db/connection.ts`.

## AI pre-score
`src/services/ai/cli.ts` spawns `claude -p --output-format json` or
`codex exec` with the prompt on stdin. Image submissions pass the file path
(claude: `--allowedTools Read`; codex: `--image`). The reply is parsed for a
`{score, feedback}` object and stored as a draft; nothing is a grade until the
teacher clicks Approve.

## Open items (from the brief)
- Verify the component percentage method against the official E-Class Record.
- Confirm the extra-points policy (currently: added to raw score, capped).
- Student login is ID + PIN as proposed.
