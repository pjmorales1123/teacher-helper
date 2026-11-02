# AI layer: driving the subscription CLI like Claude for M365 does

## Principles
1. The CLI is the agent loop. We do not reimplement one.
2. The app exposes the open document to the CLI as **tools** over MCP.
3. Every write tool creates a **proposal**, never a direct edit.
4. One CLI session per open document, resumed across turns.

## Process model
```
UI "send" --> guro-core /chat --> spawn
  claude -p --output-format stream-json --input-format stream-json
            --verbose --include-partial-messages
            --resume <session_id>              (after first turn)
            --mcp-config <tmp.json>            (our MCP server, stdio)
            --strict-mcp-config
            --allowedTools "mcp__guro__*"      (no Bash, no Edit, no Write)
            --permission-mode default --permission-prompts none
            --append-system-prompt-file <role prompt>
            --add-dir <skills folder>          (DepEd skills)
```
- Never `--bare` (it drops subscription login).
- `stream-json` events are relayed to the UI over WebSocket: text
  deltas, tool calls (shown as "Reading section 3…"), and the final
  `result` with `session_id`, which we store per document.
- `codex exec` adapter: same interface, uses `--json` output and
  `-c mcp_servers.guro=...` config. Feature parity is best-effort.
- Keep one warm process per document when `--input-format stream-json`
  is used, so follow-ups do not pay the spawn cost. Kill after 10 min
  idle; `--resume` brings it back.

## MCP tools exposed by guro-core (`src/features/tools/`)
Read (safe, auto-allowed):
- `doc.outline()` headings/slides/sheets with stable ids.
- `doc.read(range)` text or cells with ids for citations.
- `doc.selection()` what the teacher highlighted.
- `doc.styles()` paragraph styles, slide layouts, number formats.
- `doc.find(query)` semantic search over an FTS index of the file.
- `doc.comments()` comment threads with anchors.
- `sheet.trace(cell)` formula and precedents (Excel "walk me through").
- `roster.list(class)` names and ids for voice grading.

Propose (always reviewable):
- `doc.propose_replace(range, text)` lands as tracked change.
- `doc.propose_insert(after, blocks)` inherits style of neighbour.
- `sheet.propose_set(cells)` with "overwrite warning" if non-empty.
- `slides.propose_add(layout, content)` from the deck's own master.
- `slides.propose_chart(data, type)` native chart object.
- `comment.propose_reply(thread, text)`.
- `grades.propose(entries)` for the voice workflow.

Every proposal has `{id, kind, before, after, citation, turn_id}` and is
stored in SQLite. UI shows them inline (tracked-change style) and in a
"Changes from Claude" list with Accept / Reject / Accept all in turn.

## Citations
Tool results include `ref` ids (`p:42`, `Sheet1!C42`, `slide:7`). The
system prompt instructs the model to cite them as `[ref]`; the UI turns
them into click-to-navigate chips, matching the add-in behaviour.

## Instructions, Skills, Modes
- **Instructions** per document type (Word-like, Sheet-like, Deck-like)
  stored in settings and appended to the system prompt.
- **Built-in skills** shipped in `skills/`: DepEd DLL format, DO 015
  grading rules, action-research outline, PH English/Filipino register.
  Teachers can add their own `SKILL.md`.
- **Modes**: Ask (read-only tools), Edit (proposals on), Grade (voice
  workflow tools). Mode sets `--allowedTools`.

## Structured outputs
For parsing (voice grades, rubric scoring) use a second short call:
`claude -p --output-format json --json-schema <schema>`; read
`structured_output`, treat absence as a failure, and show the raw text.

## Usage and cost control
- Subscription limits are shared with the teacher's normal Claude use.
  Show a visible "AI used this session" counter from `result` events.
- Send only what is needed: outline first, then `doc.read` of the
  relevant range. Never dump a whole 40-page file into the prompt.
- Resume sessions so context is not re-sent; auto-compact by starting a
  new session with a summary after N turns (mirrors the add-in).
- Model choice exposed (`--model sonnet` default, `opus` on request).

## Failure handling
- CLI not found: setup wizard offers the official installer command and
  a "Log in" button that opens a terminal running `claude`.
- Not logged in / rate limited: parse `system/api_retry` and the error
  in `result`; show a plain-language message and a retry timer.
- Process crash: proposals already streamed stay; the turn is marked
  failed; `--resume` on next send.
