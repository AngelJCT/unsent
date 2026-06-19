import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, Lock, Clock, Check, Moon, CalendarDays, Infinity as InfinityIcon } from "lucide-react";

const PLANS = [
  {
    id: "tonight",
    icon: Moon,
    name: "Just Tonight",
    price: "$2.99",
    cadence: "24 hours, no subscription",
    note: "For the crisis in front of you.",
  },
  {
    id: "monthly",
    icon: CalendarDays,
    name: "Monthly",
    price: "$6.99",
    cadence: "per month",
    note: "Cancel anytime.",
  },
  {
    id: "yearly",
    icon: InfinityIcon,
    name: "Yearly",
    price: "$34.99",
    cadence: "per year — about $2.91/mo",
    note: "Composed, as a way of life.",
    badge: "Most chosen",
  },
];

export default function UnsentPaywall() {
  const [plan, setPlan] = useState("yearly");
  const [unlocked, setUnlocked] = useState(false);
  const [held, setHeld] = useState(false);

  const selected = PLANS.find((p) => p.id === plan);

  return (
    <div className="min-h-screen bg-amber-50 text-stone-900 antialiased">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-serif text-2xl italic tracking-tight">
          Unsent<span className="text-orange-700">.</span>
        </span>
        <span className="flex items-center gap-2 text-xs text-stone-500">
          <Lock className="h-3 w-3" />
          Drafts are never stored
        </span>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 pb-20">
        <p className="mb-6 pt-4 text-center font-serif text-xl italic text-stone-700">
          Okay. Here's the honest read.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Mirror — always free */}
          <div className="rounded-2xl border-2 border-orange-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-700">
                <Eye className="h-4 w-4" />
                <h2 className="text-xs font-semibold uppercase tracking-widest">
                  How it will read
                </h2>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-stone-500">
                Always free
              </span>
            </div>
            <p className="text-sm leading-relaxed text-stone-700">
              This will read as wounded and accusatory. "Hope it was worth it"
              won't land as strength — it'll land as proof you're not over it.
              They'll feel attacked first, guilty second, and they'll respond
              to the attack.
            </p>
            <p className="mt-4 border-t border-stone-100 pt-4 text-xs italic text-stone-500">
              With an ex, every word gets re-read three times. Calm is the only
              thing that can't be used against you.
            </p>
          </div>

          {/* Rewrite — behind the ask */}
          <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-900 p-6 text-amber-50">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-200">
              What you could send instead
            </h2>
            {unlocked ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="font-serif text-base leading-relaxed"
              >
                “I'll be honest — the silence stings, and I'd rather say that
                plainly than pretend it doesn't. If you're not in a place to
                talk, I understand. I just didn't want to leave it unsaid.”
              </motion.p>
            ) : (
              <>
                <p className="select-none font-serif text-base leading-relaxed blur-sm">
                  “I'll be honest — the silence stings, and I'd rather say that
                  plainly than pretend it doesn't. If you're not in a place to
                  talk, I understand. I just didn't want to leave it unsaid.”
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-200/70">
                  <Lock className="h-3 w-3" />
                  Your composed version is ready.
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cool-down — never paywalled */}
        <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-amber-50 p-5 text-center">
          {held ? (
            <p className="text-sm text-stone-600">
              <span className="font-medium text-stone-800">
                Held for one hour.
              </span>{" "}
              No charge for this. There never will be.
            </p>
          ) : (
            <button
              onClick={() => setHeld(true)}
              className="mx-auto flex items-center gap-2 text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
            >
              <Clock className="h-4 w-4" />
              Not ready to decide? Keep it unsent for an hour — free, always.
            </button>
          )}
        </div>

        {/* Paywall */}
        {!unlocked && (
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-12 max-w-2xl"
          >
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-xs font-medium uppercase tracking-widest text-orange-700">
                The first one was on us
              </p>
              <h2 className="mt-3 font-serif text-2xl leading-snug tracking-tight md:text-3xl">
                Composure costs less than
                <span className="italic text-orange-700"> the apology.</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                The honest read is free, every time. The composed version — the
                one that protects your dignity at 11:47pm — is what you're
                paying for. It's cheaper than the dinner where you take it all
                back.
              </p>

              <div className="mt-6 space-y-3">
                {PLANS.map((p) => {
                  const Icon = p.icon;
                  const active = plan === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlan(p.id)}
                      className={`relative flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
                        active
                          ? "border-stone-900 bg-amber-50"
                          : "border-stone-200 bg-white hover:border-stone-400"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          active
                            ? "bg-stone-900 text-amber-50"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-900">
                            {p.name}
                          </span>
                          {p.badge && (
                            <span className="rounded-full bg-orange-700 px-2 py-0.5 text-xs text-amber-50">
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500">{p.note}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-serif text-lg text-stone-900">
                          {p.price}
                        </p>
                        <p className="text-xs text-stone-500">{p.cadence}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setUnlocked(true)}
                className="mt-6 w-full rounded-xl bg-stone-900 py-4 text-base font-medium text-amber-50 transition-colors hover:bg-stone-800"
              >
                {plan === "tonight"
                  ? "Get me through tonight — $2.99"
                  : `Stay composed — ${selected.price}`}
              </button>

              <div className="mt-4 space-y-2 text-center">
                <p className="text-xs text-stone-500">
                  Unlimited honest reads stay free, no matter what. And we will
                  never charge you to <em>not</em> send something.
                </p>
                <button className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600">
                  Restore purchase
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {unlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10 flex items-center justify-center gap-2 text-sm text-stone-600"
          >
            <Check className="h-4 w-4 text-orange-700" />
            You're in. Go say it right.
          </motion.div>
        )}

        <footer className="mt-20 border-t border-stone-200 pt-10 text-center">
          <p className="font-serif text-xl italic tracking-tight text-stone-800">
            The best message is the one you{" "}
            <span className="text-orange-700">almost</span> sent.
          </p>
        </footer>
      </main>
    </div>
  );
}