import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Archive,
  Lock,
  Heart,
  Briefcase,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const DRAFT =
  "wow. so you can post stories all weekend but my text from THURSDAY is still on read. you know what, don't even bother replying, I clearly know where I stand. hope the new friends are fun.";

const VAULT_ENTRIES = [
  {
    id: 1,
    ago: "34 days ago",
    recipient: "An ex",
    icon: Heart,
    snippet: "I just think it's funny how you act like nothing happened…",
  },
  {
    id: 2,
    ago: "11 days ago",
    recipient: "Boss",
    icon: Briefcase,
    snippet: "With all due respect, this deadline was never realistic and…",
  },
];

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.35 },
};

export default function UnsentRetentionLoop() {
  const [step, setStep] = useState("checkin"); // checkin -> choice -> burning -> released -> vault
  const words = useMemo(() => DRAFT.split(" "), []);

  const startBurn = () => {
    setStep("burning");
    setTimeout(() => setStep("released"), 2600);
  };

  return (
    <div className="flex min-h-screen flex-col bg-amber-50 text-stone-900 antialiased">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-6 py-6">
        <span className="font-serif text-2xl italic tracking-tight">
          Unsent<span className="text-orange-700">.</span>
        </span>
        <span className="text-xs text-stone-400">one hour later</span>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 pb-16">
        <AnimatePresence mode="wait">
          {/* ---------- COOL-DOWN CHECK-IN ---------- */}
          {step === "checkin" && (
            <motion.div key="checkin" {...fade} className="text-center">
              <h1 className="font-serif text-3xl tracking-tight">
                Still thinking about it?
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-stone-600">
                An hour ago you almost sent something. How did it end?
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "I sent the calmer version",
                  "I didn't send anything",
                  "I sent the original anyway",
                ].map((label) => (
                  <button
                    key={label}
                    onClick={() => setStep("choice")}
                    className="w-full rounded-xl border-2 border-stone-200 bg-white p-4 font-medium transition-colors hover:border-stone-900"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-5 text-xs text-stone-400">
                No judgment either way. This stays between you and you.
              </p>
            </motion.div>
          )}

          {/* ---------- KEEP OR RELEASE ---------- */}
          {step === "choice" && (
            <motion.div key="choice" {...fade}>
              <h2 className="text-center font-serif text-2xl tracking-tight">
                One last thing.
              </h2>
              <p className="mt-2 text-center text-sm text-stone-500">
                What should happen to the message you didn't send?
              </p>

              <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
                <p className="text-sm leading-relaxed text-stone-600">
                  {DRAFT}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setStep("vault")}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-stone-200 bg-white p-5 transition-colors hover:border-stone-900"
                >
                  <Archive className="h-6 w-6 text-stone-500" />
                  <span className="font-medium">Keep it</span>
                  <span className="text-xs leading-snug text-stone-400">
                    Saved on this device only. Future-you might want the
                    reminder.
                  </span>
                </button>
                <button
                  onClick={startBurn}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-orange-200 bg-orange-50 p-5 transition-colors hover:border-orange-700"
                >
                  <Flame className="h-6 w-6 text-orange-700" />
                  <span className="font-medium">Let it go</span>
                  <span className="text-xs leading-snug text-stone-400">
                    Gone for good. Watch it burn.
                  </span>
                </button>
              </div>

              <div className="mt-4 flex items-start justify-center gap-2 text-center text-xs text-stone-400">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                <span>Either way, it never touches our servers.</span>
              </div>
            </motion.div>
          )}

          {/* ---------- THE BURN ---------- */}
          {step === "burning" && (
            <motion.div key="burning" className="text-center">
              <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-6">
                <p className="text-left text-sm leading-relaxed">
                  {words.map((w, i) => (
                    <motion.span
                      key={i}
                      className="mr-1 inline-block text-stone-600"
                      initial={{ opacity: 1, y: 0, rotate: 0 }}
                      animate={{
                        opacity: 0,
                        y: -30 - (i % 5) * 14,
                        x: (i % 3) * 12 - 12,
                        rotate: (i % 7) * 6 - 18,
                        filter: "blur(4px)",
                        color: "#c2410c",
                      }}
                      transition={{
                        duration: 1.4,
                        delay: i * 0.045,
                        ease: "easeOut",
                      }}
                    >
                      {w}
                    </motion.span>
                  ))}
                </p>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-6 font-serif text-lg italic text-stone-500"
              >
                Letting it go…
              </motion.p>
            </motion.div>
          )}

          {/* ---------- RELEASED ---------- */}
          {step === "released" && (
            <motion.div key="released" {...fade} className="text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 text-amber-50"
              >
                <Sparkles className="h-6 w-6" />
              </motion.div>
              <h2 className="mt-6 font-serif text-2xl tracking-tight">
                Gone. For good.
              </h2>
              <p className="mx-auto mt-3 max-w-xs text-sm text-stone-500">
                That's <span className="font-medium text-stone-700">3</span>{" "}
                messages you've chosen not to send. Future-you says thanks.
              </p>
              <button
                onClick={() => setStep("vault")}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-3 text-sm font-medium text-amber-50 hover:bg-stone-800"
              >
                See your record <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* ---------- THE VAULT ---------- */}
          {step === "vault" && (
            <motion.div key="vault" {...fade}>
              <h2 className="text-center font-serif text-2xl tracking-tight">
                The Vault
              </h2>
              <p className="mt-2 text-center text-sm text-stone-500">
                Every disaster you decided against.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  ["3", "unsent"],
                  ["2", "kept"],
                  ["1", "let go"],
                ].map(([n, label]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-stone-200 bg-white py-4"
                  >
                    <div className="font-serif text-2xl">{n}</div>
                    <div className="text-xs text-stone-400">{label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                {VAULT_ENTRIES.map((e) => {
                  const Icon = e.icon;
                  return (
                    <div
                      key={e.id}
                      className="rounded-xl border border-stone-200 bg-white p-4"
                    >
                      <div className="flex items-center gap-2 text-xs text-stone-400">
                        <Icon className="h-3 w-3" />
                        <span>{e.recipient}</span>
                        <span>·</span>
                        <span>{e.ago}</span>
                      </div>
                      <p className="mt-2 truncate text-sm italic text-stone-500">
                        "{e.snippet}"
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex items-start justify-center gap-2 text-center text-xs text-stone-400">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Stored on this device only. We can't read it. We don't want
                  to.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="pb-8 text-center">
        <p className="font-serif text-sm italic text-stone-400">
          The best message is the one you almost sent.
        </p>
      </footer>
    </div>
  );
}