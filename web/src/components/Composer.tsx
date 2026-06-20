"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  Briefcase,
  Check,
  Clock,
  Copy,
  Crown,
  Download,
  Eye,
  Flame,
  Heart,
  Home,
  Lock,
  MessageCircle,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Share2,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Wordmark from "@/components/Wordmark";
import { sendCounterTick } from "@/lib/counters";
import {
  requestRewrite,
  type EngineError,
  type EngineResult,
  type EngineTones,
} from "@/lib/engine/client";
import { looksLikeCrisis } from "@/lib/engine/safety";
import {
  FIND_A_HELPLINE,
  resolveCrisisRegion,
} from "@/lib/crisis-resources";
import {
  isRemoteEntitlementEnabled,
  restoreEntitlement,
  syncEntitlement,
} from "@/lib/entitlement";
import {
  getEntitlement,
  getReadCount,
  incrementReadCount,
  recordDecision,
  recordFunnelEvent,
  resetAllLocalData,
  type DecisionCounts,
  type DecisionKind,
  type EntitlementPlan,
  type EntitlementState,
} from "@/lib/local-state";
import { SKUS, startCheckout } from "@/lib/payments";
import { computeDraftStats, type DraftStats } from "@/lib/stats";
import {
  CATEGORIES,
  GOALS,
  composer,
  timing,
  type CategoryId,
} from "@/lib/tokens";
import {
  clearVault,
  loadVaultEntries,
  loadVaultSummary,
  saveVaultEntry,
  type VaultEntry,
  type VaultSummary,
} from "@/lib/vault";

const MIN_CEREMONY_MS = 1600;
const SAMPLE_DRAFT =
  "wow. so you can post stories all weekend but my text from THURSDAY is still on read. you know what, don't even bother replying, I clearly know where I stand. hope the new friends are fun.";

const ERROR_COPY: Record<EngineError, string> = {
  engine_unavailable: "The mirror couldn't load. Take a breath and try again.",
  rate_limited: "That's a lot of mirrors in one hour. It resets soon.",
  network: "You're offline. We'll be here when you're back.",
  bad_request: "Something about that draft didn't go through. Try again.",
};

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  ex: Heart,
  boss: Briefcase,
  family: Home,
  friend: Users,
  other: MessageCircle,
};

// The dry, knowing line under the mirror — the per-recipient insight that
// makes the read feel like it understands the situation. Conversion fuel.
const RECIPIENT_NOTES: Record<CategoryId, string> = {
  ex: "With an ex, every word gets re-read three times. Calm is the only thing that can't be used against you.",
  boss: "This one has a salary attached. We kept it direct and removed everything HR could screenshot.",
  family: "Family remembers the tone long after the words. This says the hard thing without starting the old fight.",
  friend: "Friendships survive honesty better than they survive sarcasm. The point stays; the barbs go.",
  other: "Said plainly, it's hard to argue with. That's the version that actually gets a reply.",
};

// The locked premium: alternate registers of the same message, named in
// Unsend's voice (not the generic "Firm & Final"). Keys match EngineTones.
const TONES: Array<{ key: keyof EngineTones; label: string; note: string }> = [
  { key: "warm", label: "Warm", note: "kind — and it still lands" },
  { key: "final", label: "Final", note: "said once, and done" },
  { key: "unbothered", label: "Unbothered", note: "short, like you've already moved on" },
];

type Stage =
  | "boot"
  | "arrival"
  | "recipient"
  | "goal"
  | "compose"
  | "reading"
  | "result"
  | "cooldown"
  | "outcome"
  | "decision"
  | "burning"
  | "released"
  | "receipt"
  | "vault";

type SentOutcome = "calmer" | "nothing" | "original";

// Which version(s) this crisis is entitled to, captured at generation time.
//  - first:     free mirror + rewrite; tones teased (first taste).
//  - returning: free mirror only; rewrite + tones locked.
//  - paid:      everything.
type ResultTier = "first" | "returning" | "paid";

const REWRITE_TEASER =
  "the calmer version of what you meant — clear, sendable, and unmistakably yours.";

type MotionPreset = {
  initial: { opacity: number; y?: number };
  animate: { opacity: number; y?: number };
  exit: { opacity: number; y?: number };
  transition: { duration: number; ease: "easeOut" };
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function categoryLabel(category: CategoryId | null) {
  return CATEGORIES.find((c) => c.id === category)?.label ?? "someone";
}

function PrivacyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 font-receipt text-xs leading-relaxed text-ash">
      <Lock size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function AppHeader({
  canGoBack,
  onBack,
  onReset,
  onVault,
}: {
  canGoBack: boolean;
  onBack: () => void;
  onReset: () => void;
  onVault: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 py-6">
      <button type="button" onClick={onReset} aria-label="Start over">
        <Wordmark className="text-2xl" />
      </button>
      <div className="flex items-center gap-4">
        {canGoBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 font-receipt text-xs uppercase tracking-wider text-ash transition-colors hover:text-ash-deep"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            back
          </button>
        )}
        <button
          type="button"
          onClick={onVault}
          aria-label="Open Vault"
          title="Vault"
          className="text-ash transition-colors hover:text-ash-deep"
        >
          <Archive size={20} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}

function ArrivalScreen({
  motionPreset,
  onStart,
  onSample,
}: {
  motionPreset: MotionPreset;
  onStart: () => void;
  onSample: () => void;
}) {
  return (
    <motion.section
      key="arrival"
      {...motionPreset}
      className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden pb-12 text-center"
    >
      <p className="mx-auto max-w-xs font-receipt text-[10px] uppercase leading-relaxed tracking-[0.18em] text-burn sm:max-w-none sm:text-xs sm:tracking-[0.22em]">
        For everything you almost said
      </p>
      <h1 className="mx-auto mt-5 max-w-[10ch] font-brand text-4xl italic leading-[1.02] tracking-tight sm:max-w-none sm:text-6xl sm:leading-[0.95]">
        The best message is the one you almost sent.
      </h1>
      <p className="mx-auto mt-6 max-w-80 text-sm leading-relaxed text-ash-deep sm:max-w-sm">
        Paste the version you actually typed. The Mirror shows how it lands,
        then offers the calmer version of what you meant.
      </p>
      <p className="mx-auto mt-3 max-w-80 font-receipt text-xs leading-relaxed text-ash sm:max-w-sm">
        Not therapy. Not a journal. Just the pause between rage and regret.
      </p>
      <div className="mx-auto mt-10 flex w-full max-w-80 flex-col gap-3 sm:max-w-sm">
        <button
          type="button"
          onClick={onStart}
          className="rounded-2xl bg-ink px-5 py-4 text-base font-medium text-canvas transition-colors hover:bg-ash-deep"
        >
          I have a message I shouldn&apos;t send
        </button>
        <button
          type="button"
          onClick={onSample}
          className="rounded-2xl border border-paper-border bg-paper px-5 py-4 text-sm text-ash-deep transition-colors hover:border-ash hover:text-ink"
        >
          Just looking? Try a sample.
        </button>
      </div>
      <div className="mx-auto mt-10 max-w-80 sm:max-w-sm">
        <PrivacyLine>
          We never store your messages. We can&apos;t read them.
        </PrivacyLine>
      </div>
    </motion.section>
  );
}

function CustomRecipientInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  // Typed recipient for "Other" — gives the engine real context.
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value.slice(0, 40))}
      maxLength={40}
      placeholder="Who is it? (a landlord, a teacher, a group chat…)"
      className="mt-2 w-full rounded-2xl border border-paper-border bg-paper px-4 py-3 text-sm text-ink placeholder:text-ash focus:border-ash focus:outline-none"
    />
  );
}

function CategoryPicker({
  value,
  customRecipient,
  onChange,
  onCustomRecipient,
}: {
  value: CategoryId | null;
  customRecipient: string;
  onChange: (value: CategoryId | null) => void;
  onCustomRecipient: (value: string) => void;
}) {
  return (
    <div className="mt-5">
      <p className="font-receipt text-xs uppercase tracking-wider text-ash">
        To
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {CATEGORIES.map((category) => {
          const selected = value === category.id;
          const Icon = CATEGORY_ICONS[category.id];
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : category.id)}
              className={classNames(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-3 text-sm transition-colors",
                selected
                  ? "border-ink bg-ink text-canvas"
                  : "border-paper-border bg-paper text-ash-deep hover:border-ash hover:text-ink",
              )}
            >
              <Icon size={18} strokeWidth={1.5} />
              {category.label}
            </button>
          );
        })}
      </div>
      {value === "other" && (
        <CustomRecipientInput value={customRecipient} onChange={onCustomRecipient} />
      )}
    </div>
  );
}

// What the sender wants this message to achieve — replaced the feeling
// picker (the draft already carries the feeling; only the user knows the
// goal, and the goal conditions the rewrite). Options are per-recipient.
function GoalPicker({
  category,
  value,
  onChange,
}: {
  category: CategoryId | null;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const options = category ? GOALS[category] : [];
  const isPreset = options.some((o) => o.goal === value);
  const [customOpen, setCustomOpen] = useState(value !== null && !isPreset);

  if (!category) {
    return (
      <div className="mt-5">
        <p className="font-receipt text-xs uppercase tracking-wider text-ash">
          What you want
        </p>
        <p className="mt-2 text-sm text-ash">Pick who it&apos;s for first.</p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <p className="font-receipt text-xs uppercase tracking-wider text-ash">
        What you want
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.goal;
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setCustomOpen(false);
                onChange(selected ? null : option.goal);
              }}
              className={classNames(
                "rounded-full border px-3 py-2 text-sm transition-colors",
                selected
                  ? "border-ink bg-ink text-canvas"
                  : "border-paper-border bg-paper text-ash-deep hover:border-ash hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={customOpen && !isPreset}
          onClick={() => {
            setCustomOpen(true);
            if (isPreset) onChange(null);
          }}
          className={classNames(
            "rounded-full border border-dashed px-3 py-2 text-sm transition-colors",
            customOpen && !isPreset
              ? "border-ink bg-ink text-canvas"
              : "border-paper-border bg-paper text-ash-deep hover:border-ash hover:text-ink",
          )}
        >
          Something else…
        </button>
      </div>
      {customOpen && (
        <input
          type="text"
          autoFocus
          value={isPreset ? "" : (value ?? "")}
          onChange={(event) =>
            onChange(event.target.value.slice(0, 60).trimStart() || null)
          }
          maxLength={60}
          placeholder="In your words — what do you want here?"
          className="mt-2 w-full rounded-2xl border border-paper-border bg-paper px-4 py-3 text-sm text-ink placeholder:text-ash focus:border-ash focus:outline-none"
        />
      )}
    </div>
  );
}

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={classNames(
            "h-1.5 rounded-full transition-all",
            i === step ? "w-5 bg-ink" : "w-1.5 bg-paper-border",
          )}
        />
      ))}
    </div>
  );
}

function RecipientStep({
  motionPreset,
  value,
  customRecipient,
  onPick,
  onCustomRecipient,
  onContinue,
}: {
  motionPreset: MotionPreset;
  value: CategoryId | null;
  customRecipient: string;
  onPick: (value: CategoryId) => void;
  onCustomRecipient: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <motion.section key="recipient" {...motionPreset} className="flex flex-1 flex-col pb-10">
      <div className="flex justify-center py-2">
        <ProgressDots step={0} total={3} />
      </div>
      <h1 className="mt-6 font-brand text-4xl italic tracking-tight">
        Who&apos;s on the other end?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ash-deep">
        The same words land differently depending on who reads them.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3">
        {CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category.id];
          const selected = value === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onPick(category.id)}
              className={classNames(
                "flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                selected
                  ? "border-ink bg-ink text-canvas"
                  : "border-paper-border bg-paper text-ink hover:border-ash",
              )}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span className="text-sm font-medium">{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* "Other" stays on this step to capture who it actually is. */}
      {value === "other" && (
        <div className="mt-4">
          <CustomRecipientInput value={customRecipient} onChange={onCustomRecipient} />
          <button
            type="button"
            onClick={onContinue}
            className="mt-3 w-full rounded-2xl bg-ink px-5 py-4 text-base font-medium text-canvas transition-colors hover:bg-ash-deep"
          >
            Continue
          </button>
        </div>
      )}
    </motion.section>
  );
}

function GoalStep({
  motionPreset,
  category,
  value,
  onPick,
  onSkip,
}: {
  motionPreset: MotionPreset;
  category: CategoryId | null;
  value: string | null;
  onPick: (goal: string) => void;
  onSkip: () => void;
}) {
  const options = category ? GOALS[category] : GOALS.other;
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  return (
    <motion.section key="goal" {...motionPreset} className="flex flex-1 flex-col pb-10">
      <div className="flex justify-center py-2">
        <ProgressDots step={1} total={3} />
      </div>
      <h1 className="mt-6 font-brand text-4xl italic tracking-tight">
        What do you want out of this?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ash-deep">
        We&apos;ll write toward it. Messaging {categoryLabel(category)}.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onPick(option.goal)}
            className={classNames(
              "rounded-2xl border p-4 text-left text-sm font-medium transition-colors",
              value === option.goal
                ? "border-ink bg-ink text-canvas"
                : "border-paper-border bg-paper text-ink hover:border-ash",
            )}
          >
            {option.label}
          </button>
        ))}

        {customOpen ? (
          <div className="rounded-2xl border border-dashed border-paper-border bg-paper p-4">
            <input
              type="text"
              autoFocus
              value={customText}
              onChange={(event) => setCustomText(event.target.value.slice(0, 60))}
              maxLength={60}
              placeholder="In your words — what do you want here?"
              className="w-full bg-transparent text-sm text-ink placeholder:text-ash focus:outline-none"
            />
            <button
              type="button"
              disabled={!customText.trim()}
              onClick={() => onPick(customText.trim())}
              className="mt-3 w-full rounded-xl bg-ink py-3 text-sm font-medium text-canvas transition-colors hover:bg-ash-deep disabled:cursor-not-allowed disabled:bg-paper-border disabled:text-ash"
            >
              Continue
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            className="rounded-2xl border border-dashed border-paper-border bg-paper p-4 text-left text-sm font-medium text-ash-deep transition-colors hover:border-ash hover:text-ink"
          >
            Something else…
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="mx-auto mt-6 text-sm text-ash underline underline-offset-4 transition-colors hover:text-ash-deep"
      >
        Not sure yet — just show me.
      </button>
    </motion.section>
  );
}

function ComposeScreen({
  motionPreset,
  draft,
  category,
  customRecipient,
  goal,
  error,
  ready,
  onDraft,
  onCategory,
  onCustomRecipient,
  onGoal,
  onSubmit,
  onSample,
}: {
  motionPreset: MotionPreset;
  draft: string;
  category: CategoryId | null;
  customRecipient: string;
  goal: string | null;
  error: EngineError | null;
  ready: boolean;
  onDraft: (value: string) => void;
  onCategory: (value: CategoryId | null) => void;
  onCustomRecipient: (value: string) => void;
  onGoal: (value: string | null) => void;
  onSubmit: () => void;
  onSample: () => void;
}) {
  return (
    <motion.section key="compose" {...motionPreset} className="flex flex-1 flex-col pb-8">
      <div className="mt-7">
        <p className="font-receipt text-xs uppercase tracking-[0.22em] text-ash">
          The draft
        </p>
        <h1 className="mt-3 font-brand text-4xl italic tracking-tight">
          Paste it. All of it.
        </h1>
      </div>

      <textarea
        autoFocus
        value={draft}
        onChange={(event) => onDraft(event.target.value)}
        aria-label="Your message"
        placeholder="The version you actually typed - not the polite one."
        className="mt-6 min-h-56 w-full flex-1 resize-none rounded-2xl border border-paper-border bg-paper p-4 text-base leading-relaxed text-ink placeholder:text-ash focus:border-ash focus:outline-none"
      />

      <CategoryPicker
        value={category}
        customRecipient={customRecipient}
        onChange={onCategory}
        onCustomRecipient={onCustomRecipient}
      />
      <GoalPicker category={category} value={goal} onChange={onGoal} />

      <div className="mt-6 min-h-24">
        <AnimatePresence>
          {ready && (
            <motion.button
              type="button"
              onClick={onSubmit}
              initial={motionPreset.initial}
              animate={motionPreset.animate}
              exit={motionPreset.exit}
              transition={motionPreset.transition}
              className="w-full rounded-2xl bg-ink py-4 text-base font-medium text-canvas transition-colors hover:bg-ash-deep"
            >
              Show me the mirror
            </motion.button>
          )}
        </AnimatePresence>
        {!draft.trim() && (
          <button
            type="button"
            onClick={onSample}
            className="mt-4 text-sm text-ash underline underline-offset-4 transition-colors hover:text-ash-deep"
          >
            No draft right now? Try one of ours.
          </button>
        )}
        {error && (
          <p className="mt-4 text-center text-sm text-ash-deep">
            {ERROR_COPY[error]}
          </p>
        )}
      </div>

      <PrivacyLine>
        An AI service rewrites your draft, then it&apos;s gone. Not stored,
        not logged, never used to train.
      </PrivacyLine>
    </motion.section>
  );
}

function ReadingScreen({ motionPreset }: { motionPreset: MotionPreset }) {
  return (
    <motion.section
      key="reading"
      {...motionPreset}
      className="flex flex-1 flex-col items-center justify-center pb-14 text-center"
    >
      <Eye size={28} strokeWidth={1.4} className="text-burn" />
      <p className="mt-6 font-brand text-3xl italic text-ash-deep">
        Taking an honest look...
      </p>
      <p className="mt-3 font-receipt text-xs uppercase tracking-wider text-ash">
        Reading it the way they will.
      </p>
    </motion.section>
  );
}

function CrisisScreen({
  motionPreset,
  onBack,
}: {
  motionPreset: MotionPreset;
  onBack: () => void;
}) {
  // Region from the browser locale only (no IP, no server). null → show the
  // universal emergency + findahelpline guidance.
  const region = resolveCrisisRegion();

  return (
    <motion.section
      key="crisis"
      {...motionPreset}
      className="flex flex-1 flex-col justify-center pb-12 text-center"
    >
      <p className="font-brand text-3xl italic leading-snug">
        Some things are bigger than a draft.
      </p>
      <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-ash-deep">
        If you might hurt yourself or someone else, call your local emergency
        number now.
        {region
          ? ` If you need someone with you in the next minute, reach a trained counselor in ${region.region}:`
          : " If you need someone with you in the next minute, a trained counselor is one tap away:"}
      </p>
      <div className="mx-auto mt-8 grid w-full max-w-sm gap-3">
        {region?.actions.map((action, index) => (
          <a
            key={action.href}
            href={action.href}
            className={classNames(
              "rounded-2xl px-5 py-4 text-base font-medium",
              index === 0
                ? "bg-ink text-canvas"
                : "border border-paper-border bg-paper text-ink",
            )}
          >
            {action.label}
          </a>
        ))}
        <a
          href={FIND_A_HELPLINE}
          target="_blank"
          rel="noreferrer"
          className={classNames(
            region
              ? "text-sm text-ash underline underline-offset-4 transition-colors hover:text-ash-deep"
              : "rounded-2xl bg-ink px-5 py-4 text-base font-medium text-canvas",
          )}
        >
          {region ? "Find a helpline anywhere" : "Find a helpline near you"}
        </a>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="mt-10 text-sm text-ash underline underline-offset-4 hover:text-ash-deep"
      >
        Back
      </button>
    </motion.section>
  );
}

function formatExpiry(entitlement: EntitlementState) {
  if (!entitlement.expiresAt) return null;
  const date = new Date(entitlement.expiresAt);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function PaywallPanel({
  entitlement,
  checkoutNote,
  onChoose,
  onRestore,
}: {
  entitlement: EntitlementState;
  checkoutNote: string | null;
  onChoose: (plan: EntitlementPlan) => void;
  onRestore: () => void;
}) {
  const expiry = formatExpiry(entitlement);

  return (
    <div className="mt-5 rounded-2xl border border-ember/60 bg-canvas p-4 text-ink">
      <div className="flex items-start gap-3">
        <Crown size={20} strokeWidth={1.5} className="mt-0.5 text-burn" />
        <div>
          <p className="font-brand text-xl italic leading-tight">
            The honest read is free. The composed version is ready.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ash-deep">
            We will never charge you to not send something.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {SKUS.map((sku) => (
          <button
            key={sku.id}
            type="button"
            onClick={() => onChoose(sku.id)}
            className={classNames(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              sku.featured
                ? "border-burn bg-ember/60 hover:bg-ember"
                : "border-paper-border bg-paper hover:border-ash",
              sku.featured && "text-[#1c1917]",
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-medium">{sku.label}</span>
              <span className="font-receipt text-xs text-burn">{sku.price}</span>
            </span>
            <span
              className={classNames(
                "mt-1 block text-xs leading-relaxed",
                sku.featured ? "text-[#44403c]" : "text-ash-deep",
              )}
            >
              {sku.button}. {sku.detail}.
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onRestore}
        className="mt-4 flex items-center gap-2 text-sm text-ash-deep underline underline-offset-4 transition-colors hover:text-ink"
      >
        <RotateCcw size={15} strokeWidth={1.5} />
        Restore purchase
      </button>

      {checkoutNote && (
        <p className="mt-3 text-sm leading-relaxed text-ash-deep">
          {checkoutNote}
        </p>
      )}

      {entitlement.active && expiry && (
        <p className="mt-3 flex items-start gap-2 font-receipt text-xs leading-relaxed text-ash">
          <ShieldCheck size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <span>Unlocked on this device until {expiry}.</span>
        </p>
      )}
    </div>
  );
}

function ToneCopyButton({
  copied,
  onClick,
  dark,
}: {
  copied: boolean;
  onClick: () => void;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
        dark
          ? "bg-canvas text-ink hover:bg-ember"
          : "border border-paper-border bg-paper text-ink hover:border-ash",
      )}
    >
      {copied ? (
        <>
          <Check size={16} strokeWidth={1.5} /> Copied. Go get &apos;em.
        </>
      ) : (
        <>
          <Copy size={16} strokeWidth={1.5} /> Copy this version
        </>
      )}
    </button>
  );
}

function ResultScreen({
  motionPreset,
  result,
  draft,
  category,
  copiedKey,
  rewriteLocked,
  tonesUnlocked,
  unlocking,
  showPaywall,
  entitlement,
  checkoutNote,
  onCopy,
  onUnlock,
  onCooldown,
  onBurn,
  onReset,
  onChoosePlan,
  onRestorePurchase,
}: {
  motionPreset: MotionPreset;
  result: EngineResult;
  draft: string;
  category: CategoryId | null;
  copiedKey: string | null;
  rewriteLocked: boolean;
  tonesUnlocked: boolean;
  unlocking: boolean;
  showPaywall: boolean;
  entitlement: EntitlementState;
  checkoutNote: string | null;
  onCopy: (key: string, text: string) => void;
  onUnlock: () => void;
  onCooldown: () => void;
  onBurn: () => void;
  onReset: () => void;
  onChoosePlan: (plan: EntitlementPlan) => void;
  onRestorePurchase: () => void;
}) {
  const wrote = draft.trim();
  const wroteShort = wrote.length > 160 ? `${wrote.slice(0, 157).trim()}…` : wrote;

  return (
    <motion.section key="result" {...motionPreset} className="flex flex-1 flex-col pb-8">
      <p className="mt-5 text-center font-brand text-2xl italic text-ash-deep">
        Okay. Here&apos;s the honest read.
      </p>

      {/* What you wrote — the raw draft, plain sans, never aestheticized. */}
      <div className="mt-5 rounded-2xl border border-paper-border bg-paper/60 p-4">
        <p className="font-receipt text-xs uppercase tracking-wider text-ash">
          What you wrote
        </p>
        <p className="mt-2 break-words text-sm leading-relaxed text-ash-deep line-through decoration-ash/40">
          {wroteShort}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-5 lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border-2 border-ember bg-paper p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-burn">
              <Eye size={15} strokeWidth={1.5} />
              <h2 className="font-receipt text-xs uppercase tracking-wider">
                How it will read
              </h2>
            </div>
            <span className="rounded-full bg-ember/50 px-2 py-0.5 font-receipt text-[10px] uppercase tracking-wider text-ink">
              Always free
            </span>
          </div>
          <p className="mt-4 break-words text-sm leading-relaxed text-ink">
            {result.mirror}
          </p>
          {category && (
            <p className="mt-4 border-t border-paper-border pt-4 text-sm italic leading-relaxed text-ash-deep">
              {RECIPIENT_NOTES[category]}
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-ink p-5 text-canvas">
          {/* Muted card-foreground, not ember: text-canvas inverts with
              bg-ink, so it stays legible in both themes. */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-receipt text-xs uppercase tracking-wider text-canvas/70">
              What you could send instead
            </h2>
            <span className="font-receipt text-[10px] uppercase tracking-wider text-canvas/50">
              {rewriteLocked ? "Pro" : "Calm & direct"}
            </span>
          </div>

          {rewriteLocked ? (
            <button
              type="button"
              onClick={onUnlock}
              className="mt-4 block w-full text-left"
            >
              <p
                aria-hidden
                className="select-none break-words font-brand text-lg italic leading-relaxed opacity-80 blur-[6px]"
              >
                {result.rewrite ?? REWRITE_TEASER}
              </p>
              <span className="mt-4 flex items-center gap-2 font-receipt text-xs uppercase tracking-wider text-ember">
                <Lock size={14} strokeWidth={1.5} />
                {unlocking ? "Unlocking…" : "Unlock the calm version"}
              </span>
            </button>
          ) : (
            <>
              <p className="mt-4 break-words font-brand text-lg italic leading-relaxed">
                {result.rewrite ?? ""}
              </p>
              <ToneCopyButton
                dark
                copied={copiedKey === "calm"}
                onClick={() => onCopy("calm", result.rewrite ?? "")}
              />
            </>
          )}
        </section>
      </div>

      {/* The locked premium: alternate tones, in Unsend's voice. */}
      <section className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="font-receipt text-xs uppercase tracking-wider text-ash">
            {tonesUnlocked ? "Other ways to say it" : "Three more tones"}
          </h2>
          {!tonesUnlocked && (
            <span className="font-receipt text-[10px] uppercase tracking-wider text-burn">
              Pro
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {TONES.map((tone) => {
            const real = result.tones?.[tone.key];
            const teaser = "the calmer version, said another way";
            return (
              <div
                key={tone.key}
                className="rounded-2xl border border-paper-border bg-paper p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-receipt text-xs uppercase tracking-wider text-ink">
                    {tone.label}
                  </span>
                  <span className="font-receipt text-[10px] lowercase tracking-wide text-ash">
                    {tone.note}
                  </span>
                </div>
                {tonesUnlocked ? (
                  real ? (
                    <>
                      <p className="mt-3 break-words text-sm leading-relaxed text-ink">
                        {real}
                      </p>
                      <ToneCopyButton
                        copied={copiedKey === tone.key}
                        onClick={() => onCopy(tone.key, real)}
                      />
                    </>
                  ) : (
                    <p className="mt-3 font-receipt text-xs uppercase tracking-wider text-ash">
                      {unlocking ? "Unlocking…" : "Ready in a moment."}
                    </p>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={onUnlock}
                    className="mt-3 flex w-full items-start gap-2 text-left"
                  >
                    <Lock
                      size={14}
                      strokeWidth={1.5}
                      className="mt-1 shrink-0 text-ash"
                    />
                    <span
                      aria-hidden
                      className="select-none break-words text-sm leading-relaxed text-ash-deep blur-[5px]"
                    >
                      {teaser}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!tonesUnlocked &&
          (showPaywall ? (
            <PaywallPanel
              entitlement={entitlement}
              checkoutNote={checkoutNote}
              onChoose={onChoosePlan}
              onRestore={onRestorePurchase}
            />
          ) : (
            <button
              type="button"
              onClick={onUnlock}
              className="mt-4 w-full rounded-2xl bg-ink py-4 text-base font-medium text-canvas transition-colors hover:bg-ash-deep"
            >
              Unlock every tone
            </button>
          ))}
      </section>

      <section className="mt-5 rounded-2xl border border-dashed border-paper-border bg-paper/60 p-5 text-center">
        <p className="font-brand text-2xl italic">Not ready to decide?</p>
        <button
          type="button"
          onClick={onCooldown}
          className="mx-auto mt-3 flex items-center gap-2 text-sm text-ash-deep underline underline-offset-4 transition-colors hover:text-ink"
        >
          <Clock size={16} strokeWidth={1.5} />
          Keep it unsent for an hour. Free, always.
        </button>
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onBurn}
          className="rounded-2xl border border-ember bg-paper px-5 py-4 text-sm font-medium text-burn transition-colors hover:border-burn"
        >
          Burn the original
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-2xl border border-paper-border bg-paper px-5 py-4 text-sm font-medium text-ash-deep transition-colors hover:border-ash hover:text-ink"
        >
          Read another draft
        </button>
      </div>
    </motion.section>
  );
}

function CooldownScreen({
  motionPreset,
  onReturn,
  onBack,
}: {
  motionPreset: MotionPreset;
  onReturn: () => void;
  onBack: () => void;
}) {
  return (
    <motion.section
      key="cooldown"
      {...motionPreset}
      className="flex flex-1 flex-col justify-center pb-12 text-center"
    >
      <Clock size={30} strokeWidth={1.4} className="mx-auto text-burn" />
      <h1 className="mt-6 font-brand text-4xl italic tracking-tight">
        Let it cool.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-ash-deep">
        The original can sit here without becoming a decision. Future-you gets
        the next vote.
      </p>
      <div className="mx-auto mt-10 flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={onReturn}
          className="rounded-2xl bg-ink px-5 py-4 text-base font-medium text-canvas transition-colors hover:bg-ash-deep"
        >
          Still thinking about it
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-paper-border bg-paper px-5 py-4 text-sm text-ash-deep transition-colors hover:border-ash hover:text-ink"
        >
          Back to the rewrite
        </button>
      </div>
      <p className="mx-auto mt-7 max-w-xs font-receipt text-xs leading-relaxed text-ash">
        No judgment either way. This stays between you and you.
      </p>
    </motion.section>
  );
}

function OutcomeScreen({
  motionPreset,
  onChoose,
}: {
  motionPreset: MotionPreset;
  onChoose: (kind: SentOutcome) => void;
}) {
  const options: Array<{ id: SentOutcome; label: string }> = [
    { id: "calmer", label: "I sent the calmer version" },
    { id: "nothing", label: "I didn't send anything" },
    { id: "original", label: "I sent the original anyway" },
  ];

  return (
    <motion.section
      key="outcome"
      {...motionPreset}
      className="flex flex-1 flex-col justify-center pb-12 text-center"
    >
      <h1 className="font-brand text-4xl italic tracking-tight">
        Still thinking about it?
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ash-deep">
        An hour ago, you almost sent something. How did it end?
      </p>
      <div className="mx-auto mt-8 grid w-full max-w-sm gap-3">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChoose(option.id)}
            className="rounded-2xl border border-paper-border bg-paper px-5 py-4 text-sm font-medium text-ink transition-colors hover:border-ash"
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-6 font-receipt text-xs text-ash">
        The pause was the win.
      </p>
    </motion.section>
  );
}

function DecisionScreen({
  motionPreset,
  outcome,
  onKeep,
  onBurn,
  onReceipt,
}: {
  motionPreset: MotionPreset;
  outcome: SentOutcome | null;
  onKeep: () => void;
  onBurn: () => void;
  onReceipt: () => void;
}) {
  const copy =
    outcome === "original"
      ? "No judgment. Some things still deserve a clean ending."
      : "Keep a sealed note for yourself, or let it go.";

  return (
    <motion.section
      key="decision"
      {...motionPreset}
      className="flex flex-1 flex-col justify-center pb-12 text-center"
    >
      <h1 className="font-brand text-4xl italic tracking-tight">
        One last thing.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-ash-deep">
        {copy}
      </p>
      <div className="mx-auto mt-8 grid w-full max-w-sm gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onKeep}
          className="flex flex-col items-center gap-2 rounded-2xl border border-paper-border bg-paper px-5 py-5 text-ink transition-colors hover:border-ash"
        >
          <Archive size={24} strokeWidth={1.5} />
          <span className="font-medium">Keep in Vault</span>
          <span className="text-xs leading-snug text-ash-deep">
            Encrypted here.
          </span>
        </button>
        <button
          type="button"
          onClick={onBurn}
          className="flex flex-col items-center gap-2 rounded-2xl border border-ember bg-paper px-5 py-5 text-burn transition-colors hover:border-burn"
        >
          <Flame size={24} strokeWidth={1.5} />
          <span className="font-medium">Burn it</span>
          <span className="text-xs leading-snug text-ash-deep">
            Gone. For good.
          </span>
        </button>
      </div>
      <button
        type="button"
        onClick={onReceipt}
        className="mx-auto mt-5 flex items-center gap-2 text-sm text-ash-deep underline underline-offset-4 transition-colors hover:text-ink"
      >
        <Receipt size={16} strokeWidth={1.5} />
        Print a wordless receipt instead
      </button>
      <div className="mx-auto mt-7 max-w-sm">
        <PrivacyLine>Nothing here sends the original anywhere.</PrivacyLine>
      </div>
    </motion.section>
  );
}

function BurnScreen({
  motionPreset,
  draft,
}: {
  motionPreset: MotionPreset;
  draft: string;
}) {
  const words = draft.split(/\s+/).filter(Boolean);
  // Drive the burn with a post-mount state flip rather than mount-time
  // `initial`. AnimatePresence (mode="wait" + initial={false}) suppresses
  // the initial state of nested children, which parked the words at their
  // gone state instantly — so the drift never played. Changing `animate`
  // after mount always transitions, regardless of that context.
  const [ignite, setIgnite] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIgnite(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <motion.section
      key="burning"
      {...motionPreset}
      className="flex flex-1 flex-col justify-center pb-12 text-center"
    >
      <div className="mx-auto w-full max-w-md rounded-2xl border border-paper-border bg-paper p-6 text-left">
        <p className="text-sm leading-relaxed">
          {words.map((word, index) => (
            <motion.span
              key={`${word}-${index}`}
              className="mr-1 inline-block break-words text-ash-deep"
              animate={
                ignite
                  ? {
                      opacity: 0,
                      x: (index % 3) * 14 - 14,
                      y: -28 - (index % 5) * 12,
                      rotate: (index % 7) * 5 - 15,
                      filter: "blur(4px)",
                    }
                  : { opacity: 1, x: 0, y: 0, rotate: 0, filter: "blur(0px)" }
              }
              transition={{
                duration: 1.45,
                delay: index * 0.035,
                ease: "easeOut",
              }}
            >
              {word}
            </motion.span>
          ))}
        </p>
      </div>
      <p className="mt-7 font-brand text-2xl italic text-ash-deep">
        Letting it go...
      </p>
    </motion.section>
  );
}

function ReleasedScreen({
  motionPreset,
  counts,
  onReceipt,
  onReset,
}: {
  motionPreset: MotionPreset;
  counts: DecisionCounts | null;
  onReceipt: () => void;
  onReset: () => void;
}) {
  const burned = counts?.burned ?? 1;

  return (
    <motion.section
      key="released"
      {...motionPreset}
      className="flex flex-1 flex-col justify-center pb-12 text-center"
    >
      <Sparkles size={30} strokeWidth={1.4} className="mx-auto text-burn" />
      <h1 className="mt-6 font-brand text-4xl italic tracking-tight">
        Gone. For good.
      </h1>
      <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-ash-deep">
        That&apos;s {burned} message{burned === 1 ? "" : "s"} you chose to
        burn. Future-you says thanks.
      </p>
      <div className="mx-auto mt-9 flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={onReceipt}
          className="rounded-2xl bg-ink px-5 py-4 text-base font-medium text-canvas transition-colors hover:bg-ash-deep"
        >
          Print the receipt
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-2xl border border-paper-border bg-paper px-5 py-4 text-sm text-ash-deep transition-colors hover:border-ash hover:text-ink"
        >
          Read another draft
        </button>
      </div>
    </motion.section>
  );
}

function formatVaultDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function VaultScreen({
  motionPreset,
  entries,
  summary,
  note,
  loading,
  onReset,
}: {
  motionPreset: MotionPreset;
  entries: VaultEntry[];
  summary: VaultSummary | null;
  note: string | null;
  loading: boolean;
  onReset: () => void;
}) {
  const stats = [
    ["UNSENT", String(summary?.unsent ?? 0)],
    ["KEPT", String(summary?.kept ?? 0)],
    ["LET GO", String(summary?.letGo ?? 0)],
  ];

  return (
    <motion.section key="vault" {...motionPreset} className="flex flex-1 flex-col pb-8">
      <div className="mt-5">
        <p className="font-receipt text-xs uppercase tracking-[0.22em] text-ash">
          Device Vault
        </p>
        <h1 className="mt-3 font-brand text-4xl italic tracking-tight">
          The things you kept quiet.
        </h1>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-paper-border bg-paper px-3 py-4 text-center"
          >
            <div className="font-brand text-3xl italic leading-none">{value}</div>
            <div className="mt-2 font-receipt text-[10px] uppercase tracking-wider text-ash">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <PrivacyLine>
          Kept messages are encrypted on this device. We can&apos;t read them.
        </PrivacyLine>
      </div>

      {note && (
        <p className="mt-5 rounded-2xl border border-ember bg-paper px-4 py-3 text-sm leading-relaxed text-ash-deep">
          {note}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {loading && (
          <p className="rounded-2xl border border-paper-border bg-paper px-4 py-5 text-sm text-ash-deep">
            Opening the Vault...
          </p>
        )}
        {!loading && entries.length === 0 && (
          <p className="rounded-2xl border border-paper-border bg-paper px-4 py-5 text-sm text-ash-deep">
            Nothing kept yet.
          </p>
        )}
        {!loading &&
          entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-paper-border bg-paper p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={classNames(
                    "font-receipt text-xs uppercase tracking-wider",
                    entry.status === "kept" ? "text-burn" : "text-ash",
                  )}
                >
                  {entry.status === "kept" ? "Kept" : "Let go"}
                </span>
                <span className="font-receipt text-[10px] uppercase tracking-wider text-ash">
                  {categoryLabel(entry.recipientCategory)} -{" "}
                  {formatVaultDate(entry.createdAt)}
                </span>
              </div>
              <p className="mt-3 break-words text-sm leading-relaxed text-ash-deep">
                {entry.snippet ?? "Released without a snippet."}
              </p>
            </article>
          ))}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mx-auto mt-8 rounded-2xl bg-ink px-5 py-4 text-base font-medium text-canvas transition-colors hover:bg-ash-deep"
      >
        Read another draft
      </button>
    </motion.section>
  );
}

function redactionWidth(word: string) {
  const letters = word.replace(/[^\p{L}\p{N}]/gu, "").length;
  return Math.max(24, Math.min(104, 18 + letters * 8));
}

function ReceiptPanel({
  motionPreset,
  draft,
  stats,
  category,
  onReset,
}: {
  motionPreset: MotionPreset;
  draft: string;
  stats: DraftStats;
  category: CategoryId | null;
  onReset: () => void;
}) {
  const [shareNote, setShareNote] = useState<string | null>(null);
  // Draw the redaction bars in via a post-mount flip — AnimatePresence
  // (initial={false}) suppresses nested children's mount-time `initial`,
  // which made the bars pop in at full instead of drawing left-to-right.
  const words = useMemo(() => draft.split(/\s+/).filter(Boolean), [draft]);
  const lines: Array<[string, string]> = [
    ["WORDS DRAFTED", String(stats.words)],
    ["ALL-CAPS WORDS", String(stats.capsWords)],
    ["EXCLAMATION PTS", String(stats.exclamations)],
    ["RHETORICAL ?S", String(stats.questions)],
    ["STATUS", "BURNED"],
    ["EST. SAVINGS", "1 FRIENDSHIP"],
  ];

  async function receiptBlob() {
    return buildReceiptBlob(words, lines, categoryLabel(category));
  }

  async function saveReceipt() {
    const blob = await receiptBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "unsend-receipt.png";
    anchor.click();
    URL.revokeObjectURL(url);
    recordFunnelEvent("receipt_saved");
    setShareNote("Saved. Let them wonder what it said.");
  }

  async function shareReceipt() {
    const blob = await receiptBlob();
    if (!blob) return;
    const file = new File([blob], "unsend-receipt.png", { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };

    try {
      if (navigator.share && nav.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Unsend.",
          text: "Let them wonder what it said.",
        });
        recordFunnelEvent("receipt_shared");
        setShareNote("Shared. Let them wonder what it said.");
        return;
      }
      if (navigator.share) {
        await navigator.share({
          title: "Unsend.",
          text: "I burned a message before it burned me.",
        });
        recordFunnelEvent("receipt_shared");
        setShareNote("Shared. Let them wonder what it said.");
        return;
      }
      await navigator.clipboard.writeText("I burned a message before it burned me.");
      recordFunnelEvent("receipt_shared");
      setShareNote("Copied. Let them wonder what it said.");
    } catch {
      setShareNote("The receipt is ready when you are.");
    }
  }

  return (
    <motion.section key="receipt" {...motionPreset} className="flex flex-1 flex-col pb-8">
      {/* Keyframes inline so Tailwind's optimizer can't purge them (the
          bars reference the animation via an inline style, not a class). */}
      <style>{`
        @keyframes unsent-bar-draw {
          from { transform: scaleX(0); opacity: 0; }
          to { transform: scaleX(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .unsent-bar { animation: none !important; }
        }
      `}</style>
      <div className="mx-auto mt-3 w-full max-w-sm border border-paper-border bg-paper px-6 py-7 font-receipt text-xs text-ink shadow-sm">
        <div className="text-center">
          <div className="text-sm font-bold tracking-[0.3em]">UNSEND</div>
          <div className="mt-1 text-ash">OFFICIAL RECORD OF RESTRAINT</div>
          <div className="mt-1 text-ash">TO: {categoryLabel(category).toUpperCase()}</div>
        </div>

        <div className="my-4 border-t border-dashed border-paper-border" />

        <div className="flex flex-wrap gap-1">
          {words.map((word, index) => (
            <span
              key={`${word}-${index}`}
              style={{
                width: redactionWidth(word),
                transformOrigin: "left",
                animation: "unsent-bar-draw 0.2s ease-out both",
                animationDelay: `${0.25 + index * 0.02}s`,
              }}
              className={classNames(
                "unsent-bar h-3 rounded-sm",
                index >= words.length - 5 ? "bg-ember" : "bg-ink",
              )}
            />
          ))}
        </div>

        <div className="my-4 border-t border-dashed border-paper-border" />

        <div className="space-y-1.5">
          {lines.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-ash">{label}</span>
              <span className="text-right font-bold">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex h-8 items-stretch justify-center gap-px">
          {words.slice(0, 42).map((word, index) => (
            <div
              key={`${word}-bar-${index}`}
              className={classNames(word.length % 3 === 0 ? "w-1" : "w-px", "bg-ink")}
            />
          ))}
        </div>
        <div className="mt-3 text-center italic text-ash">
          the best message is the one you almost sent
        </div>
      </div>

      <div className="mx-auto mt-6 grid w-full max-w-sm grid-cols-2 gap-3">
        <button
          type="button"
          onClick={shareReceipt}
          className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-canvas transition-colors hover:bg-ash-deep"
        >
          <Share2 size={16} strokeWidth={1.5} /> Share
        </button>
        <button
          type="button"
          onClick={saveReceipt}
          className="flex items-center justify-center gap-2 rounded-2xl border border-paper-border bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-ash"
        >
          <Download size={16} strokeWidth={1.5} /> Save
        </button>
      </div>

      {shareNote && (
        <p className="mt-4 text-center text-sm text-ash-deep">{shareNote}</p>
      )}

      <div className="mx-auto mt-6 max-w-sm">
        <PrivacyLine>
          This card holds shapes, not words.
        </PrivacyLine>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mx-auto mt-8 text-sm text-ash underline underline-offset-4 transition-colors hover:text-ash-deep"
      >
        Read another draft
      </button>
    </motion.section>
  );
}

async function buildReceiptBlob(
  words: string[],
  lines: Array<[string, string]>,
  label: string,
) {
  const width = 900;
  const height = 1300;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#fffbeb";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(90, 70, width - 180, height - 140);
  ctx.strokeStyle = "#e7e5e4";
  ctx.strokeRect(90, 70, width - 180, height - 140);

  ctx.textAlign = "center";
  ctx.fillStyle = "#1c1917";
  ctx.font = "700 34px ui-monospace, Menlo, monospace";
  ctx.fillText("UNSEND", width / 2, 145);
  ctx.font = "500 18px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "#78716c";
  ctx.fillText("OFFICIAL RECORD OF RESTRAINT", width / 2, 180);
  ctx.fillText(`TO: ${label.toUpperCase()}`, width / 2, 210);

  let x = 135;
  let y = 280;
  for (const [index, word] of words.entries()) {
    const barWidth = redactionWidth(word) * 1.7;
    if (x + barWidth > width - 135) {
      x = 135;
      y += 26;
    }
    ctx.fillStyle = index >= words.length - 5 ? "#fed7aa" : "#1c1917";
    ctx.fillRect(x, y, barWidth, 13);
    x += barWidth + 9;
  }

  y += 62;
  ctx.strokeStyle = "#e7e5e4";
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(135, y);
  ctx.lineTo(width - 135, y);
  ctx.stroke();
  ctx.setLineDash([]);

  y += 50;
  ctx.textAlign = "left";
  ctx.font = "500 20px ui-monospace, Menlo, monospace";
  for (const [name, value] of lines) {
    ctx.fillStyle = "#78716c";
    ctx.fillText(name, 135, y);
    ctx.fillStyle = name === "STATUS" ? "#c2410c" : "#1c1917";
    ctx.textAlign = "right";
    ctx.fillText(value, width - 135, y);
    ctx.textAlign = "left";
    y += 38;
  }

  y += 42;
  x = 195;
  for (const [index, word] of words.slice(0, 48).entries()) {
    const barWidth = word.length % 3 === 0 ? 8 : 3;
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(x, y, barWidth, 70 - (index % 4) * 8);
    x += barWidth + 5;
  }

  ctx.textAlign = "center";
  ctx.font = "italic 20px Georgia, serif";
  ctx.fillStyle = "#78716c";
  ctx.fillText("the best message is the one you almost sent", width / 2, height - 140);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

export default function Composer() {
  // Start at "boot": localStorage (tier) can't be read during SSR, so the
  // real entry stage is chosen in an effect after mount.
  const [stage, setStage] = useState<Stage>("boot");
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [customRecipient, setCustomRecipient] = useState("");
  const [goal, setGoal] = useState<string | null>(null);
  const [result, setResult] = useState<EngineResult | null>(null);
  const [error, setError] = useState<EngineError | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [outcome, setOutcome] = useState<SentOutcome | null>(null);
  const [counts, setCounts] = useState<DecisionCounts | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [resultTier, setResultTier] = useState<ResultTier>("first");
  const [unlocking, setUnlocking] = useState(false);
  const [entitlement, setEntitlement] = useState<EntitlementState>(() =>
    getEntitlement(),
  );
  const [checkoutNote, setCheckoutNote] = useState<string | null>(null);
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [vaultSummary, setVaultSummary] = useState<VaultSummary | null>(null);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultNote, setVaultNote] = useState<string | null>(null);
  const [devHost, setDevHost] = useState(false);
  const reduceMotion = useReducedMotion();

  const stats = useMemo(() => computeDraftStats(draft), [draft]);
  const ready = stats.words >= composer.ctaWordThreshold;
  const motionPreset: MotionPreset = {
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: timing.revealRisePx },
    animate: { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 },
    transition: { duration: timing.revealMs / 1000, ease: "easeOut" },
  };

  useEffect(() => {
    if (stage !== "vault") return;
    let active = true;
    recordFunnelEvent("vault_viewed");
    Promise.all([loadVaultEntries(), loadVaultSummary()])
      .then(([entries, summary]) => {
        if (!active) return;
        setVaultEntries(entries);
        setVaultSummary(summary);
      })
      .finally(() => {
        if (active) setVaultLoading(false);
      });
    return () => {
      active = false;
    };
  }, [stage]);

  // First-timers get the guided onboarding; everyone else lands on the
  // composer (the landing screen). Read-count / entitlement live in
  // localStorage, so this is only sound after mount.
  function isFirstTimer() {
    return !getEntitlement().active && getReadCount() === 0;
  }
  function entryStage(): Stage {
    return isFirstTimer() ? "arrival" : "compose";
  }

  // For "other", the typed recipient gives the engine real context
  // ("a landlord" writes differently than "an ex"); otherwise the label.
  function recipientForEngine(): string {
    if (category === "other" && customRecipient.trim()) {
      return customRecipient.trim();
    }
    return categoryLabel(category);
  }

  useEffect(() => {
    // Tier + entitlement live client-side (localStorage / RevenueCat),
    // unavailable during SSR — so routing happens post-mount. The "boot"
    // stage keeps server and first client render identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDevHost(
      ["localhost", "127.0.0.1"].includes(window.location.hostname),
    );

    // Returning from an external checkout (?checkout=success): strip the
    // params so they don't linger, then the entitlement sync below
    // recognizes the now-Pro device.
    const params = new URLSearchParams(window.location.search);
    if (params.has("checkout")) {
      params.delete("checkout");
      params.delete("plan");
      params.delete("device");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (qs ? `?${qs}` : ""),
      );
    }

    let active = true;
    // Ask the source of truth "is THIS device Pro?" — the device token is
    // the identity, so a returning buyer lands unlocked with no account.
    syncEntitlement().then((ent) => {
      if (!active) return;
      setEntitlement(ent);
      const firstTimer = !ent.active && getReadCount() === 0;
      setStage(firstTimer ? "arrival" : "compose");
    });
    return () => {
      active = false;
    };
  }, []);

  function resetFlow() {
    setStage(entryStage());
    setDraft("");
    setCategory(null);
    setCustomRecipient("");
    setGoal(null);
    setResult(null);
    setError(null);
    setCopiedKey(null);
    setIsSample(false);
    setOutcome(null);
    setShowPaywall(false);
    setUnlocking(false);
    setCheckoutNote(null);
    setVaultNote(null);
  }

  function startSample() {
    recordFunnelEvent("sample_started");
    setDraft(SAMPLE_DRAFT);
    setIsSample(true);
    setCategory("ex");
    setCustomRecipient("");
    setGoal(null);
    setResult(null);
    setError(null);
    setCopiedKey(null);
    setOutcome(null);
    setShowPaywall(false);
    setUnlocking(false);
    setCheckoutNote(null);
    setVaultNote(null);
    setStage("compose");
  }

  async function showMirror() {
    if (!ready) return;
    setError(null);
    setCopiedKey(null);
    setShowPaywall(false);

    // Safety pre-pass (plan §3.6): catch self-harm signals before any
    // API call — and even when the engine is down. The engine's own
    // crisis flag is the second layer for subtler phrasings. The draft
    // is never sent anywhere on this path.
    if (looksLikeCrisis(draft)) {
      recordFunnelEvent("crisis_path");
      setResult({
        mirror: "",
        rewrite: "",
        tones: { warm: "", final: "", unbothered: "" },
        crisis: true,
      });
      setStage("result");
      return;
    }

    // Tier for this crisis, captured BEFORE incrementing the read count.
    // The server only generates what the tier is entitled to (generate-on-
    // pay): first/paid get the rewrite; only paid gets the tones. A sample
    // is always treated as a first taste.
    const paid = getEntitlement().active;
    const tier: ResultTier = paid
      ? "paid"
      : isSample || getReadCount() === 0
        ? "first"
        : "returning";
    const want = {
      rewrite: tier !== "returning",
      tones: tier === "paid",
    };
    setResultTier(tier);

    setStage("reading");
    const started = Date.now();
    const res = await requestRewrite({
      draft,
      recipient: recipientForEngine(),
      feeling: null,
      goal,
      want,
    });
    const hold = Math.max(0, MIN_CEREMONY_MS - (Date.now() - started));
    if (hold > 0) await new Promise((resolve) => setTimeout(resolve, hold));
    if (res.ok) {
      if (res.result.crisis) {
        recordFunnelEvent("crisis_path");
      } else {
        setEntitlement(getEntitlement());
        if (!isSample) incrementReadCount(); // counts the crisis; tier already captured
        recordFunnelEvent("mirror_completed");
        if (tier === "returning") recordFunnelEvent("paywall_shown");
      }
      setResult(res.result);
      setStage("result");
    } else {
      setError(res.error);
      setStage("compose");
    }
  }

  async function copyVersion(key: string, text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // The visible text remains selectable if clipboard permissions fail.
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
  }

  function openPaywall() {
    if (entitlement.active) return;
    recordFunnelEvent("paywall_shown");
    setShowPaywall(true);
  }

  // After a purchase/restore, generate the parts this draft didn't get for
  // free (generate-on-pay): the rewrite if it was a returning crisis, and
  // the tones. Same draft/recipient/goal, merged into the existing result.
  async function unlockLockedParts() {
    if (!result || result.crisis) return;
    const needRewrite = !result.rewrite;
    const needTones = !result.tones;
    if (!needRewrite && !needTones) return;
    setUnlocking(true);
    const res = await requestRewrite({
      draft,
      recipient: recipientForEngine(),
      feeling: null,
      goal,
      want: { rewrite: needRewrite, tones: needTones },
    });
    setUnlocking(false);
    if (res.ok && !res.result.crisis) {
      setResult((prev) =>
        prev
          ? {
              ...prev,
              rewrite: res.result.rewrite ?? prev.rewrite,
              tones: res.result.tones ?? prev.tones,
            }
          : prev,
      );
    } else {
      setCheckoutNote("Unlocked — but the versions didn't load. Try again in a moment.");
    }
  }

  function chooseOutcome(kind: SentOutcome) {
    recordFunnelEvent("cooldown_returned");
    setOutcome(kind);
    setCounts(recordDecision(kind as DecisionKind));
    setStage("decision");
  }

  async function choosePlan(plan: EntitlementPlan) {
    recordFunnelEvent("purchase_started");
    setCheckoutNote(null);
    const checkout = await startCheckout(plan);
    if (checkout.ok && checkout.mode === "local") {
      setEntitlement(checkout.entitlement);
      setShowPaywall(false);
      recordFunnelEvent("purchase_unlocked");
      setCheckoutNote("Unlocked. Every version is yours.");
      void unlockLockedParts();
      return;
    }
    if (!checkout.ok) {
      setCheckoutNote("Checkout is not available in this build yet.");
    }
  }

  async function restorePurchase() {
    setCheckoutNote("Checking for your pass…");
    const restored = await restoreEntitlement();
    setEntitlement(restored);
    if (restored.active) {
      setShowPaywall(false);
      recordFunnelEvent("purchase_restored");
      setCheckoutNote("Restored. Every version is yours.");
      void unlockLockedParts();
      return;
    }
    setCheckoutNote(
      isRemoteEntitlementEnabled()
        ? "No purchase found for this device. On a new device, use the link in your receipt email."
        : "No active pass found on this device.",
    );
  }

  function openVault(note: string | null = null) {
    setVaultLoading(true);
    setVaultNote(note);
    setStage("vault");
  }

  async function keepInVault() {
    const saved = await saveVaultEntry({
      draft,
      recipientCategory: category,
      status: "kept",
    }).catch(() => null);
    if (!saved) {
      openVault("The Vault could not open in this browser.");
      return;
    }
    recordFunnelEvent("vault_kept");
    setCounts(recordDecision("kept"));
    sendCounterTick("kept", category);
    openVault("Kept. Still yours, still unread by us.");
  }

  // Dev only (localhost) — wipe all local state + Vault and reload to the
  // first-run experience. Never rendered in production (see devHost).
  async function resetToFirstRun() {
    await clearVault();
    resetAllLocalData();
    window.location.reload();
  }

  function startBurn() {
    recordFunnelEvent("burn_started");
    setCounts(recordDecision("burned"));
    void saveVaultEntry({
      recipientCategory: category,
      status: "burned",
    }).catch(() => null);
    sendCounterTick("burned", category);
    setStage("burning");
    setTimeout(() => setStage("released"), timing.burnMs);
  }

  const canGoBack = !["boot", "arrival", "compose", "reading", "burning"].includes(
    stage,
  );

  function goBack() {
    if (stage === "recipient") {
      setStage("arrival");
      return;
    }
    if (stage === "goal") {
      setStage("recipient");
      return;
    }
    if (stage === "vault") {
      setStage(result && !result.crisis ? "result" : entryStage());
      return;
    }
    setStage(result ? "result" : "compose");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-1 flex-col overflow-x-hidden px-5 sm:px-6">
      <AppHeader
        canGoBack={canGoBack}
        onBack={goBack}
        onReset={resetFlow}
        onVault={() => openVault()}
      />

      <main className="flex flex-1 flex-col">
        <AnimatePresence mode="wait" initial={false}>
          {stage === "arrival" && (
            <ArrivalScreen
              motionPreset={motionPreset}
              onStart={() => setStage("recipient")}
              onSample={startSample}
            />
          )}

          {stage === "recipient" && (
            <RecipientStep
              motionPreset={motionPreset}
              value={category}
              customRecipient={customRecipient}
              onPick={(c) => {
                setCategory(c);
                setGoal(null);
                // "Other" stays so they can type who it is; the rest advance.
                if (c !== "other") setStage("goal");
              }}
              onCustomRecipient={setCustomRecipient}
              onContinue={() => setStage("goal")}
            />
          )}

          {stage === "goal" && (
            <GoalStep
              motionPreset={motionPreset}
              category={category}
              value={goal}
              onPick={(g) => {
                setGoal(g);
                setStage("compose");
              }}
              onSkip={() => {
                setGoal(null);
                setStage("compose");
              }}
            />
          )}

          {stage === "compose" && (
            <ComposeScreen
              motionPreset={motionPreset}
              draft={draft}
              category={category}
              customRecipient={customRecipient}
              goal={goal}
              error={error}
              ready={ready}
              onDraft={(value) => {
                setDraft(value);
                setIsSample(false);
              }}
              onCategory={setCategory}
              onCustomRecipient={setCustomRecipient}
              onGoal={setGoal}
              onSubmit={showMirror}
              onSample={startSample}
            />
          )}

          {stage === "reading" && <ReadingScreen motionPreset={motionPreset} />}

          {stage === "result" &&
            result &&
            (result.crisis ? (
              <CrisisScreen motionPreset={motionPreset} onBack={() => setStage("compose")} />
            ) : (
              <ResultScreen
                motionPreset={motionPreset}
                result={result}
                draft={draft}
                category={category}
                copiedKey={copiedKey}
                rewriteLocked={resultTier === "returning" && !entitlement.active}
                tonesUnlocked={entitlement.active}
                unlocking={unlocking}
                showPaywall={showPaywall}
                entitlement={entitlement}
                checkoutNote={checkoutNote}
                onCopy={copyVersion}
                onUnlock={openPaywall}
                onCooldown={() => {
                  recordFunnelEvent("cooldown_started");
                  setStage("cooldown");
                }}
                onBurn={startBurn}
                onReset={resetFlow}
                onChoosePlan={choosePlan}
                onRestorePurchase={restorePurchase}
              />
            ))}

          {stage === "cooldown" && (
            <CooldownScreen
              motionPreset={motionPreset}
              onReturn={() => setStage("outcome")}
              onBack={() => setStage("result")}
            />
          )}

          {stage === "outcome" && (
            <OutcomeScreen motionPreset={motionPreset} onChoose={chooseOutcome} />
          )}

          {stage === "decision" && (
            <DecisionScreen
              motionPreset={motionPreset}
              outcome={outcome}
              onKeep={keepInVault}
              onBurn={startBurn}
              onReceipt={() => {
                recordFunnelEvent("receipt_opened");
                setStage("receipt");
              }}
            />
          )}

          {stage === "burning" && (
            <BurnScreen motionPreset={motionPreset} draft={draft} />
          )}

          {stage === "released" && (
            <ReleasedScreen
              motionPreset={motionPreset}
              counts={counts}
              onReceipt={() => {
                recordFunnelEvent("receipt_opened");
                setStage("receipt");
              }}
              onReset={resetFlow}
            />
          )}

          {stage === "receipt" && (
            <ReceiptPanel
              motionPreset={motionPreset}
              draft={draft}
              stats={stats}
              category={category}
              onReset={resetFlow}
            />
          )}

          {stage === "vault" && (
            <VaultScreen
              motionPreset={motionPreset}
              entries={vaultEntries}
              summary={vaultSummary}
              note={vaultNote}
              loading={vaultLoading}
              onReset={resetFlow}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className="pb-6 pt-8 text-center font-brand text-sm italic text-ash">
        Some things don&apos;t need a record.
      </footer>

      {devHost && (
        <button
          type="button"
          onClick={resetToFirstRun}
          title="Dev: wipe local state + Vault, reload as a first-timer"
          className="fixed bottom-3 right-3 z-50 flex items-center gap-1.5 rounded-full border border-paper-border bg-paper/80 px-3 py-1.5 font-receipt text-[10px] uppercase tracking-wider text-ash backdrop-blur transition-colors hover:text-ash-deep"
        >
          <RotateCcw size={12} strokeWidth={1.5} />
          reset (dev)
        </button>
      )}
    </div>
  );
}
