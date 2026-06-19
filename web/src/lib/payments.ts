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

export const SKUS: Sku[] = [
  {
    id: "tonight",
    label: "Just Tonight",
    price: "$2.99",
    detail: "24 hours, no renewal",
    button: "Get me through tonight",
  },
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
    const target = new URL(url, window.location.href);
    // RevenueCat Web Purchase Links attribute the sale to this app_user_id
    // — our anonymous device token. The REST status check uses the same
    // token, so the purchase is recognized on return (no account needed).
    target.searchParams.set("app_user_id", getDeviceToken());
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
