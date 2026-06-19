import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  Heart,
  Briefcase,
  Home,
  Users,
  MessageCircle,
  Eye,
} from "lucide-react";

const RECIPIENTS = [
  { id: "ex", label: "An ex", icon: Heart },
  { id: "work", label: "Boss / coworker", icon: Briefcase },
  { id: "family", label: "Family", icon: Home },
  { id: "friend", label: "A friend", icon: Users },
  { id: "other", label: "Someone else", icon: MessageCircle },
];

const SAMPLE_DRAFT =
  "wow. so you can post stories all weekend but my text from THURSDAY is still on read. you know what, don't even bother replying, I clearly know where I stand. hope the new friends are fun.";

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.35 },
};

export default function UnsentOnboarding() {
  const [step, setStep] = useState("arrival"); // arrival -> who -> compose -> reading
  const [recipient, setRecipient] = useState(null);
  const [draft, setDraft] = useState("");
  const [isSample, setIsSample] = useState(false);
  const [handoff, setHandoff] = useState(false);

  useEffect(() => {
    if (step === "reading") {
      const t = setTimeout(() => setHandoff(true), 2200);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div className="flex min-h-screen flex-col bg-amber-50 text-stone-900 antialiased">
      {/* Minimal header */}
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-6 py-6">
        <span className="font-serif text-2xl italic tracking-tight">
          Unsent<span className="text-orange-700">.</span>
        </span>
        {step !== "arrival" && step !== "reading" && (
          <button
            onClick={() => setStep(step === "compose" ? "who" : "arrival")}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600"
          >
            <ArrowLeft className="h-3 w-3" /> back
          </button>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 pb-16">
        <AnimatePresence mode="wait">
          {/* ---------- STEP 1: ARRIVAL ---------- */}
          {step === "arrival" && (
            <motion.div key="arrival" {...fade} className="text-center">
              <h1 className="font-serif text-3xl leading-snug tracking-tight md:text-4xl">
                Write what you feel.
                <br />
                Send what you{" "}
                <span className="italic text-orange-700">mean.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-stone-600">
                Paste the message you're about to regret. We'll show you how it
                will actually read — then help you say it right.
              </p>
              <button
                onClick={() => setStep("who")}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-4 text-base font-medium text-amber-50 transition-colors hover:bg-stone-800"
              >
                I have a message I shouldn't send
                <ArrowRight className="h-4 w-4" />
              </button>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setDraft(SAMPLE_DRAFT);
                    setIsSample(true);
                    setRecipient("ex");
                    setStep("compose");
                  }}
                  className="text-xs text-stone-400 underline underline-offset-4 hover:text-stone-600"
                >
                  Just looking? See it work on a sample.
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------- STEP 2: WHO ---------- */}
          {step === "who" && (
            <motion.div key="who" {...fade}>
              <h2 className="text-center font-serif text-2xl tracking-tight">
                Who's on the other end?
              </h2>
              <p className="mt-2 text-center text-sm text-stone-500">
                The same words land differently depending on who reads them.
              </p>
              <div className="mt-8 space-y-3">
                {RECIPIENTS.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setRecipient(r.id);
                        setStep("compose");
                      }}
                      className="flex w-full items-center gap-4 rounded-xl border-2 border-stone-200 bg-white p-4 text-left transition-colors hover:border-stone-900"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-medium">{r.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 text-center">
                <button
                  onClick={() => setStep("compose")}
                  className="text-xs text-stone-400 underline underline-offset-4 hover:text-stone-600"
                >
                  Skip — just read the message
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------- STEP 3: COMPOSE ---------- */}
          {step === "compose" && (
            <motion.div key="compose" {...fade}>
              <h2 className="text-center font-serif text-2xl tracking-tight">
                {isSample ? "Here's one of ours." : "Paste it. All of it."}
              </h2>
              <p className="mt-2 text-center text-sm text-stone-500">
                {isSample
                  ? "A classic 11:47pm draft. See what the mirror does with it."
                  : "The version you actually typed — not the polite one."}
              </p>

              <div className="mt-6 rounded-2xl border-2 border-stone-200 bg-white p-1 focus-within:border-stone-900">
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setIsSample(false);
                  }}
                  rows={7}
                  placeholder="Paste or type the message here…"
                  className="w-full resize-none rounded-xl bg-transparent p-4 text-base leading-relaxed text-stone-800 placeholder-stone-300 focus:outline-none"
                />
              </div>

              <div className="mt-3 flex items-start justify-center gap-2 text-center text-xs text-stone-500">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Never stored. Never used for training. Gone when you close
                  the app.
                </span>
              </div>

              <button
                onClick={() => setStep("reading")}
                disabled={!draft.trim()}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-4 text-base font-medium text-amber-50 transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                <Eye className="h-4 w-4" />
                Show me how it reads
              </button>

              {!draft.trim() && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      setDraft(SAMPLE_DRAFT);
                      setIsSample(true);
                    }}
                    className="text-xs text-stone-400 underline underline-offset-4 hover:text-stone-600"
                  >
                    No draft right now? Try one of ours.
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ---------- STEP 4: READING ---------- */}
          {step === "reading" && (
            <motion.div key="reading" {...fade} className="text-center">
              {!handoff ? (
                <>
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 text-amber-50"
                  >
                    <Eye className="h-6 w-6" />
                  </motion.div>
                  <p className="mt-6 font-serif text-xl italic text-stone-700">
                    Taking an honest look…
                  </p>
                  <p className="mt-2 text-xs text-stone-400">
                    Reading it the way they will.
                  </p>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl border border-dashed border-stone-300 p-8"
                >
                  <p className="text-sm text-stone-500">
                    → Hand-off to the mirror screen we already built.
                    <br />
                    <span className="text-xs text-stone-400">
                      (Total time from open to here: ~25 seconds, one optional
                      tap, zero signups.)
                    </span>
                  </p>
                </motion.div>
              )}
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