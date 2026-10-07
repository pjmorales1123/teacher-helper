# LEVELS — the literacy training ground

LEVELS is the second half of Teacher Helper: a gamified English practice system
where students "play" their way up reading levels. It is remediation that does
not feel like remediation.

**Audience.** Junior high school students (Grade 7–10) whose English reading
is below their grade, often at a Grade 3–5 level. Everything is written as
"hi-lo" text: low readability, high interest. Passages are about tryouts,
part-time work, rap battles, OFW parents, dance crews, barangay politics,
never about lost slippers or a Grade 3 classroom. Students see rank names,
never a grade band, and their level is private: classmates only ever see XP. Everything in LEVELS is auto-graded on the server
(no AI tokens are spent when students play). The subscription CLI is used only
when the teacher asks for a *draft* of a new quest, and the teacher edits and
publishes it.

## Pedagogy the design follows

| Principle | Where it shows up |
|---|---|
| Leveled text (readability matched to a grade band) | Six levels; passages get longer, sentences more complex, vocabulary rarer |
| Mastery learning (Bloom): advance only after demonstrated mastery | Each rank names four focus skills. A skill is mastered when the student passes its items (at most one miss) on **three different passages, at least one of which did not teach that skill in its tip**. The Challenge unlocks only then, and still needs 80 % |
| Transfer, not priming: uncued evidence | A passage where the skill is only a secondary set of items (no hint) must be among the three; the Challenge has no tips at all |
| Adaptive, interleaved sequencing | "Next up" serves a shaky skill first, then the skill with fewest passes (tip passage first, then no-hint passages), avoids repeating the skill just played, and never offers a passage played today |
| Question–Answer Relationships (Raphael): right-there → think-and-search → author-and-me | Skill tags move from `details` to `inference`/`theme` as levels rise |
| Tier-2 vocabulary with context clues and morphology (Beck, McKeown) | Each quest introduces 2–3 words used in the passage; `context-clues` and `word-parts` items |
| Spaced retrieval practice (Leitner boxes) | Word Review: words return at 1, 3, 7, 14, 30 days; wrong answers reset |
| Immediate corrective feedback | Every item is checked at once and explains *why* |
| Interleaving within a level | Challenges mix all three strands |
| Placement before practice | Short adaptive placement test (3 items per level, stop when a level is failed) |
| Motivation: autonomy, competence, progress visibility (self-determination theory) | Free choice of quest order, stars, XP, streaks, badges, a visible map |

## Ranks (students see names, teachers see the band)

| Level | Rank | ≈ Band | Passage length | Style |
|---|---|---|---|---|
| 1 | Warrior | Grade 3 | 90–130 words | short simple sentences, concrete events |
| 2 | Elite | Grade 4 | 130–170 | compound sentences, simple inference |
| 3 | Master | Grade 5 | 170–210 | paragraphs with topic sentences, cause/effect |
| 4 | Grandmaster | Grade 6 | 210–260 | informational + narrative, author's purpose |
| 5 | Epic | Grade 7 | 250–300 | abstract ideas, point of view, evidence |
| 6 | Legend | Grade 8 | 290–350 | argument, theme, figurative language |

Rank names follow the ladder every Filipino teen knows from mobile games, so
"Warrior" reads as a starting rank, not as "Grade 3".

A student who holds Level 2 in the app has repeatedly shown Grade-4-band
comprehension on unseen passages, which is what transfers to real assessments.

## Strands and skills

- **Vocabulary**: `context-clues`, `word-parts`, `synonyms`, `multiple-meaning`
- **Comprehension**: `main-idea`, `details`, `sequence`, `cause-effect`, `inference`, `summary`
- **Analysis**: `purpose`, `point-of-view`, `compare`, `evidence`, `theme`, `figurative`

Every item carries one skill tag. Accuracy per skill drives the teacher's
heatmap and the "practice this" hint a student gets after a failed Challenge.

## Content model

Built-in content lives in `src/levels/content/*.json`, one file per quest,
validated at startup (a bad file stops the server with the reason). Custom
quests written or AI-drafted by the teacher live in the `lv_quests` table and
are merged in when published.

```json
{
  "id": "l1-q1", "level": 1, "kind": "quest", "order": 1,
  "title": "The Lost Slipper",
  "tip": { "skill": "details", "title": "Right there", "text": "..." },
  "passage": { "title": "...", "text": "..." },
  "words": [{ "word": "muddy", "meaning": "...", "example": "..." }],
  "items": [
    { "id": "i1", "type": "mc", "skill": "details", "prompt": "...", "choices": ["a","b","c","d"], "answer": 0, "why": "..." },
    { "id": "i2", "type": "order", "skill": "sequence", "prompt": "...", "steps": ["first","then","last"], "why": "..." },
    { "id": "i3", "type": "short", "skill": "context-clues", "prompt": "...", "accept": ["answer", "alt"], "why": "..." }
  ]
}
```

`kind` is `quest`, `challenge` (one per level, 10 mixed items, no tip) or
`placement` (items carry their own `level`). Item types: `mc` (one correct
choice), `order` (arrange steps; sent shuffled), `short` (typed, matched
case/punctuation-insensitively against `accept`).

## Progression rules

- Placement: rounds of 3 items from level 1 up. Pass a round with 2/3; the
  first failed round stops the test. Placed at the last passed level (min 1).
  The teacher can override any student's level.
- Quest: pass at ≥ 70 %. Stars: 1 ≥ 70 %, 2 ≥ 85 %, 3 = 100 %. Replays allowed;
  best score kept.
- Skill mastery (evidence model): every rank has four focus skills
  (`LEVEL_SKILLS` in `meta.ts`). A passage is *evidence* for a skill when it
  carries ≥ 3 items on it (≥ 2 in a Challenge). The student's latest counted
  attempt on each passage gives a pass (at most one miss) or a fail. Mastered =
  3 passed passages, one of them "no-hint" (the skill was not the passage's tip),
  and the most recent evidence was a pass. A later fail on a no-hint passage or
  the Challenge drops the skill to **shaky**: one more pass restores it. A
  same-day replay of a passage is practice: it changes no evidence and, if the
  passage was already passed, earns no XP. Five passes mark the skill "sharp".
- Content shape (enforced by tests and the validator): six quests + one
  Challenge per rank. Every quest teaches one focus skill in its tip and is
  evidence for **three** focus skills (≥ 3 items on each, 9–10 items in all);
  at most two items per passage are not multiple choice. The Challenge has 12
  items, 3 per focus skill. Four skills × 3 texts = 12 passes, and each quest
  supplies 3, so a student who reads well masters a rank in **four** of the
  six texts; every focus skill has ≥ 4 evidence passages (≥ 2 no-hint), so a
  weak text can be skipped. A shaky skill may be recovered by replaying a
  passed no-hint text on a later day. Multiple-choice options are reordered on every play and
  graded by text.
- Next up: shaky skill → a no-hint passage for it; else the skill with the
  fewest passes → its tip passage if it has none, otherwise a no-hint
  passage (unplayed before retried); the skill played last is deprioritised so
  practice interleaves; passages played today are never offered. When every
  skill is mastered it points at the Challenge; afterwards the stories list
  becomes "Train more".
- Challenge: unlocked when all four focus skills are mastered. Pass at ≥ 80 %
  → rank up. Fail → shows the weakest skills with other stories that train them.
- Failed passage-skill on the tip skill: the result screen shows the evidence
  per skill (counts / not yet), re-shows the strategy tip, and offers a
  different story on the weak skill.
- XP: 10 per correct item, +5 combo bonus for the third and every later
  correct answer in an unbroken run, +25 first pass of a quest, +50 passing a
  Challenge, 5 per correct word review. XP never goes down.
- Daily goal: 50 XP, shown as a bar on the home screen. A streak the student
  has not yet kept today is flagged "play today to keep it".
- Weekly leaderboard: per section, XP earned in the last 7 days only, so a
  new or struggling student can reach the top any week. Ranks and reading
  levels are never shown to classmates. The teacher can switch it off
  (`lv_leaderboard` setting).
- Celebrations: correct answers pulse, wrong ones shake, a combo counter
  shows runs, and clearing a quest or ranking up drops confetti. Honors
  `prefers-reduced-motion`.
- Streak: consecutive calendar days (server local date) with at least one
  finished quest, challenge or review.
- Word bank: a quest's words are added on first completion (box 1, due today).
  Review shows up to 10 due words as meaning multiple-choice. Correct → next
  box (1→3→7→14→30 days). Wrong → box 1, due tomorrow.
- Badges: First Quest, Perfect Quest, 3-Day Streak, 7-Day Streak, Level Up
  (per level), Word Keeper (10 words in box 5), Reviewer (10 review sessions),
  Flawless Challenge.

## Grammar Rush (grammar game)

A fast fill-in-the-blank game that lives on the LEVELS home screen. Each run
is 10 sentences with one blank and four choices, 3 hearts (a wrong answer or a
timeout costs one), 15 seconds per sentence, keys 1–4 on a keyboard.

- Bank: `src/levels/grammar/content/g{1..6}.json`, 40 items per tier,
  validated at startup (`grammar/validate.ts`): one `___` blank, four distinct
  choices, one correct, a one-sentence rule in `why`, topic ids from
  `grammar/meta.ts`. Tiers reuse the rank names and ladder:
  Warrior (subject–verb agreement, pronouns, articles, plurals), Elite
  (indefinite/compound agreement, possessives and homophones, basic tenses,
  prepositions), Master (irregular past, pronoun case, adjective vs adverb,
  comparison, conjunctions), Grandmaster (perfect tenses, tricky agreement,
  modals, pronoun–antecedent), Epic (conditionals, passive, relative pronouns,
  reported speech), Legend (subjunctive, advanced agreement, parallel
  structure, mixed conditionals, perfect modals).
- Draw: each run picks 10 items leaning toward the topics the student gets
  wrong (unseen topics count as 60 %), never the same item as the last two
  runs, at most 4 per topic.
- Scoring: 5 XP per correct answer plus up to 5 speed bonus, multiplied ×2
  from a 3-streak and ×3 from a 6-streak; +30 the first time a tier is
  cleared. Clearing = 8 of 10 with a heart left; it unlocks the next tier.
  Grammar XP counts toward the daily goal, streak and leaderboard but is
  capped at 150 XP per day so it cannot be farmed (runs still count for best
  scores). Badges: Rush Rookie (first clear), Perfect Rush (10/10, all hearts).
- Teacher: class topic heatmap, runs per tier, a bank browser by tier and
  topic, and per-student tier/best/topic accuracy on the student page.
- Grammar Rush is separate from reading rank: a student can be Warrior in
  reading and Master in grammar.

## Data model

`lv_progress(student_id PK, level, xp, streak, last_active, placed,
placement_round)`, `lv_attempts(id, student_id, quest_id, level, kind, score,
total, passed, results JSON, created_at)`, `lv_words(id, student_id, word,
meaning, example, box, due, UNIQUE(student_id, word))`, `lv_badges(student_id,
badge, earned_at)`, `lv_xp_log(id, student_id, day, xp)`, `lv_quests(id PK, level, kind, title, json, published,
updated_at)`, `lv_grammar_runs(id, student_id, tier, score, total, xp, hearts, results JSON, created_at)`.

## API

Student (`/api/student/levels`): `GET /home`, `GET /placement`,
`POST /placement`, `GET /quests/:id`, `POST /quests/:id/check`,
`POST /quests/:id/submit`, `GET /review`, `POST /review`,
`GET /grammar`, `POST /grammar/run/start`, `POST /grammar/run/answer`,
`POST /grammar/run/finish`.

Teacher (`/api/levels`): `GET /meta`, `PUT /settings`, `GET /overview?section=`, `GET /students/:id`,
`PUT /students/:id/level`, `GET /content`, `GET /content/:id`,
`PUT /content/:id`, `DELETE /content/:id`, `POST /content/validate`,
`POST /content/draft` (CLI draft, never auto-published),
`GET /grammar/overview?section=`, `GET /grammar/bank`, `GET /grammar/students/:id`.

## Progress checklist

- [x] Schema, validator, loader
- [x] Content: levels 1–6 (6 quests + 1 challenge each = 42 passages) + placement
- [x] Skill mastery as passage evidence (3 texts, one no-hint, shaky), next-up picker, shuffled choices (tested)
- [x] SVG art: rank shields, badge medals, strand icons, wordmark
- [x] Grammar Rush: 240-item leveled bank, hearts/timer/streak game, teacher views
- [x] Engine + progression + words + badges (tested)
- [x] Student API
- [x] Teacher API (+ AI draft)
- [x] Student UI
- [x] Teacher UI
- [x] End-to-end verification, docs

## Ideas for later (not built)

- Retention probes: a week after a rank-up, slip 3 items per old-rank skill
  into new-rank quests; a fail marks the skill shaky and queues an old-rank
  no-hint passage.
- Skill drill after two consecutive fails on the same skill (5 items reused
  from played passages, worked example first).
- Quarterly paper test entered by the teacher and compared with mastery per
  skill, to recalibrate the rank definitions against real assessments.

- Fluency: timed reading with words-per-minute self-report.
- Printable quest sheets for students without a device.
- Class leaderboard (opt-in, by section) and weekly goals.
- Import/export of custom quests as a JSON bundle for sharing between teachers.
