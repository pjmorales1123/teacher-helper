// Skill mastery per level and the "what should I play next" picker. Pure functions.
import { LEVEL_SKILLS, MASTERY_NEED, MASTERY_WINDOW, SKILLS, type Strand } from "./meta.ts";
import type { BestRow } from "./repo.ts";
import type { ItemResult, Quest } from "./types.ts";

export interface SkillMastery {
  skill: string;
  label: string;
  strand: Strand | "";
  recent: boolean[]; // last MASTERY_WINDOW results on this skill at this level, oldest first
  correct: number; // correct answers inside the window
  need: number;
  mastered: boolean;
}

/** Mastery of every focus skill of `level`, from that level's attempt results in chronological order. */
export function skillMastery(level: number, resultsOldestFirst: readonly (readonly ItemResult[])[]): SkillMastery[] {
  const focus = LEVEL_SKILLS[level] ?? [];
  const history = new Map<string, boolean[]>(focus.map((s) => [s, []]));
  for (const results of resultsOldestFirst) {
    for (const r of results) history.get(r.skill)?.push(r.correct);
  }
  return focus.map((skill) => {
    const recent = (history.get(skill) ?? []).slice(-MASTERY_WINDOW);
    const correct = recent.filter(Boolean).length;
    return {
      skill, label: SKILLS[skill]?.label ?? skill, strand: SKILLS[skill]?.strand ?? "",
      recent, correct, need: MASTERY_NEED, mastered: correct >= MASTERY_NEED,
    };
  });
}

export function allMastered(mastery: readonly SkillMastery[]): boolean {
  return mastery.length > 0 && mastery.every((m) => m.mastered);
}

export interface NextUp {
  questId: string;
  title: string;
  skill: string | null;
  reason: string;
}

function itemsOn(q: Quest, skill: string): number {
  return q.items.filter((i) => i.skill === skill).length;
}

/**
 * Picks the quest that helps most right now: the weakest unmastered skill, then a quest
 * with the most items on it that the student has not beaten yet (new first, then retries).
 * Once every skill is mastered it points at the Challenge; when that is beaten, at the lowest-starred quest.
 */
export function nextUp(quests: readonly Quest[], challenge: Quest | undefined, mastery: readonly SkillMastery[], bests: Map<string, BestRow>): NextUp | null {
  const open = [...mastery].filter((m) => !m.mastered).sort((a, b) => a.correct - b.correct);
  for (const m of open) {
    const ranked = quests
      .filter((q) => itemsOn(q, m.skill) >= 2)
      .map((q) => ({ q, best: bests.get(q.id), n: itemsOn(q, m.skill) }))
      .sort((a, b) => Number(Boolean(a.best?.passed)) - Number(Boolean(b.best?.passed))
        || (a.best?.tries ?? 0) - (b.best?.tries ?? 0) || b.n - a.n || a.q.order - b.q.order);
    const pick = ranked[0];
    if (!pick) continue;
    const verb = pick.best ? "Sharpen" : "Build";
    return { questId: pick.q.id, title: pick.q.title, skill: m.skill, reason: `${verb} ${m.label.toLowerCase()} · ${m.correct}/${m.need} locked in` };
  }
  if (challenge && !bests.get(challenge.id)?.passed) {
    return { questId: challenge.id, title: challenge.title, skill: null, reason: "Every skill mastered. Take the Challenge to rank up." };
  }
  const weakest = [...quests].sort((a, b) => (bests.get(a.id)?.best ?? 0) / Math.max(1, bests.get(a.id)?.total ?? a.items.length)
    - (bests.get(b.id)?.best ?? 0) / Math.max(1, bests.get(b.id)?.total ?? b.items.length))[0];
  return weakest ? { questId: weakest.id, title: weakest.title, skill: null, reason: "Go for three stars." } : null;
}
