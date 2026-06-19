/**
 * Localized crisis resources (plan §3.6: "localized helpline numbers ship
 * in the app bundle"). Region is resolved from the browser locale only —
 * no IP geolocation, no server, nothing logged.
 *
 * Numbers here are verified and must stay that way: a wrong crisis number
 * is actively harmful. Only add a region once its line is confirmed
 * current. Everything unverified falls through to local emergency services
 * + findahelpline.com (which routes to local lines for ~130 countries).
 *
 * Verified 2026-06-14:
 *  - 988 (US & Canada) — call or text, 24/7.
 *  - Samaritans 116 123 (UK & Ireland) — free, 24/7.
 *  - Lifeline 13 11 14 (Australia) — 24/7.
 */

export type CrisisAction = { label: string; href: string };
export type CrisisRegion = { region: string; actions: CrisisAction[] };

export const FIND_A_HELPLINE = "https://findahelpline.com/";

const REGIONS = {
  US: {
    region: "the U.S. & Canada",
    actions: [
      { label: "Call 988", href: "tel:988" },
      { label: "Text 988", href: "sms:988" },
    ],
  },
  GB: {
    region: "the UK & Ireland",
    actions: [{ label: "Call Samaritans — 116 123", href: "tel:116123" }],
  },
  AU: {
    region: "Australia",
    actions: [{ label: "Call Lifeline — 13 11 14", href: "tel:131114" }],
  },
} satisfies Record<string, CrisisRegion>;

// Country subtag (from navigator.language, e.g. "en-GB") → region key.
const COUNTRY_TO_REGION: Record<string, keyof typeof REGIONS> = {
  US: "US",
  CA: "US",
  GB: "GB",
  UK: "GB",
  IE: "GB",
  AU: "AU",
};

/**
 * Best-effort region from the browser's preferred languages. Returns null
 * when we don't have a verified line for that country — the UI then shows
 * the universal emergency + findahelpline guidance.
 */
export function resolveCrisisRegion(): CrisisRegion | null {
  if (typeof navigator === "undefined") return null;
  const langs =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
  for (const lang of langs) {
    const country = lang?.split("-")[1]?.toUpperCase();
    if (country && COUNTRY_TO_REGION[country]) {
      return REGIONS[COUNTRY_TO_REGION[country]];
    }
  }
  return null;
}
