/**
 * Unsent. design tokens — the single source of truth shared with the
 * future Expo renderer (dev plan §1: one design system, two renderers).
 * The CSS theme in globals.css mirrors these; change both together.
 */

export const color = {
  candlelight: "#fffbeb",
  midnightStone: "#1c1917",
  burnOrange: "#c2410c", // heat moments only — never decorative
  ember: "#fed7aa",
  ash: "#a8a29e",
  paper: "#ffffff",
  paperBorder: "#e7e5e4",
} as const;

export const timing = {
  revealMs: 350,
  revealRisePx: 16,
  burnMs: 2500, // "a burn that completes in 200ms is a bug" (dev plan §0)
} as const;

export const composer = {
  /** "Show me the mirror" appears only after this many words (dev plan §5.1). */
  ctaWordThreshold: 10,
} as const;

export const CATEGORIES = [
  { id: "ex", label: "an ex" },
  { id: "boss", label: "boss" },
  { id: "family", label: "family" },
  { id: "friend", label: "friend" },
  { id: "other", label: "other" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

// FEELINGS is retired from the UI (goal replaced it, 2026-06-12). The
// engine contract still accepts `feeling` as nullable; kept here only in
// case a future surface wants it.
export const FEELINGS = [
  { id: "hurt", label: "hurt" },
  { id: "angry", label: "angry" },
  { id: "anxious", label: "anxious" },
  { id: "done", label: "done" },
  { id: "hopeful", label: "hopeful" },
] as const;

export type FeelingId = (typeof FEELINGS)[number]["id"];

/**
 * What the sender wants THIS message to achieve — per recipient. The chip
 * label is plain (mid-crisis scanning; wit lives in the step framing); the
 * `goal` string is the directive sent to the engine to condition the
 * rewrite. Each list spans the emotional range (reconcile → express →
 * firm → done) so one tap carries both mood and intent.
 */
export type GoalOption = { label: string; goal: string };

export const GOALS: Record<CategoryId, GoalOption[]> = {
  ex: [
    { label: "Get closure", goal: "get closure — let it end clean" },
    { label: "Set a boundary", goal: "set a boundary; make the line clear" },
    { label: "Say what I held back", goal: "say what was left unsaid" },
    { label: "Leave a door open", goal: "reach out without begging; leave a door open" },
  ],
  boss: [
    { label: "Push back, safely", goal: "push back without damaging the relationship" },
    { label: "Set a limit", goal: "set a boundary on workload or time" },
    { label: "Ask for what I'm owed", goal: "ask for what I'm owed — credit, raise, or time" },
    { label: "Say no without the fallout", goal: "decline cleanly without burning the bridge" },
  ],
  family: [
    { label: "Set a boundary", goal: "set a boundary, with love" },
    { label: "Say no without a fight", goal: "say no while keeping the peace" },
    { label: "Name the hurt", goal: "name an old hurt without reopening the fight" },
    { label: "Keep the peace", goal: "lower the stakes and keep the peace" },
  ],
  friend: [
    { label: "Clear the air", goal: "clear the air" },
    { label: "Call them on it", goal: "call out what they did, without cruelty" },
    { label: "Set a boundary", goal: "set a boundary" },
    { label: "Smooth it over", goal: "repair it and smooth it over" },
  ],
  other: [
    { label: "Be heard", goal: "make my point land" },
    { label: "Hold the line", goal: "stay firm but fair" },
    { label: "Get it resolved", goal: "ask for a fix or resolution" },
    { label: "Don't make it worse", goal: "de-escalate; say it without making it worse" },
  ],
};
