# Unsent.

For everything you almost said. Catches the message you're about to
regret, mirrors how it will actually read, offers the calmer version —
then lets you send the better one or burn the original.

Specs: [unsent-development-plan.md](unsent-development-plan.md) (the
build) · [brand-guidelines.md](brand-guidelines.md) (the voice).

## The no-log rule

This rule outranks debugging convenience, analytics curiosity, and
every future feature:

> **No draft text is ever logged, stored server-side, or sent anywhere
> except the single OpenRouter call that rewrites it.** The engine
> proxy (`web/src/app/api/rewrite/route.ts`) is the only server code
> that may touch a draft. No logging middleware, no analytics, no
> error reporting on that route — error telemetry is status code and
> latency only. IP is never read. No database is ever in the path.

"We never store your messages. We can't read them." is the business
model. PRs that touch the proxy get reviewed against this paragraph.

## Layout

```
web/             Next.js PWA (App Router, Tailwind, framer-motion)
engine/          system prompt, OpenRouter privacy checklist, smoke tests
reference-code/  UI/UX + flow reference prototypes (not architecture)
```

## Develop

```bash
cd web && npm install && npm run dev
```

Engine env (`web/.env.local`, server-side only): `OPENROUTER_API_KEY`,
`OPENROUTER_MODEL`, optional `OPENROUTER_FALLBACK_MODELS`. See
[engine/README.md](engine/README.md) for the OpenRouter privacy
checklist — required before the first real draft flows.

Smoke-test the engine (dev server running):

```bash
node engine/smoke.mjs
```

After editing `engine/prompt.txt`: `cd web && npm run sync-prompt`.
