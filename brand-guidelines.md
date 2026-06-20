# Unsend. — Brand Guidelines

**Version 1.0 — The book of almost.**

---

## 1. What This Is

Unsend is a pressure valve disguised as an app. It catches the message
you're about to regret, shows you a calmer reflection of yourself, and
lets you choose — send the better version, or burn the original and
walk away.

We are not a mental health app. We are not a journaling app. We are not
a texting app. We are the eleven seconds between rage and regret, made
into a place.

**Category of one:** "the app for everything you almost said."

---

## 2. The Name

- Always written **Unsend.** — capital U, with the period. The period
  is the product: a full stop where a send button used to be.
- The period is set in **burn orange** in all brand lockups.
- Never "UNSEND", never "unsend app", never pluralized, never verbed in
  official copy ("I unsent it" belongs to users; let them have it).

---

## 3. Brand Essence

**One line:** The best message is the one you almost sent.

**The promise:** Your words are sacred. We don't read them, we don't
keep them, we don't show them to anyone — including ourselves.

**The feeling:** A candlelit room at midnight. Warm, dim, private,
slightly ceremonial. Not a clinic. Not a gym. Not a confession booth —
there's no one on the other side of the screen judging you.

**The user, in their own words:** "I am dangerous but evolved."

---

## 4. Voice & Tone

Unsend speaks like a wise friend at 2am — calm, dry, a little funny,
never clinical, never preachy.

### The Five Rules

1. **Never shame.** Every outcome is met with the same warmth —
   including "I sent the original anyway." The pause was the win.
2. **Never therapize.** No "emotional regulation," no "mindfulness,"
   no "journey." We say "calmer," "almost," "let it go," "future-you."
3. **Wink, don't joke.** One dry line per screen, maximum. Humor is
   seasoning, not the dish. ("EST. SAVINGS: 1 FRIENDSHIP")
4. **Speak in seconds, not features.** We never say "AI-powered
   rewriting engine." We say "the calmer version of what you meant."
5. **Short sentences at heavy moments.** When the user is in pain,
   drop the wit entirely. "Gone. For good." Three words, no flourish.

### Copy Bank (approved lines)

- "The best message is the one you almost sent."
- "For everything you almost said."
- "Still thinking about it?"
- "Let them wonder what it said."
- "No judgment either way. This stays between you and you."
- "Some things don't need a record."
- "We can't read it. We don't want to."
- "Future-you says thanks."

### Forbidden Vocabulary

journey · wellness · mindful · toxic · self-care · empower ·
community · streak · engage · unlock your potential · AI-powered

---

## 5. Visual Identity

### Color

| Role | Name | Tailwind | Hex |
|---|---|---|---|
| Canvas | Candlelight | `amber-50` | `#FFFBEB` |
| Ink | Midnight Stone | `stone-900` | `#1C1917` |
| Accent | Burn Orange | `orange-700` | `#C2410C` |
| Soft accent | Ember | `orange-200/300` | `#FED7AA` |
| Support text | Ash | `stone-400/500/600` | `#A8A29E` |
| Surfaces | Paper | `white` + `stone-200` border | `#FFFFFF` |

**Rules:** Burn orange appears only at moments of heat — the draft, the
burn, the period in the logo, destructive-but-cathartic actions. It is
never decorative. Dark mode inverts to stone-900 canvas with amber-50
ink; the orange does not change. No gradients. No pure black, no pure
blue — blue is the color of the send button we exist to interrupt.

### Typography

| Use | Style | Suggested faces |
|---|---|---|
| Brand & ritual headlines | Serif, italic, tight tracking | Newsreader Italic, Instrument Serif |
| Body & UI | Humanist sans | Inter, system stack |
| Receipts, stats, vault metadata | Monospace | IBM Plex Mono, JetBrains Mono |

The serif is the voice of the calmer self. The mono is the forensic
record. The sans is furniture. Never set rage in the serif — user
drafts always render in plain sans, because their anger is theirs, not
ours to aestheticize.

### Motion

Slow is the brand. Every animation answers one question: *does this
feel like a ritual or a transaction?*

- The Burn: ~2.5s, words drift apart and blur. Never instant.
- Reveals: fade + small rise (16px), 350ms, ease-out.
- Nothing bounces. Nothing pulses for attention. No confetti, ever —
  catharsis is quiet.

### Iconography

Lucide, thin stroke. The brand's five objects: **flame** (release),
**archive** (the Vault), **lock** (the promise), **receipt** (the
record), **sparkles** (aftermath — used once, never repeated per flow).

---

## 6. The Named Rituals

These names are product law. Never rename, never abbreviate in UI.

**The Mirror and the Rewrite are two different things** — this split is
load-bearing. The Mirror is the *honest read* (how your words will
actually land); the Rewrite is the *calmer version* you could send
instead. They appear together on the result screen, but the gasp lives
in the Mirror, and it is always free.

| Ritual | What it is | One-line internal definition |
|---|---|---|
| **The Mirror** | How the draft will actually read — your own load-bearing words, reflected back | "The gasp." Always free. |
| **The Rewrite** | The calm, sendable version of what you meant | Calm & direct. Free with the Mirror on the first crisis. |
| **The Tones** | Three alternate registers of the Rewrite — Warm, Final, Unbothered | The Pro upsell. Same spine, different posture. |
| **The Cool-down** | The single one-hour-later check-in | The only notification we will ever send. |
| **The Burn** | Ceremonial deletion of the original | Closure as UI. The most filmed moment in the app. |
| **The Vault** | On-device archive of kept messages | A body of evidence, not a feed. |
| **The Receipt** | The wordless shareable artifact | Shapes, not words. Curiosity, not content. |

---

## 7. Privacy Language — Legal-Grade Precision

This section outranks every other section. Marketing may not improvise
here.

**Approved claims (architecture-dependent — see engineering docs):**

- "We never store your messages." ✅ (requires zero-retention pipeline)
- "Your messages are never saved on our servers." ✅
- "Kept messages live on your device only." ✅
- "We can't read your Vault. We don't want to." ✅
- "The Receipt holds shapes, not words." ✅

**Required disclosure (the engine uses an external AI via OpenRouter):**

- "An AI service rewrites your message. It isn't stored, logged, or used
  to train anything — and we can't read it." ✅

This is the honest accounting of the one place a draft leaves our
servers. Configured per the engine docs (no-retention/no-training
routing), it's true. Say it plainly in the privacy copy and store
listing; it is the reason the conditional claim below stays banned.

**Conditional claim — use ONLY if the message engine runs on-device:**

- "Your words never leave your phone." ⚠️

If the rewrite engine calls any external API, this sentence is a lie
and is banned from all surfaces, app store copy, and social. Use
"never stored" framing instead. (See: engine architecture decision.)

**Never say:** "military-grade," "100% anonymous," "unhackable,"
or any claim we cannot survive in a deposition.

---

## 8. The Anti-List (Brand-Level Bans)

These would feel like growth and act like poison:

1. **No streaks.** Rewarding crisis frequency is morally upside-down.
2. **No daily prompts.** A crisis app texting "how are you feeling
   today?" is a stranger texting "you up?"
3. **No re-engagement pushes.** "We miss you" breaks the one promise
   the paywall is priced on: *we're not trying to keep you here.*
4. **No social feed.** Other people's pain is not content inside the
   app. Aggregate numbers only, and only outside it.
5. **No word-reveal mechanics.** No future feature may pressure users
   to expose actual message text for reach. This line never moves.

---

## 9. Social & Content

- **The weekly monument:** aggregate-only posts. "This week: 41,302
  messages to exes, not sent." Counters only — no content, no excerpts,
  no 'best of.'
- **Creator formats we feed:** the mirror-gasp reaction video, the
  Receipt share, "what would you have sent?" prompt packs for duets.
- **We never post a user's Receipt** without explicit permission, even
  though it contains no words. The silhouette of someone's rage is
  still theirs.
- Reply style on socials: same voice as the app. Dry, warm, brief.
  We do not dunk, even on competitors.

---

## 10. North-Star Test

Before shipping anything — feature, post, push, pixel — ask:

> **"Does this make the next 11:47pm more likely to come to us,
> without making 11:47pm more likely to happen?"**

If a thing grows the app by growing the pain, kill it.
