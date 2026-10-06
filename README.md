# Teacher Helper

"Never miss student effort." A self-hosted grading helper for DepEd teachers.

## What it does
- Teacher uploads competencies, instructions and a rubric for each posted activity.
- Students see required submissions, check status and score. They submit by phone camera, a dedicated scanner camera, or essay text.
- Students can file effort claims for extra points. The teacher approves them.
- Teacher clicks **Pre-score** (AI draft score and comments) or scores manually, then approves.
- Grades follow DepEd Order 015, s. 2026 (WW/PT/EX weights, transmutation) as swappable presets.
- AI runs through the host PC's logged-in `claude` or `codex` subscription CLI, not an API.

## Status
Design phase. See `docs/brief.md`. No code yet.

## Planned structure
```
src/features/   activities, submissions, grading, effort-claims
src/services/   ai adapter (claude/codex CLI), storage
src/lib/        grade engine, transmutation presets
```

## Run
Not yet available.
