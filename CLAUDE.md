# Teacher Helper
Self-hosted teacher grading app (DepEd DO 015 s. 2026). Status: design phase, no code.
Read `docs/brief.md` first. Follow global rules: modular files (<150 lines), no secrets in code, `.env` only.
Constraints: AI via subscription CLI (`claude -p` / `codex exec`), never an API key. Teacher approves every grade; AI only drafts.
