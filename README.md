# Guro Buddy (Teacher Helper)

An AI-first document editor for DepEd teachers. Open Word, Excel and PowerPoint files,
edit them, and ask the AI to draft or fix things. Every AI change is a suggestion you
accept or reject. The AI runs through your own logged-in `claude` (or `codex`) CLI, never an API key.

The grading app from `docs/brief.md` will become a feature of the same backend later.

## What works today
- Upload `.docx`, `.xlsx`, `.pptx` (drag and drop, or the bundled samples).
- Full editors for all three: paginated Word with styles, tables, lists and comments;
  Excel grid with live formulas and multiple sheets; PowerPoint slides with layouts and notes.
- Save creates a new version on disk. History lists every version for download.
- AI sidebar per file: **Edit with AI** (proposes changes) or **Ask only**. Replies stream in.
  - Word: text fixes appear as tracked changes; it can also draft new headings and paragraphs.
  - Excel: cell changes appear as ghost values; formulas and formatting are kept.
  - PowerPoint: text changes appear as slide proposals.
  - **Accept all** / **Reject all** in the sidebar, or decide one by one in the editor.

## Requirements
- Node.js 22.13 or newer.
- The `claude` CLI installed and logged in (run `claude` once in a terminal and sign in).

## Run it
```bash
npm install
```
```bash
npm run build
```
```bash
npm start
```
Then open http://localhost:3000. Files and chat history are stored in `./data`.

For development with hot reload (web on http://localhost:5173):
```bash
npm run dev
```

## Checks
```bash
npm test
```
```bash
npm run typecheck
```
With the app running, a browser smoke test (add `--ai` to include one AI edit):
```bash
npm run smoke
```

## Layout
```
apps/web/            React UI: library, editors (BetterOffice), AI sidebar
  src/editor/        EngineHandle contract + docx/xlsx/pptx adapters
  src/ai/            sidebar, chat state, quick prompts
packages/core/       Fastify server, SQLite (node:sqlite), documents API, AI via CLI
  src/features/ai/   CLI runner, stream parser, prompts, JSON schema
scripts/             sample generator, dev runner, smoke test
docs/                brief, Guro Buddy plan, backbone status
```

## Settings
Copy `.env.example` to `.env` to change the port, data folder, AI backend or model.

See `docs/guro-buddy/06-backbone-status.md` for what is built, what differs from the plan, and known limits.
