# Backbone status (Phase 0 spike + first slice)

Built and verified on 2026-11-03 in Chromium against the real `claude` CLI.
No Tauri shell yet: the app runs as a local web server plus browser tab.

## What runs
| Area | State |
| - | - |
| Upload, list, rename, delete `.docx` `.xlsx` `.pptx` | Done, validated as real OOXML zips |
| Open and edit all three formats | Done with BetterOffice 0.5.1 React editors |
| Save as new version, version history, download | Done, every version kept on disk |
| AI sidebar, Ask and Edit modes, streamed replies | Done, about 4 to 7 s per turn on `sonnet` |
| Word AI edits | Tracked-change proposals in paragraphs, plus new styled paragraphs |
| Excel AI edits | Cell proposals shown as ghost values, formulas preserved |
| PowerPoint AI edits | Text proposals inside existing lines |
| Accept all / Reject all | Done for all three; reject restores the original exactly |
| Chat history per file | Stored in SQLite, last 6 turns sent as context |

Verified round trips, checked by reopening the saved files with python-docx, openpyxl and python-pptx:
- Word: typed edit saved; AI spelling fixes accepted; headings, table and list styles intact; no stray revision marks.
- Word drafting: a new `Heading 1` section plus body paragraph added, accepted and saved.
- Excel: AI filled eight empty cells; `SUM` and `ROUND` formulas, bold header and fill kept.
- PowerPoint: AI retitled slide 1; layouts kept.

## Spike result: BetterOffice
Passed for the backbone. It renders the DepEd-style samples faithfully, exposes version-checked
reads and edits, and has a host proposal API for all three formats. Keep the `EngineHandle`
contract (`apps/web/src/editor/engine.ts`) as the seam in case an engine must be swapped.

Engine limits found, and how the code handles them:
- **Word:** new paragraphs cannot be tracked insertions. The adapter inserts empty styled
  paragraphs, fills them through normal proposals, and deletes them again if rejected.
- **PowerPoint:** no line breaks in proposed or direct text edits, so the AI cannot add bullets
  or slides yet. The prompt tells the AI this, and it explains the manual step to the teacher.
- **Excel:** proposals are per batch, not per cell; the editor's proposals panel decides them.

## Deviations from the plan
- **SQLite** uses Node's built-in `node:sqlite` instead of `better-sqlite3`. No native build,
  which keeps the future single-executable sidecar simple. It prints an experimental warning.
- **AI tools:** the plan's MCP tool server is not built yet. Each turn sends a compact snapshot
  of the document with ids, and the CLI returns edits through `--json-schema`. This is faster
  (one call, no tool round trips) and fine for documents up to a few hundred pages.
  MCP tools remain the path for very large files and cross-file work.
- **Sessions:** no `--resume`. Each turn is stateless with a short history, which keeps token use
  predictable on Pro plans.
- **CLI flags used:** `-p --output-format stream-json --include-partial-messages --tools ""`
  `--setting-sources "" --no-session-persistence --system-prompt --json-schema`, run in an empty
  working folder under `DATA_DIR` so project files never reach the model.

## Known gaps (next steps)
1. Tauri shell, installer and file associations (Phase 1 in `05-roadmap.md`).
2. Per-launch token on the local API; today it relies on binding to `127.0.0.1`.
3. Codex adapter is written but untested (no `codex` CLI in the test environment).
4. Citations that jump to a paragraph or cell from the chat.
5. New bullets and slides in PowerPoint once the engine allows paragraph breaks.
6. Voice grading (whisper.cpp sidecar) and the grading features from the brief.
7. Blank "New document" templates; today every file starts from an upload.
