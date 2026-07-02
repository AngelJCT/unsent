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

const DEV_PRO_KEY = "unsent.dev-pro";

function isDevHost(): boolean {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

/**
 * Dev-only Pro override. Set `localStorage["unsent.dev-pro"]` to a plan
 * ("weekly" | "monthly" | "yearly") or "1" to force Pro WITHOUT paying,
 * bypassing the remote check entirely. Gated to localhost, so it can never
 * unlock Pro on the deployed app even if the flag is present there. Clear
 * the key (or use the dev reset) to go back to free.
 */
function devProOverride(): EntitlementState | null {
  if (!isDevHost()) return null;
  let flag: string | null = null;
  try {
    flag = localStorage.getItem(DEV_PRO_KEY);
  } catch {
    return null;
  }
  if (!flag) return null;
  const plan: EntitlementPlan =
    flag === "weekly" || flag === "yearly" || flag === "tonight"
      ? flag
      : "monthly";
  return {
    active: true,
    plan,
    expiresAt: new Date(Date.now() + 365 * DAY_MS).toISOString(),
    source: "local_phase2",
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Infer the plan from one billing period's length. This is the robust
 * signal: it works regardless of how opaque the store's product id is
 * (Stripe ids like `prod_Uhq6…` carry no "month"/"year" keyword). Use the
 * *subscription's* dates (current period) so renewals don't drift the math.
 */
function planFromPeriod(
  startISO?: string | null,
  endISO?: string | null,
): EntitlementPlan | null {
  if (!startISO || !endISO) return null;
  const days = (Date.parse(endISO) - Date.parse(startISO)) / DAY_MS;
  if (!Number.isFinite(days) || days <= 0) return null;
  if (days <= 2) return "tonight";
  if (days <= 10) return "weekly";
  if (days <= 45) return "monthly";
  return "yearly";
}

/**
 * Fallback when no period is available: map a product identifier by
 * keyword. Defaults to monthly (the common case) rather than yearly so an
 * unrecognized id never silently overstates the plan.
 */
function planFromProduct(productId: unknown): EntitlementPlan {
  const id = typeof productId === "string" ? productId.toLowerCase() : "";
  if (id.includes("tonight") || id.includes("day") || id.includes("24")) {
    return "tonight";
  }
  if (id.includes("week")) return "weekly";
  if (id.includes("year") || id.includes("annual")) return "yearly";
  if (id.includes("month")) return "monthly";
  return "monthly";
}

type RcEntitlement = {
  expires_date?: string | null;
  purchase_date?: string | null;
  product_identifier?: string;
};

type RcSubscription = {
  purchase_date?: string | null;
  expires_date?: string | null;
};

/**
 * Refresh the entitlement from the remote source and update the local
 * cache so getEntitlement() reflects it. In local mode (no key) this is
 * a no-op that returns the current cache. Never throws — on any error it
 * falls back to the cached value so the ritual is never blocked.
 */
export async function syncEntitlement(): Promise<EntitlementState> {
  const dev = devProOverride();
  if (dev) {
    writeEntitlementCache(dev);
    return dev;
  }
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
      // Prefer the current subscription period (renewal-safe), then the
      // entitlement's own dates, then a keyword guess from the product id.
      const sub = data?.subscriber?.subscriptions?.[
        ent.product_identifier ?? ""
      ] as RcSubscription | undefined;
      const plan =
        planFromPeriod(sub?.purchase_date, sub?.expires_date) ??
        planFromPeriod(ent.purchase_date, ent.expires_date) ??
        planFromProduct(ent.product_identifier);
      const state: EntitlementState = {
        active: true,
        plan,
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

/**
 * The processor-hosted "manage / cancel" page for this device's
 * subscription, surfaced by RevenueCat as `subscriber.management_url`
 * (e.g. the Stripe billing portal). This is how a no-account user cancels.
 * Returns null in local mode (no key) or when the processor doesn't
 * expose one — the Settings screen then shows a graceful fallback.
 */
export async function fetchManagementUrl(): Promise<string | null> {
  if (!RC_KEY) return null;
  try {
    const token = getDeviceToken();
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(token)}`,
      { headers: { Authorization: `Bearer ${RC_KEY}` } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const url = data?.subscriber?.management_url;
    return typeof url === "string" && url ? url : null;
  } catch {
    return null;
  }
}
