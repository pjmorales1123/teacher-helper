# Research: what Claude for Microsoft 365 is

Sources: Anthropic's office-agents docs for Word, Excel, PowerPoint and
cross-app work (claude.com/docs/office-agents/*), the AppSource listing,
and the `claude -p` headless docs (code.claude.com/docs/en/headless).
Checked 2026-11-02.

## Product shape
- A **task-pane add-in** per app (Word, Excel, PowerPoint; Outlook beta).
  One chat sidebar beside the document. Same Claude account, same usage
  limits as claude.ai. Paid plans only (Pro, Max, Team, Enterprise).
- It can only see **files that are currently open**. It cannot open,
  create, close or switch files.
- Per-app **persistent Instructions** field in settings (tone, citation
  style, formatting conventions). **Skills** and **connectors** from the
  Claude account apply inside the add-in.
- Long chats **auto-compact** into new conversations. Chat history is
  stored locally (IndexedDB), not synced.
- Before a risky operation it **asks for confirmation**. Docs warn about
  prompt injection from untrusted documents.

## Word features
- Q&A about the document with **clickable section citations**.
- **Edit selected text** while preserving surrounding styles, numbering
  and formatting. New text inherits paragraph style.
- **Tracked changes mode**: every AI edit lands as a revision the user
  accepts or rejects in the native review pane. Undo works.
- **Comment-driven editing**: reads comment threads, edits the anchored
  text, replies with what it changed.
- Summarize counterparty redlines; **fill templates** in the document's
  heading and paragraph styles; tables populate in place.
- **Semantic navigation**: "find every passage about X" with click-to-go.
- Reads text, comments, tracked changes, footnotes, tables, bookmarks.

## Excel features
- Q&A with **cell-level citations** that navigate to the cell.
- Update values while **keeping formula relationships intact**.
- Build or populate models and templates from a description.
- Debug `#REF!`, `#DIV/0` with root-cause tracing.
- Native ops: sort, filter, pivot edits, conditional formatting, data
  validation dropdowns. **Overwrite protection** warns before clobbering.
- Not supported: data tables, macros/VBA.

## PowerPoint features
- Reads the **slide master, layouts, fonts, colors** and generates slides
  that comply with the template.
- Pinpoint edits to one slide; full-deck generation from a prompt.
- Bullets to **native, editable charts and diagrams**, not images.
- Restructure, reorder, merge slides; agenda slides from structure.

## Cross-app
- One conversation can read Excel and write Word or PowerPoint. Context
  carries across (no re-explaining the model). Toggle per add-in.

## CLI facts that matter for us (`claude -p`)
- `--output-format stream-json --verbose --include-partial-messages`
  streams tokens; last line is a `result` with `session_id` and cost.
- `--input-format stream-json` gives bidirectional streaming in print
  mode. `--resume <id>` continues a session; `--continue` the latest.
- `--json-schema` returns validated `structured_output`.
- `--mcp-config` attaches our own tool server; `--allowedTools` and
  `--permission-mode` gate what runs. `--append-system-prompt` adds
  instructions. `--add-dir` loads skills from a folder.
- **Do not use `--bare`**: it skips subscription login and needs an API
  key. We must run the normal `-p` path with the teacher's login.
- Usage: per the Oct 7 2026 support note, `claude -p` signed in with a
  Claude plan still **draws from the subscription's limits**. Pro has no
  separate credit. Budget prompts accordingly (see `03-ai-layer.md`).

## What we copy, what we change
| Keep | Change |
| - | - |
| Sidebar chat beside the file | Our own editor, no Office needed |
| Citations that jump to section/cell/slide | Same, in our editor |
| Tracked-change proposals, accept/reject | Same, plus "accept all" per turn |
| Per-app Instructions, Skills | Ship DepEd skills built in |
| Only open files are visible | Same rule, plus explicit "attach file" |
| Confirm risky ops | Our tools are proposal-only, so nothing is risky |
| Cloud account + usage limits | Teacher's own CLI login, no app account |
| Chat history local | Same, in SQLite |
