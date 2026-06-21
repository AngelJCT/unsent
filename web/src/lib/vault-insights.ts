/**
 * Compounding Vault insights (Pro) — what your almost-sends reveal,
 * computed entirely on-device from entry METADATA. No message text is
 * read here: only counts, recipient role, status, and timestamps. This
 * is introspection, not engagement-bait — the value accrues the longer
 * the Vault grows, which is the retention story without daily-use loops.
 */
import type { CategoryId } from "@/lib/tokens";
import type { VaultEntry } from "@/lib/vault";

export type VaultInsights =
  | { enough: false; total: number }
  | {
      enough: true;
      total: number;
      kept: number;
      letGo: number;
      /** Share you chose NOT to send (0–100). */
      restraintPct: number;
      /** The role you almost-send to most. */
      hardest: { category: CategoryId; count: number } | null;
      /** Most salient time pattern, e.g. "late at night" / "on weekends". */
      when: string | null;
      /** An old entry worth resurfacing ("a while back you almost…"). */
      resurfaced: VaultEntry | null;
    };

const INSIGHT_MIN = 3;
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

export function computeVaultInsights(entries: VaultEntry[]): VaultInsights {
  const total = entries.length;
  if (total < INSIGHT_MIN) return { enough: false, total };

  const kept = entries.filter((e) => e.status === "kept").length;
  const letGo = entries.filter((e) => e.status === "burned").length;
  const restraintPct = Math.round((letGo / total) * 100);

  // Hardest recipient — the role that pulls the most almost-sends.
  const byCat = new Map<CategoryId, number>();
  for (const e of entries) {
    byCat.set(e.recipientCategory, (byCat.get(e.recipientCategory) ?? 0) + 1);
  }
  let hardest: { category: CategoryId; count: number } | null = null;
  for (const [category, count] of byCat) {
    if (!hardest || count > hardest.count) hardest = { category, count };
  }

  // When — the most salient timing, if one dominates.
  let lateNight = 0;
  let weekend = 0;
  for (const e of entries) {
    const d = new Date(e.createdAt);
    if (Number.isNaN(d.valueOf())) continue;
    const h = d.getHours();
    if (h >= 22 || h < 5) lateNight++;
    const day = d.getDay();
    if (day === 0 || day === 6) weekend++;
  }
  let when: string | null = null;
  if (lateNight / total >= 0.5) when = "late at night";
  else if (weekend / total >= 0.5) when = "on weekends";

  // "A while back" — surface the oldest entry only if it's genuinely old.
  const oldest = [...entries].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  )[0];
  const resurfaced =
    oldest && Date.now() - Date.parse(oldest.createdAt) >= NINETY_DAYS
      ? oldest
      : null;

  return {
    enough: true,
    total,
    kept,
    letGo,
    restraintPct,
    hardest,
    when,
    resurfaced,
  };
}
