# v1 workflows, end to end

## 1. Editing a document
1. Teacher opens `lesson-plan.docx` (file association or File > Open).
   Engine loads in WASM; FTS index is built in a worker.
2. Sidebar shows "Ask about this document" with suggested prompts:
   "Check the objectives against the MELCs", "Tighten the motivation
   section", "Fill the Assessment table in this template's style".
3. Teacher selects a paragraph and types "make this simpler for Grade 4".
4. guro-core sends the turn; the CLI calls `doc.selection()` and
   `doc.styles()`, then `doc.propose_replace`.
5. The paragraph shows strike-through old text and underlined new text.
   Teacher presses Accept. The engine applies it as a real revision so
   the file still shows tracked changes if opened in Word.
6. "Work through my comments" runs the comment loop: each thread gets a
   proposal plus a reply proposal.
7. Save writes `.docx` in place, with a timestamped backup in
   `DATA_DIR/backups/` (keeps last 10 per file).

Acceptance criteria: round-trip a DepEd DLL template through open, edit,
save and reopen in Word 2016+ with formatting intact.

## 2. Drafting a research paper
1. New from template: "Action Research (DepEd)" or "Thesis chapter".
   Templates are `.docx` files in `templates/` with real styles.
2. Teacher fills a short form: title, research questions, participants,
   method. Or dictates it (same voice path as workflow 3).
3. "Draft outline" produces heading proposals only. Teacher reorders.
4. "Draft section" per heading, one at a time, each in the template's
   paragraph styles via `doc.propose_insert`. The model is told to put
   `[CITATION NEEDED: claim]` placeholders instead of inventing sources.
5. Sidebar "Sources" panel: teacher pastes references; the AI formats
   them in APA via a structured call and proposes the reference list.
6. "Consistency check" skill: defined terms, numbering gaps, tense,
   passive voice, Filipino/English register. All as proposals.

Out of scope for v1: live literature search. Later, an optional
connector (e.g. Scite/CrossRef) can be added as an MCP server that the
CLI already knows how to use.

## 3. Recording student grades by voice
1. Teacher opens the class record `.xlsx` (DepEd E-Class Record) and
   picks the sheet and the column for today's item (e.g. "WW3").
   The app reads the roster from the sheet, or from the class roster in
   SQLite if the grading app is set up.
2. Press and hold the mic (or space bar). Audio is captured in the
   webview, chunked, and sent to the whisper sidecar. Transcript appears
   live: "dela Cruz, Juan, 18 … Reyes, Maria, 20 … Santos, Ana, absent".
3. On release, guro-core calls the CLI with `--json-schema`:
   `{entries:[{name, score|null, flag}]}` plus `roster.list()` for
   matching. Fuzzy name match (Filipino surname-first order) is done in
   code, not by the model, and ambiguities are flagged.
4. Review table: name, heard score, match confidence, warnings
   (score above max, duplicate, unmatched). Teacher fixes inline.
5. "Write to sheet" creates `sheet.propose_set` for the chosen column.
   Non-empty cells trigger the overwrite warning. Accept writes them;
   formulas (totals, transmutation) recompute in the engine.
6. The grade ledger in SQLite records who, what, when, and the audio
   file path, so an entry can be re-listened to later.

Acceptance criteria: 30 names in under 2 minutes with at most one
correction on a quiet room recording; zero writes without Accept.

## Shared UX rules
- Nothing the AI does is applied silently. Proposals expire with the
  turn if not accepted and can be reopened from history.
- Every turn shows what the AI read (tool call list) so the teacher
  can trust the answer.
- Works offline for everything except the AI turn and the whisper
  model download.
