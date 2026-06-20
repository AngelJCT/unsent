import {
  activateLocalEntitlement,
  getDeviceToken,
  type EntitlementPlan,
  type EntitlementState,
} from "@/lib/local-state";

export type Sku = {
  id: EntitlementPlan;
  label: string;
  price: string;
  detail: string;
  button: string;
  featured?: boolean;
};

// "Just Tonight" ($2.99 24h pass) is held for the native phase — a
// one-time pass models cleanly on StoreKit/Play Billing but becomes a
// "pay once, Pro forever" bug on Stripe web (one-time price → lifetime
// entitlement). Web ships Monthly + Yearly only.
export const SKUS: Sku[] = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$6.99",
    detail: "For the repeat almost-sends",
    button: "Stay covered monthly",
  },
  {
    id: "yearly",
    label: "Yearly",
    price: "$34.99",
    detail: "Most chosen",
    button: "Keep the calmer year",
    featured: true,
  },
];

function checkoutUrl(plan: EntitlementPlan): string | null {
  const urls: Record<EntitlementPlan, string | undefined> = {
    tonight: process.env.NEXT_PUBLIC_CHECKOUT_TONIGHT_URL,
    monthly: process.env.NEXT_PUBLIC_CHECKOUT_MONTHLY_URL,
    yearly: process.env.NEXT_PUBLIC_CHECKOUT_YEARLY_URL,
  };
  return urls[plan] ?? null;
}

function canUseLocalCheckout(): boolean {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export async function startCheckout(
  plan: EntitlementPlan,
): Promise<
  | { ok: true; entitlement: EntitlementState; mode: "local" }
  | { ok: true; mode: "redirect" }
  | { ok: false; reason: "checkout_unavailable" }
> {
  const url = checkoutUrl(plan);
  if (url) {
    // RevenueCat Web Purchase Links take the app_user_id as a PATH segment
    // (…/<link>/<app_user_id>), NOT a query param — a query param renders
    // RevenueCat's client-side 404. Our anonymous device token is that id,
    // so the REST status check recognizes the purchase on return (no
    // account needed). Any existing query (e.g. ?package_id=) is preserved.
    const target = new URL(url, window.location.href);
    target.pathname =
      target.pathname.replace(/\/+$/, "") +
      "/" +
      encodeURIComponent(getDeviceToken());
    window.location.assign(target.toString());
    return { ok: true, mode: "redirect" };
  }

  if (canUseLocalCheckout()) {
    return {
      ok: true,
      entitlement: activateLocalEntitlement(plan, "local_phase2"),
      mode: "local",
    };
  }

  return { ok: false, reason: "checkout_unavailable" };
}
