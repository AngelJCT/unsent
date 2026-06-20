# Unsend. — Development Plan

**v1.0 — From prototype to the keyboard.**

---

## 0. How to read this

Every other product doc you've written argues the *why*. This one sequences the *build*, and it does so around a single load-bearing thesis carried over from the brand work:

> The privacy architecture **is** the business model. The thing you refuse to do — read, store, or show the message — is simultaneously the paywall's trust, the Vault's intimacy, and the Receipt's mystery.

That isn't a slogan here; it's an engineering constraint that decides your backend shape and which claims you can honestly make. The core promise is simple and bulletproof: **Unsend never stores what users write, and you the developer can't read it.** A draft passes through memory to get rewritten and is gone — there's no database, no log, no record. Wherever a build decision touches that promise, the promise wins.

The plan ships in phases, and each phase ends at a **validation gate** — a metric that has to clear before the next phase is allowed to start. You're a small team; the gates exist so you don't build Phase 3 on a Phase 1 that didn't actually work.

---

## 1. Locked decisions

These came out of the planning sessions. They're settled, recorded here so the plan is self-contained.

| Decision | Choice | Why |
|---|---|---|
| **Platform sequence** | Next.js mobile-web PWA → Expo (React Native) → native keyboard/share extension | TikTok traffic converts on a link tap, not an App Store detour. Validate the loop before paying the iOS review tax. The whole prototype is already React + Tailwind. |
| **Engine (launch)** | An LLM accessed via **OpenRouter**, behind a stateless no-log proxy | Quality *is* the gasp, and the gasp is the business. OpenRouter gives one integration, easy model swaps, and a data-policy filter to require no-retention/no-training providers. On-device stays an optional future experiment. |
| **Engine model/provider** | Deferred — chosen via OpenRouter with a **required no-retention, no-training data policy** | Model choice can come later. Retention is a *policy* filter, not a model-size choice: require the policy first, then pick the most capable model that satisfies it (see §3.2). |
| **Privacy standard** | "We never store your messages. We can't read them." + a plain note that an AI service rewrites the text and doesn't retain or train on it. | The proxy-scoped claims are architecturally true; the no-retention routing lets you extend them honestly to the rest of the path. Avoid "never leaves your phone" — false with any API, and unnecessary. |
| **Payments** | RevenueCat (mobile entitlements) + Paddle or Stripe (web), unified in RevenueCat | Apple forces IAP for digital subs anyway; RevenueCat gives cross-platform entitlements + paywall A/B testing without a subscription backend. |
| **Identity** | Anonymous device ID. No account until purchase. | Asking for a signup mid-meltdown loses ~40% of installs before any value lands. |
| **The Vault** | On-device only, encrypted, explicit opt-in | Keeps "we never store your messages" literally true: *we* don't, *they* may. |
| **Notifications** | Exactly one — the Cool-down — requested at the moment of value, fired locally | The only push the brand permits. Everything else is on the Anti-List. |

---

## 2. Architecture at a glance

Four pieces, deliberately few:

1. **Client** (PWA, then RN). Holds all message text, the Vault, the free-usage counter, and renders every ritual. This is where ~90% of the product lives.
2. **The engine proxy.** A single stateless edge function. Takes `{draft, recipient, feeling}`, calls the LLM API, returns `{mirror, rewrite}`. Logs *nothing* — no request body, no response, no message text, IP stripped at the edge. No database touches the draft, ever.
3. **The counter service.** Content-free. Receives ticks: `burned`, `kept`, `category=ex`. Stores aggregates only. Feeds the weekly-monument posts. Never sees a word.
4. **RevenueCat.** Source of truth for entitlements across web and native.

**Data flow for one rewrite:** draft never persists anywhere → client → proxy (in-memory only) → **OpenRouter** (no content storage by default) → **a no-retention provider** (processes the text, doesn't retain or train on it) → proxy → client → rendered → discarded on close. The only thing that can outlive the session is a Vault entry the user *chose* to keep, and that never leaves their device.

What this buys you: your *own* privacy claims aren't a policy you promise to honor — they're things your system is *structurally incapable* of violating, because there's nothing on your side that stores or reads a message. That's the difference between a privacy policy and a privacy architecture.

---

## 3. The engine — the load-bearing system

Everything else is furniture around this. Get it right and the app works; get it generic and the mirror reads like a horoscope.

### 3.1 Picking a model (deferrable)

Model choice can come later; the architecture doesn't depend on it. When you do choose, two axes matter. **Quality**, because the rewrite is the whole product — the difference between a gasp and a horoscope is whether the mirror quotes the user's actual words back, and a stronger model does that more reliably. **Cost/latency**, because the rewrite is a short in/short out — even a mid-tier hosted model runs at a tiny fraction of any SKU price, so quality, not cost, should drive the pick. Start with whatever gives the best mirror, A/B a cheaper one against it, and only trade down if the cheaper model still makes *you* wince with recognition.

### 3.2 OpenRouter privacy configuration (the one thing to get exactly right)

You're routing through OpenRouter, which puts **three parties** in the path — your proxy, OpenRouter, and the downstream provider — each with its own policy. Configure all three and the privacy story holds; miss one and a claim quietly becomes false.

**1. Your proxy** — fully yours, the strongest layer. No logging, no DB (see §3.3). This is what makes "we don't store it, we can't read it" architecturally true regardless of anything upstream.

**2. OpenRouter** — does **not** store prompts or completions by default. Two opt-in toggles would change that; keep **both off**:
- *Private Input/Output Logging* (off by default) — leave disabled.
- *"Use of Inputs/Outputs" for the 1% discount* (off by default) — do **not** take the discount; it grants OpenRouter use of your content.
- OpenRouter keeps content-free metadata (token counts, latency) — fine. One residual to know about: it samples a small number of prompts for anonymous categorization under a zero-retention policy, never tied to your account. Disclose it if you want to be maximally transparent; it's minor.

**3. The downstream provider** — OpenRouter does **not** auto-route by retention; *you* must require it. Two ways, use both:
- Account-wide: in OpenRouter privacy settings, opt out of providers that train on prompts, and set the data-policy requirement.
- Per-request: pass the provider-selection `data_collection`/data-policy filter (and require ZDR providers where offered) so every single call is constrained, not just the default. Belt and suspenders.

**Picking the model under that constraint:** require the policy first, then choose the most capable model that still has a compliant provider. Don't reach for a small open model (your Gemma example) *for privacy* — retention is a provider property, not a size property, and a weaker model costs you gasp quality for a privacy guarantee you can get on stronger models too. Verify the specific model+provider's retention/training line on its OpenRouter page at build time; these change.

**What this earns you, stated honestly:** *"Your message is rewritten by AI providers that don't store or train on it."* True when configured as above. It is **not** "never leaves your phone" — it leaves, to two vendors — and it's a *policy* claim about them, versus the *architectural* guarantee your own no-log proxy gives. Keep the core claims proxy-scoped; let the no-retention routing extend them to the rest of the path.

> **Build note — BYOK option.** OpenRouter supports bringing your own provider keys (BYOK). If you ever want a direct contractual relationship with a specific provider (e.g. a signed zero-retention addendum), BYOK lets you keep the OpenRouter routing convenience while the data terms run directly between you and that provider. Optional; not needed for launch.

### 3.3 The proxy

A stateless edge function (Vercel Edge / Cloudflare Workers — both colocate well with a Next.js front end). Requirements: no request/response logging, no analytics middleware on this route, IP discarded, no persistence layer in the path. Rate-limit by ephemeral device token, not by anything that fingerprints a person. This function should be auditable in an afternoon — small is the security model.

### 3.4 Prompt design

One structured call returns both halves of the screen. Condition on `recipient` and `feeling`. Demand JSON out (`{mirror, rewrite}`), parse defensively, strip fences.

The single most important instruction in the whole system prompt: **the mirror must quote the user's own words back.** "'Hope it was worth it' won't land as strength" is the gasp. "This message seems a bit accusatory" is a horoscope. Specificity is the entire product — write the prompt to extract the user's actual load-bearing phrase and react to *that*. The canned per-feeling mirrors in the prototype are more confident than a real first-pass output; the prompt's job is to earn that confidence honestly.

### 3.5 Latency as ceremony

The "Reading it the way they will…" beat is ~1.6–2.5s in the prototypes. That pause is a feature — it makes the result feel weighed, not autocompleted. Keep p95 inference *under* that ceiling so the model finishes inside the ritual and you never show a spinner past the beat. If inference is faster, keep the pause anyway: instant results feel cheap in a product whose whole premise is slowing down.

### 3.6 The safety path (non-negotiable, must-have for launch)

This is the one thing missing from the prototypes, and it's both an ethical obligation and an App Store requirement. Users in real distress will paste drafts that signal self-harm or crisis — not anger at an ex. The app must **not** simply "rewrite" those.

Build a lightweight classifier check (can run in the same call or a fast pre-pass) that, on a self-harm or crisis signal, **breaks the normal flow** and surfaces appropriate support resources in-brand — quiet, warm, short sentences, no wit ("Some things are bigger than a draft. Here's someone to talk to."). This path never tries to be clever and never monetizes. Apple and Google both scrutinize emotional-wellbeing apps for exactly this; shipping without it risks rejection and, more importantly, harm. Treat it as P0, not a fast-follow.

---

## 4. Privacy — what you can honestly say

There are two different places a draft exists, with two different truths. Keep them straight and the whole privacy story is clean and easy to honor.

**On your side (the proxy and your servers):** nothing is logged, nothing is written to a database, the draft lives in memory for the length of one request and is gone. This is a real architectural requirement — no logging on that route, no persistence in the path — and it makes these claims *literally true*, not aspirational:

- "We never store your messages."
- "Never saved on our servers."
- "We can't read them. We don't want to."
- "Kept messages live on your device only." (the Vault)
- "The Receipt holds shapes, not words."

**On the provider's side:** the draft does travel — through OpenRouter to a downstream AI provider — to get rewritten. Configured per §3.2 (no-retention, no-training routing, OpenRouter logging off), no one in that path stores it or trains on it. The honest way to cover it is one plain-language line — *"An AI service rewrites your message. It isn't stored or used to train anything, and we can't read it."* — in the privacy copy and store listing.

The one trap to avoid: **don't make absolute or duration claims you can't back.** "Your words never leave your phone" is false the moment any API is involved, and "instantly gone everywhere" is a claim about the providers' internals you can't fully verify. You don't need either — and that's the key realization that unlocks the whole plan. The strong, true claims above are about what *you* do, and they're enough. Dropping the absolute claim doesn't weaken the story; it just stops you from honoring a promise you were never required to make.

(The no-retention routing in §3.2 is what lets you honestly extend "not stored" past your own servers to the rest of the path. It's a policy guarantee from your vendors, not architecture you control — strong, but keep the wording to "providers that don't retain or train on it," not "physically impossible for anyone to see it.")

---

## 5. Data model & identity

Keep it as small as the architecture allows.

- **Device token** — anonymous, generated client-side. Tracks free-crisis count so the paywall can fire on the right use. Server only ever sees "this token has had N free reads," never content.
- **Vault entries** — on-device, encrypted at rest (Web: encrypted IndexedDB / Origin Private File System; RN: SecureStore + encrypted SQLite or MMKV). Schema: `{id, recipient_category, created_at, status: kept|burned, snippet}`. The snippet exists only for kept entries and only on-device.
- **Entitlements** — RevenueCat. Wire it from day one even on web (it ingests Stripe receipts), so a user who pays on the PWA keeps Pro when the native app ships. This avoids the classic "paid on web, locked out on app" migration nightmare.
- **Aggregate counters** — server, content-free, append-only ticks for the weekly monument.

No user table. No message table. No email at signup. The first identity event in a user's life with Unsend is a *purchase*, and the App Store / Play handle that identity for you.

---

## 6. Phased roadmap (task-level)

**How to read this.** Each phase has a goal, a set of **workstreams** (W#.#) broken into checkbox tasks, and a **gate / definition of done** that must clear before the next phase starts. Tasks are written to be picked up and finished in a sitting. "DoD" = done-when. Anything marked **P0** is launch-blocking.

**Conventions assumed throughout:** single source of truth for design tokens; the engine proxy is the *only* server code that ever touches a draft; no draft text is ever logged, anywhere, in any phase; every new screen is ported from the existing prototypes unless noted.

---

### Phase 0 — Foundations
**Goal:** stand up the repo and prove the riskiest thing (the gasp) before building UI around it. Short, but don't skip the gate.

**W0.1 — Repo & tooling**
- [ ] Init Next.js (App Router, TypeScript) repo; decide hosting (Vercel recommended — Edge functions colocate with the front end).
- [ ] Add Tailwind, framer-motion, lucide-react (match prototype deps so components paste in clean).
- [ ] Set up linting/formatting, env-var handling (`.env.local`), and a `README` that states the no-log rule in writing so it survives future contributors.
- [ ] Create a staging deploy and confirm the pipeline (push → preview URL).

**W0.2 — Design tokens & primitives**
- [ ] Extract the prototype's palette/type/spacing into a tokens file (`tokens.ts` or CSS vars): Candlelight `amber-50`, Midnight Stone `stone-900`, Burn Orange `orange-700`, Ember `orange-200/300`, Ash `stone-400/500/600`. This is the artifact that survives the NativeWind jump in Phase 3 — do it now, once.
- [ ] Wire the three type roles: serif italic (headlines/ritual), humanist sans (UI/body), mono (receipts/stats). Load the actual faces (Newsreader/Instrument Serif, Inter, IBM Plex Mono or chosen equivalents).
- [ ] Build the wordmark component (`Unsend` + orange period) as the one reusable lockup.

**W0.3 — Engine proxy spike (OpenRouter)**
- [ ] Create the edge route (`/api/rewrite`) — stateless, no logging middleware on this path, IP discarded.
- [ ] Integrate OpenRouter (server-side key only, never in the client). Configure per §3.2: logging toggles **off**, training opt-out on, per-request data-policy filter requiring no-retention/no-training providers.
- [ ] Implement the call: input `{draft, recipient, feeling}` → OpenRouter → output parsed `{mirror, rewrite}`. Strip code fences, parse defensively, handle malformed JSON with a single retry then a graceful error.
- [ ] Add request timeout + provider fallback list (OpenRouter supports model/provider fallbacks — but keep all fallbacks inside the no-retention policy).
- [ ] Confirm in OpenRouter's dashboard that no prompt content is being logged on your account.

**W0.4 — Prompt v0 + safety stub**
- [ ] Write the system prompt: returns strict JSON `{mirror, rewrite}`; the mirror **must quote the user's own load-bearing phrase back** (this is the gasp — see §3.4); the rewrite preserves intent, drops the barbs, matches recipient.
- [ ] Condition output on `recipient` and `feeling`.
- [ ] Stub the safety classifier: a fast pre-check (or same-call flag) that returns a `crisis: true` signal on self-harm/crisis content. Stub the branch now; build the real resource screen in Phase 1.

**Gate / DoD:** paste a real, ugly draft → get back a *specific*, your-own-words mirror + a usable rewrite, as valid JSON, within the ceremony-pause budget (≤~2.5s p95). If the mirror reads like a horoscope, stop and fix the prompt — nothing downstream matters until this lands.

---

### Phase 1 — PWA MVP: the core loop
**Goal:** the full emotional arc, free, no payments. The loop you're validating: compose → Mirror → Rewrite → Cool-down → Burn → Receipt. This is the biggest phase; it's where the product either works or doesn't.

**W1.1 — App shell & routing**
- [ ] Set up routes/screens for the flow states (arrival, who, compose, reading, result/mirror, cooldown, burn, receipt). Single-page state machine is fine (the prototypes already model this with a `step` state) — keep it one coherent flow, not a multi-page reload.
- [ ] Global layout: header wordmark, the "Drafts are never stored" lock line, footer tagline. Mobile-first; the before/after split reveals at desktop width.
- [ ] PWA basics: manifest, icons (the orange period works as the mark), installable, offline shell for the static chrome.

**W1.2 — Shared UI primitives**
- [ ] Port the reusable pieces from the prototypes: feeling chips, recipient chips/cards, the dark "rewrite" card, the dashed cool-down card, buttons, the lock/privacy line. Drive them all from W0.2 tokens.
- [ ] Lock in the motion rules: fade + 16px rise, 350ms ease-out; nothing bounces; no confetti. Centralize as motion variants so every screen matches.

**W1.3 — Onboarding (arrival → who → compose → reading)**
- [ ] Port the arrival screen: one confession-button CTA ("I have a message I shouldn't send") + the "see it work on a sample" tourist path.
- [ ] Port the "who" screen (recipient select), skippable. Flag it for the kill-test in §10.
- [ ] Port the compose screen: textarea, the "paste the version you actually typed" placeholder, the privacy line *at the box*, sample-draft fallback for empty state.
- [ ] Port the "reading" interstitial — the ceremony beat that masks inference latency.
- [ ] **No signup anywhere in this flow.** Anonymous device token only.

**W1.4 — Engine call wiring (client ↔ proxy)**
- [ ] Call `/api/rewrite` from the compose screen; show the reading beat during inference.
- [ ] Hold a minimum ceremony duration even if inference returns faster (don't let it feel cheap).
- [ ] Error states in-brand: provider failure → a calm retry, never a stack trace. Network offline → "we'll be here when you're back."
- [ ] Ensure the draft is held in memory only and dropped after render; nothing written to storage or logs client- or server-side.

**W1.5 — The Mirror + Rewrite result**
- [ ] Render the mirror (how it will read) and the rewrite (what you could send) from the real `{mirror, rewrite}` payload — retire the prototype's canned `MIRRORS`/`REWRITES` maps.
- [ ] Mirror left/above, rewrite right/below (recognition before solution).
- [ ] Copy-rewrite action with the in-brand confirmation.
- [ ] Recipient note line under the mirror.

**W1.6 — The safety path (P0)**
- [ ] Build the real crisis branch the W0.4 stub points at: on a `crisis` signal, **break the normal flow** — no rewrite, no monetization — and show support resources, short and warm ("Some things are bigger than a draft. Here's someone to talk to.").
- [ ] Source appropriate, current crisis resources for your launch geographies; make the list easy to update.
- [ ] Make sure this path can never be paywalled or counted toward free-use limits.

**W1.7 — Cool-down (in-session for now)**
- [ ] Port the "keep it unsent for an hour" mechanic as an in-session state (the *real* local notification arrives with native in Phase 3).
- [ ] Wording stays free, always; never charge for the pause.

**W1.8 — The Burn**
- [ ] Port the burn animation: ~2.5s, words drift apart + blur, never instant. This is the most screen-recorded moment — make it beautiful and consistent across devices.
- [ ] "Gone. For good." released state, short, no flourish.

**W1.9 — The Receipt**
- [ ] Port the wordless receipt generator: width-mapped redaction bars (rhythm of the real message, no characters), on-device stats (word count, all-caps, exclaims, etc.), "EST. SAVINGS" wink line, barcode, watermark.
- [ ] Share + Save actions. Render the card to an image client-side (canvas/SVG → PNG) so nothing round-trips a server.
- [ ] The "Let them wonder what it said" share confirmation. Decline path stays dignified.

**W1.10 — Free-usage counter (device token)**
- [ ] Generate an anonymous client-side device token on first open.
- [ ] Track free-crisis count (local first; a minimal content-free server check if you need anti-abuse). Server only ever knows "token X has had N reads," never content. This is what Phase 2's paywall reads from.

**W1.11 — Content-free analytics**
- [ ] Instrument the funnel with category/tick events only: install→mirror completion, mirror shown, cool-down used, burn, receipt generated, receipt shared. No draft text, ever.
- [ ] Wire the second-crisis-return signal (return event keyed to the anonymous token over a 60-day window).

**W1.12 — Privacy & legal copy**
- [ ] Write the privacy policy + in-app privacy line using the §4 claims and the §3.2-accurate disclosure ("an AI service rewrites your message; it isn't stored or used to train anything; we can't read it").
- [ ] Add the "what we don't do" anti-list framing where it builds trust.

**Gate / DoD:** does the gasp land and do people come back? Watch **install→mirror completion** (~60%+) and the leading **second-crisis return** signal; instrument **receipt share→install** (k-factor). If the mirror lands but nobody returns, the problem is the loop, not the funnel — diagnose before monetizing. Ship this as a real, shareable web app before writing a line of payment code.

---

### Phase 2 — Monetization + Vault + counters
**Goal:** now that the loop works, price it — without breaking the trust the loop earned.

**W2.1 — RevenueCat foundation**
- [ ] Create the RevenueCat project; define entitlements (e.g. `pro`) and the offering containing the three SKUs.
- [ ] Wire it on web from day one (it ingests Stripe receipts) so a web purchase carries to the native app later — this prevents the "paid on web, locked out on app" churn.

**W2.2 — Web payments**
- [ ] Choose Paddle or Stripe (see §7; Paddle's merchant-of-record removes global tax overhead for a small team).
- [ ] Implement checkout for the three SKUs; feed receipts into RevenueCat so entitlements are unified.
- [ ] Handle success/restore/cancel states in-brand. Add "Restore purchase."

**W2.3 — Paywall integration**
- [ ] Port the paywall screen; wire the gating logic: mirror always free, rewrite gated on the **second** crisis (read the W1.10 counter). A/B 2nd-vs-3rd per §10.
- [ ] **Cool-down is never paywalled** — enforce in code, and keep the "we'll never charge you to *not* send something" line on the paywall.
- [ ] Blur (not hide) the ready rewrite behind the ask — it's truthful only if a real rewrite exists; make sure it does.
- [ ] No countdown timers, no fake urgency, no pre-checked boxes.

**W2.4 — The SKUs**
- [ ] Just Tonight $2.99 (24h, no renewal), Monthly $6.99, Yearly $34.99 (anchor, "most chosen").
- [ ] Model "Just Tonight" cleanly as non-renewing/consumable so it can't be read as a sneaky auto-renew (matters more at native review; get the modeling right now).
- [ ] Emotional button copy per SKU ("Get me through tonight — $2.99").

**W2.5 — The Vault**
- [ ] Build the keep-or-release choice at the end of cool-down.
- [ ] On *keep*: persist on-device only, encrypted (Web: encrypted IndexedDB / OPFS). Schema `{id, recipient_category, created_at, status, snippet}`; snippet only for kept entries, only local.
- [ ] On *release*: route to the Burn.
- [ ] Vault view: the "N unsent / kept / let go" counts (decisions, not usage), entry list, the "we can't read it, we don't want to" line.

**W2.6 — Aggregate counter service**
- [ ] Build the content-free counter endpoint: receives ticks (`burned`, `kept`, `category=ex`) and stores aggregates only. No content, no per-user linkage beyond what's needed to dedupe.

**W2.7 — Weekly monument**
- [ ] Add an export/query that produces the aggregate post ("This week: N messages to exes, not sent"). Counters only — the social growth artifact, generated outside the app.

**Gate / DoD:** paywall converts without cratering trust. Watch trial/paywall conversion and **Just Tonight cannibalization** (§10), and **re-check second-crisis return now that a wall exists** — if it drops sharply, the wall is in the wrong place or firing too early.

---

### Phase 3 — Native via Expo
**Goal:** mobile is the endgame — the crisis happens on the phone at night. Port the validated loop to native and ship to the stores.

**W3.1 — Project & shared code**
- [ ] Init Expo (React Native, TypeScript). Decide structure: a monorepo (e.g. Turborepo) sharing tokens/logic between web and native is worth it now that there are two clients.
- [ ] Extract framework-agnostic logic (engine client, state machine, counter, Vault interface) into shared packages so it isn't reimplemented twice.

**W3.2 — Styling & animation port**
- [ ] Tailwind → NativeWind, driven by the same W0.2 tokens (the payoff for doing tokens early).
- [ ] framer-motion → Reanimated/Moti. Re-implement the Burn and the reveals; verify the Burn looks right on real devices (it's the shareable moment — don't let it degrade).

**W3.3 — Navigation & screens**
- [ ] Set up navigation (Expo Router). Port every screen to native; verify mobile layout/typography parity with the PWA.

**W3.4 — The real Cool-down notification**
- [ ] Implement a genuine **local** notification one hour post-session ("Still thinking about it?").
- [ ] Request notification permission **at the cool-down moment**, never at install (the §ask timing that protects opt-in rate).
- [ ] Keep it the *only* notification — no daily prompts, no re-engagement (Anti-List).

**W3.5 — Native Vault storage**
- [ ] Move the Vault to native secure storage (SecureStore + encrypted SQLite or MMKV). Same schema; still device-only.
- [ ] Migration path for anyone who had web Vault entries (if applicable).

**W3.6 — Payments (native IAP)**
- [ ] RevenueCat native SDK; create the products in App Store Connect and Play Console (the three SKUs).
- [ ] Verify entitlement continuity: a user who paid on web keeps `pro` on the app (test this explicitly — §10).
- [ ] Get the "Just Tonight" product type right for each store's rules.

**W3.7 — Native Receipt share**
- [ ] Render and share the Receipt via the native share sheet; confirm image generation stays on-device.

**W3.8 — Store readiness & compliance (P0 items)**
- [ ] Privacy nutrition labels / Data Safety form — fill them to match the §4 reality (no message storage; AI processing disclosed).
- [ ] Age rating; ensure the crisis-resource path is present and discoverable (both stores scrutinize wellbeing apps for this).
- [ ] Subscription metadata, restore, terms/privacy links, paywall compliance (clear pricing, no dark patterns).
- [ ] App icon, screenshots, listing copy in-brand.

**W3.9 — Submit**
- [ ] Submit iOS + Android. Budget real calendar time for review, especially around subscriptions and the wellbeing classification. Have the safety path and privacy labels airtight before submitting.

**Gate / DoD:** native install→mirror parity with web, clean store approval, web→native entitlement carry-over verified. Don't start Phase 4 until you're live and stable.

---

### Phase 4 — The keyboard
**Goal:** catch the rage *inside* the messaging app, before the app-switch — the one move that removes the last step where users still send the thing. Genuinely hard, which is why it's last.

**W4.1 — iOS Share Extension**
- [ ] Build a Share Extension so a user can select draft text in Messages and send it to Unsend's mirror without fully leaving the conversation.
- [ ] Reuse the shared engine client + the same no-log proxy — this is a new *entry point*, not a new backend.

**W4.2 — Android share target**
- [ ] Implement the equivalent Android share intent / direct-share target.

**W4.3 — Custom keyboard (stretch)**
- [ ] A custom keyboard extension that can summon the mirror inline is the deepest version. Treat as stretch — keyboard extensions are fiddly and have their own review scrutiny. Validate demand with the share extension first.

**W4.4 — Integration**
- [ ] Ensure entitlements, counter, safety path, and Vault all work identically from the intercept entry point.

**Gate / DoD:** the intercept fires reliably and stays invisible until summoned — it must never interfere with normal typing. If it's intrusive, it's worse than nothing; tune until it disappears when unwanted.

> **Optional future experiment — on-device engine.** Apple Foundation Models / Gemini Nano could run the rewrite locally someday. The *only* thing this unlocks is the ability to say "your words never leave your phone" — which, per §4, you've decided you don't need. Phone-sized models are also weaker, so quality (your gasp) would likely drop. File this as "revisit only if on-device quality ever clears the gasp bar," not a roadmap commitment. The hosted model via OpenRouter is the plan.

---

## 7. Payments detail

**Mobile:** RevenueCat wrapping StoreKit + Play Billing. You get cross-platform entitlements, paywall A/B testing (you'll want it for the "$34.99/yr as identity, not discount" framing), and churn analytics without a subscription server.

**Web:** Paddle or Stripe. For a solo/small team, **Paddle's merchant-of-record model usually wins early** — they handle global sales tax/VAT so you never think about it. Use Stripe if you want maximum control and are willing to own tax compliance. Either way, feed receipts into RevenueCat so entitlements stay unified.

**The three SKUs** (from the paywall work): Just Tonight $2.99 / Monthly $6.99 / Yearly $34.99, with Yearly as the anchor.

**One classification caution:** "Just Tonight" — a 24-hour, no-renewal pass — needs careful product-type modeling on iOS. Apple scrutinizes time-limited passes for whether they masquerade as auto-renewing subscriptions. Model it cleanly as a non-renewing subscription or consumable (RevenueCat supports both) and make the no-renewal nature unmistakable in the store listing and the purchase button. Confirm current per-token pricing and IAP product-type rules at build time — both move.

**The rule that prints trust:** never charge for the cool-down, and say so on the paywall. "We will never charge you to *not* send something" is the single most trust-building sentence in the app, and it costs nothing.

---

## 8. Metrics — content-free instrumentation

You can measure everything that matters without ever storing a word, because the metrics are about *decisions*, not *content*.

**The ones that govern:**
- **Second-crisis return rate** (60-day window) — the real north star. Resurrection, not DAU.
- **Install→mirror completion** — funnel health. Below ~60%, the first suspect is the "who" screen.
- **Receipt share→install (k-factor)** — decides whether you ever need paid acquisition.
- **Cool-down notification opt-in** — a trust gauge.
- **Vault revisit rate** — leading indicator of annual renewal.

**Anti-metrics (rising = warning, not win):**
- Average session frequency creeping up. Someone opening Unsend daily has a life problem the app should help *fix*, not farm.
- Any pressure to reveal real words for reach. That line never moves.

All of these are ticks and categories. None require message content. The measurement respects the architecture.

---

## 9. Risk register

| Risk | Mitigation |
|---|---|
| **App Store rejection** (subscriptions, "Just Tonight" classification, wellbeing-app rules) | Clean IAP product types; ship the safety path as P0; budget generous review time in Phase 3. |
| **Self-harm / crisis content** | The §3.6 safety path is launch-blocking, not a fast-follow. Ethical first, compliance second. |
| **Privacy-claim drift** | Keep public claims scoped to what *you* do ("we don't store it, we can't read it") + the plain "an AI service rewrites it, not stored or trained on" disclosure. Avoid absolute/duration claims like "never leaves your phone" (§4). |
| **OpenRouter misconfiguration** | Three parties touch the draft (proxy, OpenRouter, provider). Verify all three per §3.2: proxy no-log, OpenRouter logging/discount toggles off, per-request no-retention/no-training data-policy filter. Re-check the chosen model+provider's retention line at build time — they change. |
| **Engine cost/latency at scale** | The rewrite is short in/short out — per-call cost stays negligible vs SKU price; cap output tokens; keep inference inside the ceremony pause. |
| **Virality dependency** | The whole acquisition model leans on Receipt + mirror-gasp sharing. If k-factor underperforms in Phase 1, you learn it *before* spending on a native build. |

---

## 10. Open questions to test (not debate)

These resolve with data, not argument — flagged so you instrument for them early:

1. **Paywall on 2nd vs 3rd use.** Second is the recommendation (intent decays fast; many users have one crisis and vanish). But if mirror shares drive heavy viral install, a third free read buys more sharing first. A/B it.
2. **Kill the "who" screen?** It earns its slot *only* if recipient context measurably improves mirror quality. If the model infers the recipient fine from the draft (it often can), delete the screen — two screens beats three.
3. **Just Tonight cannibalization.** If $2.99 eats subscriptions hard, raise it to $3.99 before touching anything else. Watch the repeat-buyers-who-should-upgrade cohort; that realization is your organic upsell.
4. **Paddle vs Stripe on web.** Decide on tax tolerance, not feature lists.
5. **Web→native entitlement carry-over.** Test the "paid on PWA, opens the app" path explicitly in Phase 3. It's the kind of thing that quietly breaks and churns your best users.

---

*The best message is the one you almost sent. The best architecture is the one where the promise and the code say the same thing.*
