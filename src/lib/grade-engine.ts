// Pure grade computation. No database access, so it is easy to test.
// Method (DepEd E-Class Record):
//   percentage score  = total raw / total highest possible * 100
//   weighted score    = percentage score * component weight / 100
//   initial grade     = sum of weighted scores
//   transmuted grade  = lookup via the active transmutation preset
import type { TransmutationPreset, WeightPreset } from "./presets.ts";
import type { Component } from "./types.ts";
import { COMPONENTS } from "./types.ts";

export interface ScoredItem {
  component: Component;
  score: number;
  maxScore: number;
}

export interface ComponentResult {
  component: Component;
  raw: number;
  highestPossible: number;
  percentage: number | null; // null when the component has no items yet
  weight: number;
  weighted: number;
}

export interface GradeResult {
  components: ComponentResult[];
  initialGrade: number;
  transmutedGrade: number;
  passing: boolean;
  complete: boolean; // every component has at least one item
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Map an initial grade (0-100) to a transmuted grade using a preset. */
export function transmute(initial: number, preset: TransmutationPreset): number {
  const ig = Math.min(100, Math.max(0, initial));
  const { passingInitial: p, minTransmuted: lo, passingTransmuted: pass } = preset;
  if (ig >= p) {
    const span = 100 - p;
    const t = span === 0 ? 100 : pass + ((ig - p) * (100 - pass)) / span;
    return Math.round(t);
  }
  // Below passing: spread [0, p) across [lo, pass), never reaching pass
  const t = Math.round(lo + (ig / p) * (pass - lo));
  return Math.min(pass - 1, t);
}

/**
 * Compute a grade from scored items. `extraPoints` is a per-component bonus
 * (approved effort claims) added to the raw total, capped so raw never
 * exceeds the highest possible score.
 */
export function computeGrade(
  items: readonly ScoredItem[],
  weights: WeightPreset,
  transmutation: TransmutationPreset,
  extraPoints: Partial<Record<Component, number>> = {},
): GradeResult {
  const components = COMPONENTS.map((component): ComponentResult => {
    const own = items.filter((i) => i.component === component);
    const highestPossible = own.reduce((s, i) => s + i.maxScore, 0);
    const base = own.reduce((s, i) => s + i.score, 0);
    const raw = Math.min(highestPossible, base + (extraPoints[component] ?? 0));
    const weight = weights.weights[component];
    const percentage = highestPossible > 0 ? round2((raw / highestPossible) * 100) : null;
    const weighted = percentage === null ? 0 : round2((percentage * weight) / 100);
    return { component, raw, highestPossible, percentage, weight, weighted };
  });
  const initialGrade = round2(components.reduce((s, c) => s + c.weighted, 0));
  const transmutedGrade = transmute(initialGrade, transmutation);
  return {
    components,
    initialGrade,
    transmutedGrade,
    passing: transmutedGrade >= transmutation.passingTransmuted,
    complete: components.every((c) => c.percentage !== null),
  };
}
