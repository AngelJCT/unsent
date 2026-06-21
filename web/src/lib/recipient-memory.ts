/**
 * Recipient memory (Pro) — the app gets sharper the longer you use it.
 *
 * Per recipient role, an optional private note ("who they are / the
 * history") plus the last goal chosen. Lives ONLY on this device in
 * localStorage; the note is the only thing that ever rides along in the
 * single engine proxy call, bounded and treated as data (never an
 * instruction). No message text is stored here — just the note you wrote.
 *
 * Keyed by the five CategoryId roles; the custom "other" recipient shares
 * one slot (acceptable for v1 — named profiles are a later option).
 */
import type { CategoryId } from "@/lib/tokens";

const MEMORY_KEY = "unsent.recipient-memory:v1";
const NOTE_MAX = 120;

export type RecipientMemory = {
  note?: string;
  lastGoal?: string;
  updatedAt: string;
};

type MemoryMap = Partial<Record<CategoryId, RecipientMemory>>;

function readMap(): MemoryMap {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MemoryMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: MemoryMap) {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(map));
  } catch {
    // Private browsing / disabled storage — memory just doesn't persist.
  }
}

export function getRecipientMemory(category: CategoryId | null): RecipientMemory {
  if (!category) return { updatedAt: "" };
  return readMap()[category] ?? { updatedAt: "" };
}

/** Save (or clear, when blank) the private note for a recipient role. */
export function setRecipientNote(category: CategoryId | null, note: string) {
  if (!category) return;
  const trimmed = note.trim().replace(/\s+/g, " ").slice(0, NOTE_MAX);
  const map = readMap();
  const prev = map[category] ?? { updatedAt: "" };
  map[category] = {
    ...prev,
    note: trimmed || undefined,
    updatedAt: new Date().toISOString(),
  };
  writeMap(map);
}

/** Remember the most recent goal chosen for a recipient role. */
export function rememberLastGoal(category: CategoryId | null, goal: string | null) {
  if (!category || !goal) return;
  const map = readMap();
  const prev = map[category] ?? { updatedAt: "" };
  map[category] = {
    ...prev,
    lastGoal: goal,
    updatedAt: new Date().toISOString(),
  };
  writeMap(map);
}
