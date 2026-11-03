# Roadmap, spikes, risks, open decisions

## Phase 0: spikes (2 weeks, throwaway code)

**Status:** BetterOffice and the `claude -p` streaming path passed; see `06-backbone-status.md`.
Whisper and Tauri packaging spikes are still open.
| Spike | Pass condition |
| - | - |
| BetterOffice on real files | Opens 10 DepEd docx/xlsx/pptx samples with acceptable fidelity; propose/accept API works; WASM load < 1 s |
| `claude -p` + MCP + resume | Stream tokens to a React page; tool call round-trip < 300 ms; `--resume` keeps context; works with Pro login |
| whisper.cpp on Taglish | Word error rate on 20 teacher clips; `small` vs `medium` q5 on i3/8 GB CPU time |
| Tauri NSIS + Node SEA sidecar | Installer < 80 MB, cold start < 2 s, sidecar updates on reinstall |

If BetterOffice fails, switch to the per-format fallbacks in
`02-architecture.md` and keep the `DocumentAdapter` contract.

## Phase 1: Word editor + AI sidebar (6 weeks)
- Shell, guro-core, SQLite, settings, setup wizard (detect/install CLI,
  log in, pick model).
- docx open/edit/save, tracked-change proposals, citations, comments,
  Instructions, three built-in skills.
- Workflow 1 ships. Internal alpha with 3 teachers.

## Phase 2: Sheets + voice grading (5 weeks)
- xlsx engine, cell citations, formula trace, overwrite protection.
- Whisper sidecar, push-to-talk, review table, grade ledger.
- Workflow 3 ships. Transmutation presets from the brief reused.

## Phase 3: Slides + research drafting (5 weeks)
- pptx engine, layout-aware slide proposals, native charts.
- Templates, outline-first drafting, consistency-check skill.
- Workflow 2 ships.

## Phase 4: merge the grading app (4 weeks)
- Activities, submissions, effort claims and student LAN app from the
  brief move in as feature modules of guro-core. Pre-score uses the same
  AI adapter. Approved grades flow into the open class record.

## Risks
- **Engine maturity.** BetterOffice is early. Mitigated by the adapter
  and the spike gate.
- **Subscription limits.** Heavy teachers may hit Pro limits. Mitigated
  by outline-first reads, resume, visible usage counter, model choice.
- **CLI drift.** Flags and event shapes change between Claude Code
  versions. Pin a tested minimum version, feature-detect via the
  `system/init` capabilities array, and keep the adapter under test
  with recorded stream fixtures.
- **Taglish transcription.** Unknown accuracy. Mitigated by the review
  table and by letting the teacher correct the roster match once; the
  correction is remembered.
- **Low-end hardware.** WASM + whisper on CPU. Measure in Phase 0.

## Open decisions (need the owner's call)
1. BetterOffice vs fallbacks, after the spike numbers are in.
2. Ship whisper model inline (bigger installer) or download on first use.
3. Default model for drafting (`sonnet` for speed vs `opus` for quality).
4. Whether Guro Buddy and the student app ship as one installer.
5. App name and installer signing (unsigned NSIS triggers SmartScreen).

## Repo layout once code starts
```
apps/desktop/        Tauri shell (Rust), tauri.conf.json, binaries/
apps/web/            React UI, editor adapters, AI sidebar
packages/core/       guro-core: Fastify, SQLite, features/*, tools/*
packages/ai/         CLI adapters (claude, codex), stream parser
packages/grade-engine/ DO 015 rules, transmutation presets
skills/              built-in SKILL.md files
templates/           .docx/.xlsx/.pptx starters
docs/                this plan, the brief, ADRs
```
