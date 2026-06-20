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

## What's implemented (code, done)

- **Paywall UI**, three SKUs, plan selection, blur/unlock gating,
  on-pay tone regeneration — `Composer.tsx` + `payments.ts`.
- **Outbound checkout** — `startCheckout(plan)` redirects to a per-plan
  checkout URL with `?plan=…&device=<token>` so the processor can credit
  the right RevenueCat app user id.
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

**Chosen path (2026-06-14): Stripe Managed Payments (Stripe = merchant of
record, handles tax) via RevenueCat's _Stripe Billing_ integration.**
Important: Managed Payments works ONLY through RevenueCat's Stripe Billing
integration, NOT "Web Billing" — don't create a Web Billing config.

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
6. **Web Purchase Links** — generate one per package; the app appends
   `?app_user_id=<device token>` so the purchase attributes to that token
   (which the REST read then recognizes). Set the success/return URL to
   `…/?checkout=success`.
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
7. **"Just Tonight" product type** — model as non-renewing / consumable
   so it can't read as a sneaky auto-renew (matters at native review).

## Still unverified until you connect it

The RevenueCat REST read is written against the documented API but can't
be exercised without a real key + a processor→RC connection. Once the
env var is set, test: buy on a device → return → land unlocked; clear
storage → "Restore purchase" prompts for the receipt link; open the
redemption link → unlocked on the new device.

## The rule that prints trust

Never charge for the Cool-down, and say so on the paywall. "We will never
charge you to *not* send something" stays verbatim.
