// Content store: built-in quest files plus published custom quests from the DB.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "../db/connection.ts";
import type { Quest, QuestKind } from "./types.ts";
import { validateQuest } from "./validate.ts";

export const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "content");

/** Loads and validates every *.json quest in a directory. Throws on the first bad file. */
export function loadBuiltIn(dir = CONTENT_DIR): Quest[] {
  const quests: Quest[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const raw: unknown = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const { quest, errors } = validateQuest(raw);
    if (!quest) throw new Error(`LEVELS content ${file}: ${errors.join("; ")}`);
    if (quests.some((q) => q.id === quest.id)) throw new Error(`LEVELS content ${file}: duplicate id ${quest.id}`);
    quests.push(quest);
  }
  return quests;
}

export interface ContentStore {
  all(): Quest[];
  get(id: string): Quest | undefined;
  forLevel(level: number, kind: QuestKind): Quest[];
  placement(): Quest[];
}

interface CustomRow {
  id: string;
  json: string;
}

/** Built-in quests are read once; published custom quests are read per call (they change). */
export function createContentStore(db: Db, builtIn: Quest[]): ContentStore {
  const base = new Map(builtIn.map((q) => [q.id, q]));
  const byOrder = (a: Quest, b: Quest) => a.order - b.order || a.id.localeCompare(b.id);

  function custom(): Quest[] {
    const rows = db.prepare("SELECT id, json FROM lv_quests WHERE published = 1").all() as unknown as CustomRow[];
    const out: Quest[] = [];
    for (const row of rows) {
      const { quest } = validateQuest(JSON.parse(row.json));
      if (quest) out.push({ ...quest, custom: true });
    }
    return out;
  }

  const all = (): Quest[] => {
    const merged = new Map(base);
    for (const q of custom()) merged.set(q.id, q); // custom overrides a built-in with the same id
    return [...merged.values()].sort(byOrder);
  };

  return {
    all,
    get: (id) => all().find((q) => q.id === id),
    forLevel: (level, kind) => all().filter((q) => q.level === level && q.kind === kind),
    placement: () => all().filter((q) => q.kind === "placement"),
  };
}
