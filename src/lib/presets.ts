// Swappable grading data: component weights and transmutation rules.
// Based on DepEd Order 015, s. 2026. Edit these tables, not the engine.
import type { Component } from "./types.ts";

export interface WeightPreset {
  id: string;
  label: string;
  weights: Record<Component, number>; // must sum to 100
}

export interface TransmutationPreset {
  id: string;
  label: string;
  /** Initial grade that maps to the passing transmuted grade. */
  passingInitial: number;
  /** Lowest transmuted grade (initial grade of 0 maps here). */
  minTransmuted: number;
  /** Transmuted grade that marks passing. */
  passingTransmuted: number;
}

export const WEIGHT_PRESETS: readonly WeightPreset[] = [
  {
    id: "standard",
    label: "Standard subjects (WW 20 / PT 50 / EX 30)",
    weights: { WW: 20, PT: 50, EX: 30 },
  },
  {
    id: "epp-tle-mapeh",
    label: "EPP / TLE / MAPEH (WW 20 / PT 60 / EX 20)",
    weights: { WW: 20, PT: 60, EX: 20 },
  },
];

export const TRANSMUTATION_PRESETS: readonly TransmutationPreset[] = [
  {
    id: "sy2026-27",
    label: "SY 2026-27: initial grade 70 transmutes to 75",
    passingInitial: 70,
    minTransmuted: 60,
    passingTransmuted: 75,
  },
  {
    id: "legacy-60",
    label: "Legacy (DO 8 s. 2015): initial grade 60 transmutes to 75",
    passingInitial: 60,
    minTransmuted: 60,
    passingTransmuted: 75,
  },
  {
    id: "zero-based",
    label: "Zero-based: transmuted grade equals initial grade",
    passingInitial: 75,
    minTransmuted: 0,
    passingTransmuted: 75,
  },
];

export const DEFAULT_WEIGHT_PRESET = "standard";
export const DEFAULT_TRANSMUTATION_PRESET = "sy2026-27";

export function findWeightPreset(id: string): WeightPreset {
  return WEIGHT_PRESETS.find((p) => p.id === id) ?? WEIGHT_PRESETS[0]!;
}

export function findTransmutationPreset(id: string): TransmutationPreset {
  return TRANSMUTATION_PRESETS.find((p) => p.id === id) ?? TRANSMUTATION_PRESETS[0]!;
}
