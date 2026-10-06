# Teacher Helper
Self-hosted teacher grading app (DepEd DO 015 s. 2026). Status: grading system and LEVELS literacy module built (Node 22 + TypeScript + Express 5 + node:sqlite). `npm start` runs it, `npm run check` typechecks and tests.
Read `docs/brief.md`, `docs/architecture.md` and `docs/levels.md` first. Follow global rules: modular files (<150 lines), no secrets in code, `.env` only.
Constraints: AI via subscription CLI (`claude -p` / `codex exec`), never an API key. Teacher approves every grade; AI only drafts.
