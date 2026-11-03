# Voice assistant: Gemini talks, Claude edits

## Why two models
A live voice needs a speech-to-speech model with low latency and barge-in; real editing needs the document engine
and a strong agent. So the work is split:

| Part | Runs | Does |
|---|---|---|
| **Gemini Live** (talker) | Browser ↔ Google, with a one-use token | Listens, talks back, decides when to call a tool |
| **Claude via the CLI** (worker) | This computer, `claude -p --model haiku` | Reads the document and stages the edits as suggestions |
| **Guro Buddy** | Browser + local server | Runs the tools, shows captions, keeps approval |

Gemini's `edit_document` tool is declared `NON_BLOCKING`, so the voice keeps talking while Claude works
(10–40 s); the result comes back with `scheduling: WHEN_IDLE` and the voice says what changed. Gemini 3.x Live models
only take blocking calls; the app detects them and declares the tools blocking (the voice then waits silently).

## Tools the voice has
`edit_document(request)`, `read_document()`, `apply_changes()` (only after a clear yes), `discard_changes()`,
`check_result()` (the view step), `save_document()`. Every spoken edit goes through the same chat turn as typed
ones (`voice: true` → `GURO_VOICE_MODEL`, a note that names and numbers may be misheard, a short reply), so it shows in
the chat and in the document as suggestions. Grades are still only written after the teacher approves.

## Keys and privacy
- `GEMINI_API_KEY` in `.env` (owner-approved exception to "no API keys"). The server mints a one-use, 30-minute
  ephemeral token (`authTokens.create`, v1alpha); the key never reaches the browser.
- Audio goes to Google while the conversation is on (the Talk button is red). Documents go to Gemini only when it calls
  `read_document`; edits are done by Claude.
- Without a key the Talk button is disabled with the reason.

## Model choice
`GEMINI_LIVE_MODEL` pins one; otherwise the server lists the key's models with `bidiGenerateContent` and prefers
native-audio 2.5 (async tools). `GURO_VOICE_MODEL=haiku` by default; `sonnet` for complex layout work.

## Testing without a key
`scripts/mock-gemini-live.mjs` speaks the Live WebSocket protocol: it "hears" `MOCK_SAY`, calls `edit_document`, then
`apply_changes`. `scripts/voice-scenario.cjs` drives the app with a fake microphone. Verified: "Put Cruz, Ana's WW3
score as 18 and Reyes, Carla's as 16" → Haiku staged both cells in 4.5 s → spoken "yes" applied them → totals and
PS recalculated → saved file has 18 and 16. Not yet verified: a real Gemini session (no key or network access in the
build environment), and Taglish recognition quality.
