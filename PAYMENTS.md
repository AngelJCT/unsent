# Payments — status & setup

## The identity model (why there's no login)

**The anonymous device token IS the account.** It's stored in
`localStorage` and doubles as the RevenueCat **app user id**. There is no
signup — the first identity event a user ever has is the purchase itself
(per brand §3 / dev plan §5).

- **Same device, returning:** on every load the app asks the entitlement
  source "is this token Pro?" (`syncEntitlement()` in
  `web/src/lib/entitlement.ts`). If yes, the user lands straight on the
  composer, unlocked — no account screen. This is what makes a paid user
  "come back automatically."
- **Returning from checkout:** the processor redirects back to the app
  (use a return URL like `https://yourdomain/?checkout=success`); the
  boot sync then recognizes the now-Pro device.
- **New device / cleared storage:** the token is gone, so there's nothing
  to check. Restore is handled by the **RevenueCat redemption link** in
  the purchase receipt — opening it on the new device transfers the
  entitlement to that device's token, server-side. No login, no email
  lookup we have to build. ("Restore purchase" in-app re-checks the
  current device and tells the user to use the receipt link otherwise.)

## Web SKUs & prices (current)

Web ships three plans (the `Just Tonight` one-off is held for native —
see the note in `payments.ts`):

| Plan | Price | RevenueCat package id | env URL |
|---|---|---|---|
| Weekly | $4.99 | `$rc_weekly` | `NEXT_PUBLIC_CHECKOUT_WEEKLY_URL` |
| Monthly | $9.99 | `$rc_monthly` | `NEXT_PUBLIC_CHECKOUT_MONTHLY_URL` |
| Yearly (featured) | $49.99 | `$rc_annual` | `NEXT_PUBLIC_CHECKOUT_YEARLY_URL` |

The price strings in `payments.ts` are **labels only** — the real
charge is the Stripe price each package points to. Keep them in sync.
Create the Weekly product/price + `$rc_weekly` package in
Stripe/RevenueCat and attach it to the `pro` entitlement.

## What's implemented (code, done)

- **Paywall UI**, three SKUs (weekly/monthly/yearly), plan selection,
  blur/unlock gating, on-pay tone regeneration — `Composer.tsx` +
  `payments.ts`.
- **Settings + manage/cancel** — the header gear opens a Settings screen:
  status, Upgrade (the paywall when free), Restore, and **Manage or
  cancel** via RevenueCat's `subscriber.management_url`
  (`fetchManagementUrl()` in `entitlement.ts`); graceful fallback when
  no URL/key.
- **Outbound checkout** — `startCheckout(plan)` redirects to a per-plan
  RevenueCat Web Purchase Link and appends the anonymous device token as
  the final URL path segment. That path segment is the RevenueCat app
  user id, so the processor can credit the right anonymous user.
- **Entitlement read** — `web/src/lib/entitlement.ts` reads status from
  RevenueCat's REST subscriber endpoint (read-only; we don't use the Web
  SDK because purchases go through external Paddle/Stripe links). Gated
  by `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY`; **with no key it falls back
  to the local cache, so dev works unchanged.**
- **Boot sync + restore** — the app recognizes a Pro device on load and
  on "Restore purchase".
- **Checkout-return handling** — `?checkout=…` params are stripped on
  load and the entitlement is re-synced.

## Your part (account setup)

**Chosen path (2026-06-14): Stripe Billing via RevenueCat, with "Use
Managed Payments when available" enabled if Stripe supports it for the
connected account/products.** Do this through RevenueCat's _Stripe
Billing_ integration, NOT a RevenueCat Web Billing config.

1. **Stripe** — new account for Unsend; choose the option where **Stripe
   handles tax/fraud/support** (Managed Payments / MoR).
2. **RevenueCat** — connect Stripe via the **Stripe Billing** integration
   (project owner only). Create the entitlement `pro` (or set
   `NEXT_PUBLIC_REVENUECAT_ENTITLEMENT`).
3. **Products** — create the three in **Stripe Billing**: tonight /
   monthly / yearly. Name the product id with `tonight`/`month`/`year`
   (the app maps product → plan by that substring; else defaults to
   yearly — adjust `planFromProduct` in `entitlement.ts` if you name them
   differently).
4. **Offering + packages** — one Package per product; attach all three to
   the `pro` entitlement.
5. **Enable "Use Managed Payments when available."**
6. **Web Purchase Links** — generate the link from Funnels → Purchase
   Links and select the Stripe config + Offering. The app appends
   `/<device token>` to the link, not `?app_user_id=...`. If you want the
   app's Monthly / Yearly buttons to skip RevenueCat's package picker,
   put the plan-specific `?package_id=...` on each env URL; the code
   preserves that query string before appending the token. Set the
   success/return URL to `…/?checkout=success`.
7. **Redemption links** — RevenueCat appends `redeem_url` to the success
   page for cross-device restore (no login). Handling TBD in code.
8. **Env vars** (`web/.env.local`):
   - `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY` — the **public** API key
     (safe client-side; the REST read returns only one app user id's
     entitlements).
   - `NEXT_PUBLIC_REVENUECAT_ENTITLEMENT` — optional, defaults to `pro`.
   - `NEXT_PUBLIC_CHECKOUT_TONIGHT_URL`
   - `NEXT_PUBLIC_CHECKOUT_MONTHLY_URL`
   - `NEXT_PUBLIC_CHECKOUT_YEARLY_URL`
9. **"Just Tonight" product type** — model as non-renewing / consumable
   so it can't read as a sneaky auto-renew (matters at native review).

## Sandbox testing checklist

RevenueCat's Sandbox Web Purchase Link does **not** convert a live Stripe
configuration into test mode. Stripe Sandboxes are standalone accounts, so
testing needs a dedicated sandbox-side setup:

1. In Stripe, switch to the Sandbox account you want to test.
2. Install the RevenueCat Stripe app in that Stripe Sandbox.
3. In RevenueCat, create a separate Stripe web config that selects that
   sandbox Stripe account.
4. Create/import the sandbox Stripe products and prices into RevenueCat.
   Keep one price per product to avoid ambiguous checkout behavior.
5. Create the Offering/packages from those sandbox-imported products and
   attach the `pro` entitlement.
6. Create/publish the Web Purchase Link using the sandbox Stripe config
   and that Offering.
7. Copy the **Sandbox** purchase-link URLs into Vercel while testing.
   When going live, swap the env vars to the Production purchase-link
   URLs backed by the live Stripe config.

Do not mix environments. A sandbox Web Purchase Link should use a
sandbox Stripe config, an Offering built from sandbox-imported Stripe
products, and sandbox purchase-link URLs. Products imported from live
Stripe mode belong to the production Stripe config and should only back
production purchase links.

If the RevenueCat hosted paywall loads but clicking a package shows
"Purchase not started" before Stripe checkout appears, first check that
the link, Offering, package products, and Stripe config are all from the
same environment: all sandbox for testing, or all production for live.

## Still unverified until you connect it

The RevenueCat REST read is written against the documented API but can't
be exercised without a real key + a processor→RC connection. Once the
env var is set, test: buy on a device → return → land unlocked; clear
storage → "Restore purchase" prompts for the receipt link; open the
redemption link → unlocked on the new device.

## The rule that prints trust

Never charge for the Cool-down, and say so on the paywall. "We will never
charge you to *not* send something" stays verbatim.
