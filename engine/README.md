# Unsent. — The Engine

The rewrite engine per the development plan (§3): one OpenRouter
integration behind a stateless no-log proxy, one prompt that returns
both halves of the result screen.

## Layout

```
engine/
  prompt.txt       ← the system prompt, canonical. Returns {mirror, rewrite, crisis}.
  sync-prompt.mjs  ← regenerates web/src/lib/engine/prompt.ts after edits
  drafts.json      ← 60 synthetic rage drafts for smoke-testing & model A/B
  smoke.mjs        ← Phase 0 gate helper: runs drafts through the live proxy
```

The proxy lives at `web/src/app/api/rewrite/route.ts` — the only
server code that ever touches a draft.

## Env vars (server-side only, never in the client)

| Var | What |
|---|---|
| `OPENROUTER_API_KEY` | required |
| `OPENROUTER_MODEL` | the chosen model, e.g. `vendor/model` — **still to be decided** |
| `OPENROUTER_FALLBACK_MODELS` | optional, comma-separated fallback list |

## OpenRouter privacy checklist (plan §3.2 — do all three)

The per-request `provider: { data_collection: "deny" }` filter is
already in the proxy code. The **account-side** settings can't be done
in code — do them in the OpenRouter dashboard before the first real
draft flows:

- [ ] *Private Input/Output Logging* — leave **off** (off by default).
- [ ] The 1% *inputs/outputs usage* discount — do **not** enable it.
- [ ] Privacy settings: opt out of providers that train on prompts;
      set the account-wide data-policy requirement.
- [ ] After the first test calls, confirm in the dashboard that no
      prompt content appears on the account.
- [ ] When the model is chosen: verify that model+provider's
      retention/training line on its OpenRouter page — these change.
- [ ] Set a hard spend cap on the account (the rate limiter is
      best-effort; the cap is the real backstop).

## The gate (Phase 0 DoD)

Paste a real, ugly draft → a *specific*, your-own-words mirror + a
usable rewrite, as valid JSON, ≤ ~2.5s p95. Mechanical check + fast
eyeballing:

```bash
# dev server running with the env vars set
node engine/smoke.mjs            # curated 8-draft spread (incl. crisis + calm)
node engine/smoke.mjs --all      # all 60
```

If a mirror reads like a horoscope ("this seems accusatory"), stop
and fix the prompt — nothing downstream matters until the gasp lands.
After any prompt edit: `npm run sync-prompt` (from `web/`).

## Prompt rules of thumb

- The mirror must quote the draft's load-bearing phrase back. That is
  the product.
- The rewrite keeps the spine (grievance + boundary survive) and the
  sender's voice. Pleasant-but-gutless is the worst failure mode.
- `crisis: true` breaks the flow client-side (plan §3.6) — the safety
  path is launch-blocking, never paywalled, never counted.
