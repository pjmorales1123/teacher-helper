# Teacher Helper
Guro Buddy: AI-first docx/xlsx/pptx editor for DepEd teachers, plus the planned grading app (DO 015 s. 2026). Status: working backbone (web + core), no Tauri shell yet.
Read `docs/brief.md` first, then `docs/guro-buddy/00-overview.md` for the desktop editor plan. Follow global rules: modular files (<150 lines), no secrets in code, `.env` only.
Run: `npm install && npm run build && npm start`. Tests: `npm test`, `npm run typecheck`, `npm run smoke`.
Constraints: AI via subscription CLI (`claude -p` / `codex exec`), never an API key; the one exception is the optional voice (Gemini Live, `GEMINI_API_KEY` in `.env`, owner-approved), which only talks and hands edits to the CLI. Teacher approves every grade; AI only drafts.
