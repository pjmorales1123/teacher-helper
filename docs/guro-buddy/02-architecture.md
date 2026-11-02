# Architecture and technology choices

Goal: fast startup, small install, works offline except for the AI
call, and one codebase that also serves the grading app from the brief.

## Big picture
```
+------------------------------------------------------------------+
| Desktop shell: Tauri 2 (Rust) ........ Windows NSIS installer     |
|  +-------------------------------+  +---------------------------+ |
|  | Webview (WebView2)            |  | Sidecars (externalBin)     | |
|  |  React + TypeScript UI        |  |  guro-core (Node 22 SEA)   | |
|  |  Editor engine (WASM)         |  |  whisper (whisper.cpp CLI) | |
|  |  AI sidebar                   |  +---------------------------+ |
|  +-------------------------------+                                 |
+------------------------------------------------------------------+
            | localhost HTTP + WebSocket         | spawn
            v                                    v
   guro-core: Fastify + SQLite ----------> `claude -p` / `codex exec`
   (documents, chat, grades, LAN server       (teacher's own login)
    for students, MCP tool server)
```

## Shell: Tauri 2
- Small installer (tens of MB vs Electron's 100+), low RAM, native
  file dialogs, single-instance, auto-updater plugin, NSIS packaging with
  the WebView2 bootstrapper (or the ~127 MB offline WebView2 installer
  for schools without internet at install time).
- Windows 10/11 first. macOS/Linux builds come free later.
- Rust side stays thin: window, tray, file associations (`.docx`,
  `.xlsx`, `.pptx`), spawning and supervising sidecars, mic permission.
- Known gotcha: NSIS may not replace a sidecar on same-version
  reinstall (tauri issue 15134). Mitigation: version-stamp sidecar file
  names and bump on every release.
- Fallback if WebView2 rendering of the editor proves inconsistent:
  Electron with the same React app. Keep the UI free of Tauri-only APIs
  by routing all native calls through a `platform/` adapter.

## Frontend: React 19 + TypeScript + Vite
- State: Zustand (small, no boilerplate). Routing: TanStack Router.
- UI kit: shadcn/ui + Tailwind, keyboard-first, high contrast option.
- Layout mirrors Office: ribbon-lite toolbar, document canvas, right
  sidebar for AI chat, bottom status bar (save state, AI state, usage).
- Everything heavy (parsing, layout, diff) runs in Web Workers or WASM
  so typing never stutters.

## Editor engine: BetterOffice behind an adapter (decision pending spike)
- **Primary candidate: BetterOffice** (github.com/openooxml/betteroffice,
  Apache-2.0). Native OOXML engines in Rust compiled to WASM, React
  packages `@betteroffice/docx-react`, `xlsx-react`, `pptx-react`, and
  built-in agent proposals shown as tracked changes with accept/reject.
  Font packs (Carlito/Caladea/Liberation) match Office pagination.
  Risk: young project (0.5.x, ~330 stars). Must survive a 1-week spike
  on real DepEd files (DLL templates, E-Class Record xlsx, school decks).
- **Fallback per format** if the spike fails:
  - Word: Tiptap (ProseMirror) + `docx` npm for export, `mammoth` for
    import. Loses fidelity on complex layouts; fine for lesson plans.
  - Excel: Univer sheets (Apache-2.0, mature formula engine, xlsx I/O).
  - PowerPoint: own slide canvas on Konva + `pptxgenjs` export, pptx
    import via our own OOXML reader (limited to text, images, charts).
- Either way, code talks to a `DocumentAdapter` interface:
  `read(range)`, `cite(ref)`, `propose(change)`, `accept(id)`,
  `reject(id)`, `styles()`, `save()`. The AI layer never touches the
  engine directly, so swapping engines does not touch the AI code.

## Backend: guro-core (Node 22 + TypeScript)
- Packaged as a Node **single executable application** (SEA) so no Node
  install is needed on the teacher's PC.
- Fastify HTTP + WebSocket on `127.0.0.1:<random port>`; the port is
  handed to the webview by Tauri at launch, with a per-launch token so
  other local apps cannot call it.
- The same server, when "Class mode" is on, listens on the LAN for the
  student app from the brief (ID + PIN login).
- Modules (`src/features/*`, each file < 150 lines):
  `documents`, `chat`, `ai` (CLI adapters), `tools` (MCP server),
  `voice`, `grades`, `activities`, `submissions`, `effort-claims`.
- Storage: SQLite via `better-sqlite3`, WAL mode, in `DATA_DIR`.
  Documents stay as files on disk; SQLite holds chats, proposals log,
  grade ledger, rosters, settings. Full-text search via FTS5.
- Background jobs: a tiny in-process queue (p-queue). No Redis.

## Voice: whisper.cpp sidecar
- `whisper-cli` binary + a quantized `small` or `medium` model (Tagalog
  and English are in Whisper's language list; Taglish accuracy is
  unbenchmarked, so the spike must measure it on real teacher audio).
- Model is downloaded on first use (≈500 MB for medium q5) and cached;
  an "offline bundle" installer variant ships it inline.
- Audio never leaves the machine. Only the transcript goes to the CLI.

## Security and privacy
- No app account, no telemetry by default, no API keys anywhere.
- Documents are opened read-only by the AI tools; writes happen only via
  accepted proposals applied by the editor.
- LAN server: HTTPS optional via Tailscale/Cloudflare Tunnel as in the
  brief; rate-limited login; student data scoped per class.
- Prompt-injection posture: document text is always sent as data inside
  a delimited block, and tools are proposal-only, so an injected
  instruction can at worst produce a bad proposal the teacher rejects.

## Performance budget
| Metric | Target |
| - | - |
| Cold start to editable blank doc | < 2 s on an i3/8 GB laptop |
| Open 40-page docx | < 1.5 s |
| Keystroke to paint | < 16 ms (engine in WASM, AI off main thread) |
| First AI token after send | < 4 s (CLI spawn reused via resume) |
| Installer size | < 80 MB without whisper model |
