# Guro Buddy: AI-first document editor for teachers

**Status:** plan (no code). Companion to the grading app in `docs/brief.md`.

## One-line pitch
An installable desktop app (Windows first) that opens, edits and saves
`.docx`, `.xlsx` and `.pptx` files, with a Claude-style AI sidebar that
behaves like Claude for Microsoft 365: it reads the open file, cites
where it looked, proposes edits as tracked changes, and never applies a
change without the teacher accepting it.

## Problem statement
Claude for Microsoft 365 is excellent but hard for an ordinary DepEd
teacher to get: it needs a Microsoft 365 work/school account, AppSource
access that many tenants block, a recent Office build, and a paid
Claude plan. We are **not** fixing that install path. We are building a
separate editor where AI is the first-class feature and the teacher's
own `claude` (or `codex`) subscription CLI is the brain.

## Non-negotiables (from CLAUDE.md and the brief)
- AI goes through the logged-in subscription CLI (`claude -p`,
  `codex exec`). Never an API key in the app.
- The teacher approves everything the AI produces: edits, grades, extra
  points. AI only drafts.
- Modular code, files under 150 lines. No secrets in code, `.env` only.
- Fast and reliable on a typical school laptop (8 GB RAM, no GPU,
  intermittent internet).

## Target workflows (v1)
1. **Edit a document** (lesson plan, memo, DLL, test paper) with
   tracked-change proposals, section citations, template-aware drafting.
2. **Draft a research paper / action research** from an outline, in the
   document's own styles, with citation placeholders the teacher fills.
3. **Record grades by voice** into the class record sheet: push-to-talk,
   offline transcription, AI parses names and scores into a review table,
   teacher confirms, cells are written.

## Documents in this folder
| File | What it covers |
| - | - |
| `01-research-claude-m365.md` | What Claude for M365 actually does, feature by feature, and what we copy |
| `02-architecture.md` | Shell, frontend, backend, storage, packaging, and why |
| `03-ai-layer.md` | How the CLI is driven, document tools, proposals, sessions, limits |
| `04-workflows.md` | The three v1 workflows end to end |
| `05-roadmap.md` | Phases, spikes, risks, open decisions |

## Relationship to Teacher Helper (grading app)
Same repo, same Node/TypeScript + SQLite backend, same AI adapter. The
grading server from the brief becomes one feature module of the Guro
Buddy backend. The desktop shell hosts both the editor and the local
LAN server students connect to.
