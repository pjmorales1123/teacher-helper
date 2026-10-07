// Loads the built-in Grammar Rush banks (one JSON file per tier) and validates them at startup.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BANK_MIN, GRAMMAR_TIERS } from "./meta.ts";
import type { GrammarBank } from "./types.ts";
import { validateBank } from "./validate.ts";

export const GRAMMAR_DIR = join(dirname(fileURLToPath(import.meta.url)), "content");

export type Banks = Map<number, GrammarBank>;

/** Throws on a bad or missing tier so the server refuses to start half-configured. */
export function loadBanks(dir = GRAMMAR_DIR): Banks {
  const banks: Banks = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const { bank, errors } = validateBank(JSON.parse(readFileSync(join(dir, file), "utf8")));
    if (!bank) throw new Error(`Grammar bank ${file}: ${errors.join("; ")}`);
    if (bank.items.length < BANK_MIN) throw new Error(`Grammar bank ${file}: needs at least ${BANK_MIN} items`);
    if (banks.has(bank.tier)) throw new Error(`Grammar bank ${file}: duplicate tier ${bank.tier}`);
    banks.set(bank.tier, bank);
  }
  for (const t of GRAMMAR_TIERS) if (!banks.has(t.tier)) throw new Error(`Grammar bank for tier ${t.tier} (${t.name}) is missing`);
  return banks;
}
