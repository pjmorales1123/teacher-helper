---
kinds: docx
title: ILAW Lesson Plan (format spec)
match: \bILAW\b|intentions|learning experience|ways forward|pre-lesson|learner context|declaration of ai
source: Homeroom format spec, status verified; basis: DepEd ILAW lesson plan form (Annex B of DO 016 s.2026; the order number is unverified in the research), read from the owner's approved DMAJ ILAW file. Research sections "Last round of finds" and "Corrections to our own notes" in FORMAT-RESEARCH-2026-11-02.md. App rules from CLAUDE.md "ILAW lesson plan (AI-05".
---
> Imported from the Homeroom format research (status: verified). Written for that app: where it says the content
> comes from "Code", the "Profile", a "picker" or the "Teacher", in Guro Buddy it comes from the teacher or the open
> document: keep what is there, never invent it, leave a placeholder. Its page setup applies only when the document
> has no format of its own: the teacher's format always wins. Its "free checks" are what to verify before replying.

# ILAW Lesson Plan: how to write it

## What it is and when a teacher uses it
The ILAW lesson plan is DepEd's lesson plan form. It has four big parts: Intentions, Learning Experience, Assessment, and Ways Forward. A teacher uses it for one session or for up to five sessions of the same lesson. Annex B is a guide, not a fixed layout, so a school may use its own Word file with the same parts.

## Page setup
- A4, Arial 12, 1-inch margins.
- Header lines: Republic of the Philippines, Department of Education, Region, Division, School name. All come from the teacher profile, never from AI.
- Title: ILAW LESSON PLAN.
- Multiple sessions: one column per session in the Flow and Assessment rows.
- A school's own uploaded file keeps its own look. Only the bundled file gets the clean look.

## Parts, in order
| Part | What goes in it | Who supplies it | Length and style |
|---|---|---|---|
| Lesson Title | Name of the lesson | Teacher | One line |
| Learning Area/s | Subject | Teacher, profile | One line |
| Name of Teacher/s | Teacher name | Profile | One line |
| Grade Level and Section | Grade and section | Teacher, profile | One line |
| No. of Sessions | 1 to 5 | Teacher | A number |
| References | Books, websites, toolkits | Teacher; AI may suggest | One line per source |
| Declaration of AI use | How AI helped write the plan | Code | Fixed sentence |
| Learning Competency and Curriculum Standards | Competency, content standard, performance standard | Curriculum picker | Copied word for word |
| Learning Objectives | Cognitive, affective, psychomotor | AI | 3 short objectives per session |
| Learner Context | What the teacher sees in the learners | Teacher | Teacher's own words |
| Pre-Lesson | How learners get ready | AI | About 5 minutes of activity |
| Flow | Activities that meet the objectives | AI | 2 to 5 activities with titles and minutes |
| Learning Resources | Materials, with a backup option | AI | A short list |
| Opportunities for integration | Link to another subject, local context or technology | AI | One or two sentences, or N/A |
| Formative Assessment | Task or questions, plus a way to ask for help | AI | 2 to 4 sentences |
| Extended learning opportunities | Learning outside class hours | AI | One or two ideas |
| Reflections | What to change next time | Teacher | Left blank for the teacher |
| Prepared by / Reviewed by / Noted by | Names and positions | Profile, teacher | Blank unless the profile has them |

## How to fill each part
### Lesson Title, Learning Area, Teacher, Grade, Sessions
Plain facts from the form. Do not rewrite them.

### Learning Competency and Curriculum Standards
Copy what the curriculum picker gives. Include the content and performance standards if the picker has them.
- Good: the competency text exactly as in the Budget of Work.
- Bad: "Learners will understand fractions." AI shortened and changed the official wording.

### Learning Objectives
Three objectives per session: cognitive, affective, psychomotor. The cognitive one is the session's step of the main competency. Show as `1. text (Cognitive)`.
- Pattern: "Compare two fractions with unlike denominators (Cognitive)."
- Bad: "Learners will know about fractions." "Know" cannot be observed.

### Learner Context
The teacher writes what they see: strengths, interests, barriers. If empty, leave it empty. AI never invents it.

### Pre-Lesson
Five minutes. A warm-up, a review of the last lesson, or a hook.
- Pattern: "Learners name three fractions they see at home. The teacher writes them on the board."
- Bad: "Get the learners ready." It names no action.

### Flow
2 to 5 activities, each with a title and minutes. Minutes add up to the session length. The last 5 minutes are the wrap-up. Cover: a clear objective, guided practice before solo work, a check of understanding, a link to the past lesson, group work, a reflection question, and inclusion for varied learners.
- Pattern: "Guided Practice (15 min): The teacher models one example. Pairs solve two more and explain to each other."
- Bad: "Learners do activities." No title, no minutes, no action.

### Learning Resources
Name real items a school has. Add one backup.
- Pattern: "Manila paper, markers. Backup: chalk and board."
- Bad: "Projector and a tablet for every learner." Many schools do not have them.

### Opportunities for integration
Link to another subject or the local context. Write N/A if none fits.

### Formative Assessment
One task or short set of questions that matches the cognitive objective, a way for learners to ask for help, and one accommodation.
- Pattern: "Learners solve 3 items on a half sheet. A learner who is stuck raises a card. Learners may answer by drawing."

### Extended learning opportunities
Outside-class ideas that need no purchase.
- Pattern: "Ask a family member to show one fraction used in cooking."

### Reflections
Left for the teacher. AI writes nothing here.

### Declaration of AI use
Code fills it with a fixed sentence: "AI helped draft the activities and wording. The teacher reviewed and edited the plan."

## Writing rules
- One language per plan: English or Filipino, as the teacher chooses.
- Short sentences. Present tense for the teacher's actions ("The teacher shows..."). "Learners" is the subject for learner actions.
- The model writes prose only. Code adds titles, minutes and labels.
- One objective set per session. Each session moves the competency one small step. The last session assesses. A rest session happens only if the teacher's notes say so.
- Minutes per session (default 60) add up across activities. 5 min Pre-Lesson, 5 min wrap-up.
- No blanks (____) for a missing title or text. Name a kind of text, like "a short story the teacher chooses". Blanks are only for learners inside a sentence frame.
- Official headings only: "Pre-Lesson" and "Flow". Never "Lesson Proper" or "Post-Lesson".
- Avoid "understand", "know" and "appreciate" as objective verbs. Avoid filler such as "In this lesson we will".

## Free checks code can run
- Number of sessions is 1 to 5 and matches the number of session columns.
- Every session has exactly 3 objectives, tagged Cognitive, Affective, Psychomotor.
- Each session has 2 to 5 activities, each with a title and minutes.
- Activity minutes sum to the session minutes (code fixes a small mismatch).
- Pre-Lesson is 5 minutes and the wrap-up is 5 minutes.
- Competency, standards and header facts come from the picker and profile, not from AI.
- Required parts are present and not empty (Reflections may be empty).
- No placeholder text (____ outside a sentence frame, TBD, [insert]).
- Heading names match the official list.
- One retry per session when a check fails.

## AI must never write
- School, teacher or signatory names, dates, section names.
- Competency text, content standard, performance standard, codes.
- Learner Context facts or the teacher's Reflections.
- Any fact about the school (rooms, equipment, enrollment).
- Questions about the wording of the topic itself.

## Sample (fictional, for style only)
Grade 4 Mathematics, one session of 60 minutes. School and teacher are placeholders.

| Field | Entry |
|---|---|
| Header | Republic of the Philippines, Department of Education, [Region], [Division], [School Name] |
| Lesson Title | Equivalent Fractions |
| Learning Area/s | Mathematics |
| Name of Teacher/s | [Teacher Name] |
| Grade Level and Section | Grade 4 - [Section] |
| No. of Sessions | 1 |
| References | Grade 4 Mathematics curriculum guide; teacher-made fraction strips |
| Declaration of AI use | AI helped draft the activities and wording. The teacher reviewed and edited the plan. |

| Intentions | |
|---|---|
| Learning Competency and Curriculum Standards | [Copied from the curriculum picker: competency, content standard, performance standard] |
| Learning Objectives | 1. Show that 1/2 equals 2/4 and 3/6 using fraction strips (Cognitive) <br> 2. Share fraction strips fairly with a seatmate (Affective) <br> 3. Fold and cut paper strips into equal parts (Psychomotor) |
| Learner Context | [Teacher to add] |

| Learning Experience | |
|---|---|
| Pre-Lesson (5 min) | The teacher folds a paper in half and asks, "How many equal parts?" Learners name the fraction of each part. |
| Flow | **Modeling (10 min):** The teacher lays a 1/2 strip over two 1/4 strips and shows they cover the same length. <br> **Pair Work (20 min):** Pairs fold strips into 2, 4 and 6 equal parts, shade them, and write the matching fractions. <br> **Share and Check (20 min):** Pairs show one equal pair of fractions on the board and explain how they know. <br> **Wrap-up (5 min):** Learners finish the sentence: "Two fractions are equal when ___." |
| Learning Resources | Paper strips, crayons, scissors. Backup: notebook paper folded by hand. |
| Opportunities for integration | Arts: coloring equal parts in a pattern. |

| Assessment | |
|---|---|
| Formative Assessment | Learners write three pairs of equal fractions on a half sheet, for example 1/2 = 2/4. A learner who is stuck raises a card and the teacher comes. Learners may draw instead of writing. |

| Ways Forward | |
|---|---|
| Extended learning opportunities | Ask a family member to cut a banana or bread into equal parts and name the fractions. |
| Reflections | [Teacher to write after the lesson] |

Prepared by: [Teacher Name], Teacher III. Reviewed by: [Name], MT I. Noted by: [Name], Principal.

## Open points
- DO 016 s.2026 and its Annex B come from third-party notes. The owner should confirm from the signed PDF.
- Conflict: the owner's file says the AI declaration follows "DO 3 s.2026 Annex A"; the research cites DO 016 s.2026. Check which is right.
- Conflict: the research names the third part "Assessing Learning"; the owner's file says "Assessment". This spec follows the owner's file.
- Check whether DO 015 s.2026 changes "quarter" to "term" in the header.
- The owner's file puts Extended learning opportunities and Reflections under Ways Forward. This spec follows it.
