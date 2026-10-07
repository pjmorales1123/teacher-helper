// Picks what a student should play next from their mastery evidence. Pure.
import { isEvidence, type SkillMastery } from "./mastery.ts";
import type { BestRow } from "./repo.ts";
import type { Quest } from "./types.ts";

export interface NextUp {
  questId: string;
  title: string;
  skill: string | null;
  reason: string;
}

interface Pick { q: Quest; unplayed: boolean; noHint: boolean }

/** Passages that could add evidence for a skill: not played today, and (unless the skill is shaky) not yet passed on it. */
function candidates(quests: readonly Quest[], m: SkillMastery, today: string): Pick[] {
  const ev = new Map(m.evidence.map((e) => [e.questId, e]));
  return quests
    .filter((q) => isEvidence(q, m.skill))
    .filter((q) => { const e = ev.get(q.id); return !e || (e.day !== today && (m.state === "shaky" || !e.passed)); })
    .map((q) => ({ q, unplayed: !ev.has(q.id), noHint: q.tip?.skill !== m.skill }));
}

function choose(c: Pick[], wantNoHint: boolean): Pick | undefined {
  const score = (p: Pick) => (p.noHint === wantNoHint ? 2 : 0) + (p.unplayed ? 1 : 0);
  return [...c].sort((a, b) => score(b) - score(a) || a.q.order - b.q.order)[0];
}

/**
 * Priority: a shaky skill (needs one more no-hint pass) → the skill with the fewest passes
 * (tip passage first when it has none, then no-hint passages), avoiding the skill played
 * last so practice interleaves → the Challenge once everything is mastered → nothing.
 */
export function nextUp(quests: readonly Quest[], challenge: Quest | undefined, mastery: readonly SkillMastery[], bests: Map<string, BestRow>, lastSkill: string | null, today: string): NextUp | null {
  const open = mastery.filter((m) => !m.mastered);
  const ordered = [...open].sort((a, b) => Number(b.state === "shaky") - Number(a.state === "shaky") || a.passes - b.passes
    || Number(a.skill === lastSkill) - Number(b.skill === lastSkill));
  for (const m of ordered) {
    const c = candidates(quests, m, today);
    const pick = m.state === "shaky" ? choose(c, true) : choose(c, m.passes > 0 || m.noHintPass ? true : false);
    if (!pick) continue;
    const left = m.need - m.passes;
    const reason = m.state === "shaky" ? `${m.label}: slipped on the last text. One more pass, no hint.`
      : `${m.label}: ${left} more ${left === 1 ? "text" : "texts"}${!m.noHintPass && m.passes >= m.need - 1 ? ", no hint" : ""}${pick.noHint ? " · no hint on this one" : ""}`;
    return { questId: pick.q.id, title: pick.q.title, skill: m.skill, reason };
  }
  if (open.length) return null;
  if (challenge && !bests.get(challenge.id)?.passed) {
    return { questId: challenge.id, title: challenge.title, skill: null, reason: "Every skill mastered. Take the Challenge to rank up." };
  }
  return null;
}
