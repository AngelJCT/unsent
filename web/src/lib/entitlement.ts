/**
 * Entitlement source of truth (plan §5, Phase 2).
 *
 * The anonymous device token IS the identity — it doubles as the
 * RevenueCat *app user id*. There is no account: on the same device the
 * token persists, so we just ask "is this token Pro?" on every load and
 * route accordingly. Cross-device restore is handled by the RevenueCat
 * redemption link in the purchase receipt (see PAYMENTS.md), not by a
 * login we build.
 *
 * We use RevenueCat's REST subscriber endpoint (read-only) rather than
 * the Web SDK, because purchases happen via external Paddle/Stripe
 * checkout links — the app only needs to *read* status, never to drive
 * an in-app purchase. The public API key is safe client-side; the call
 * returns only the entitlements for one (random-UUID) app user id.
 *
 * When NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY is unset, everything falls
 * back to the local entitlement cache (dev / pre-integration).
 */
import {
  getDeviceToken,
  getEntitlement,
  noEntitlement,
  writeEntitlementCache,
  type EntitlementPlan,
  type EntitlementState,
} from "@/lib/local-state";

const RC_KEY = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY;
const ENTITLEMENT_ID =
  process.env.NEXT_PUBLIC_REVENUECAT_ENTITLEMENT ?? "pro";

export function isRemoteEntitlementEnabled(): boolean {
  return Boolean(RC_KEY);
}

/** Map a RevenueCat product identifier to one of our plans (best-effort). */
function planFromProduct(productId: unknown): EntitlementPlan {
  const id = typeof productId === "string" ? productId.toLowerCase() : "";
  if (id.includes("tonight") || id.includes("day") || id.includes("24")) {
    return "tonight";
  }
  if (id.includes("month")) return "monthly";
  return "yearly";
}

type RcEntitlement = {
  expires_date?: string | null;
  product_identifier?: string;
};

/**
 * Refresh the entitlement from the remote source and update the local
 * cache so getEntitlement() reflects it. In local mode (no key) this is
 * a no-op that returns the current cache. Never throws — on any error it
 * falls back to the cached value so the ritual is never blocked.
 */
export async function syncEntitlement(): Promise<EntitlementState> {
  if (!RC_KEY) return getEntitlement();
  try {
    const token = getDeviceToken();
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(token)}`,
      { headers: { Authorization: `Bearer ${RC_KEY}` } },
    );
    if (!res.ok) return getEntitlement();
    const data = await res.json();
    const ent = data?.subscriber?.entitlements?.[ENTITLEMENT_ID] as
      | RcEntitlement
      | undefined;
    const active =
      !!ent &&
      (!ent.expires_date || Date.parse(ent.expires_date) > Date.now());

    if (active && ent) {
      const state: EntitlementState = {
        active: true,
        plan: planFromProduct(ent.product_identifier),
        expiresAt: ent.expires_date ?? null,
        source: "revenuecat",
      };
      writeEntitlementCache(state);
      return state;
    }
    const empty = noEntitlement();
    writeEntitlementCache(empty);
    return empty;
  } catch {
    return getEntitlement();
  }
}

/**
 * Restore on the current device — re-reads the remote source for this
 * token. (A fresh device with no token uses the receipt's redemption
 * link, which transfers the entitlement to the new token server-side.)
 */
export async function restoreEntitlement(): Promise<EntitlementState> {
  return syncEntitlement();
}
