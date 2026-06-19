import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Share2, Download, Lock, Receipt } from "lucide-react";

const DRAFT =
  "wow. so you can post stories all weekend but my text from THURSDAY is still on read. you know what, don't even bother replying, I clearly know where I stand. hope the new friends are fun.";

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.35 },
};

function widthClass(word) {
  const len = word.replace(/[^a-zA-Z]/g, "").length;
  if (len <= 2) return "w-6";
  if (len <= 4) return "w-10";
  if (len <= 6) return "w-14";
  if (len <= 8) return "w-20";
  return "w-24";
}

export default function UnsentReceipt() {
  const [step, setStep] = useState("prompt"); // prompt -> receipt
  const [shared, setShared] = useState(false);

  const words = useMemo(() => DRAFT.split(/\s+/), []);
  const stats = useMemo(() => {
    const capsWords = words.filter(
      (w) => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w)
    ).length;
    const exclaims = (DRAFT.match(/!/g) || []).length;
    const questions = (DRAFT.match(/\?/g) || []).length;
    return { count: words.length, capsWords, exclaims, questions };
  }, [words]);

  return (
    <div className="flex min-h-screen flex-col bg-amber-50 text-stone-900 antialiased">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-6 py-6">
        <span className="font-serif text-2xl italic tracking-tight">
          Unsent<span className="text-orange-700">.</span>
        </span>
        <span className="text-xs text-stone-400">after the burn</span>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 pb-16">
        <AnimatePresence mode="wait">
          {/* ---------- PROMPT ---------- */}
          {step === "prompt" && (
            <motion.div key="prompt" {...fade} className="text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 text-amber-50"
              >
                <Receipt className="h-6 w-6" />
              </motion.div>
              <h1 className="mt-6 font-serif text-3xl tracking-tight">
                Want the receipt?
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-stone-600">
                Proof of what you almost did — and didn't. Your words stay
                hidden. Only the damage report goes on record.
              </p>
              <button
                onClick={() => setStep("receipt")}
                className="mt-8 rounded-xl bg-stone-900 px-8 py-4 text-base font-medium text-amber-50 hover:bg-stone-800"
              >
                Print my receipt
              </button>
              <p className="mt-4 text-xs text-stone-400">
                No thanks — some things don't need a record.
              </p>
            </motion.div>
          )}

          {/* ---------- THE RECEIPT ---------- */}
          {step === "receipt" && (
            <motion.div key="receipt" {...fade}>
              <div className="mx-auto w-full max-w-sm border border-stone-200 bg-white px-6 py-7 font-mono text-xs text-stone-700 shadow-sm">
                {/* header */}
                <div className="text-center">
                  <div className="text-sm font-bold tracking-widest">
                    UNSENT
                  </div>
                  <div className="mt-1 text-stone-400">
                    OFFICIAL RECORD OF RESTRAINT
                  </div>
                  <div className="mt-1 text-stone-400">
                    TUE · 11:47 PM · TO: AN EX
                  </div>
                </div>

                <div className="my-4 border-t border-dashed border-stone-300" />

                {/* redacted body */}
                <div className="flex flex-wrap gap-1">
                  {words.map((w, i) => (
                    <motion.span
                      key={i}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ delay: 0.4 + i * 0.03, duration: 0.2 }}
                      style={{ originX: 0 }}
                      className={`h-3 rounded-sm ${widthClass(w)} ${
                        i >= words.length - 5
                          ? "bg-orange-300"
                          : "bg-stone-800"
                      }`}
                    />
                  ))}
                </div>

                <div className="my-4 border-t border-dashed border-stone-300" />

                {/* stats */}
                <div className="space-y-1.5">
                  {[
                    ["WORDS DRAFTED", String(stats.count)],
                    ["ALL-CAPS WORDS", String(stats.capsWords)],
                    ["EXCLAMATION PTS", String(stats.exclaims)],
                    ["RHETORICAL ?s", String(stats.questions)],
                    ["DRAFTS TOTAL", "3"],
                    ["MESSAGES SENT", "0"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-stone-400">{k}</span>
                      <span className="font-bold">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="my-4 border-t border-dashed border-stone-300" />

                <div className="flex items-center justify-between">
                  <span className="text-stone-400">STATUS</span>
                  <span className="flex items-center gap-1 font-bold text-orange-700">
                    <Flame className="h-3 w-3" /> BURNED
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between">
                  <span className="text-stone-400">EST. SAVINGS</span>
                  <span className="font-bold">1 FRIENDSHIP</span>
                </div>

                {/* barcode */}
                <div className="mt-5 flex h-8 items-stretch justify-center gap-px">
                  {words.slice(0, 36).map((w, i) => (
                    <div
                      key={i}
                      className={`${
                        w.length % 3 === 0 ? "w-1" : "w-px"
                      } bg-stone-900`}
                    />
                  ))}
                </div>
                <div className="mt-3 text-center italic text-stone-400">
                  the best message is the one you almost sent
                </div>
              </div>

              {/* actions */}
              <div className="mx-auto mt-6 flex max-w-sm gap-3">
                <button
                  onClick={() => setShared(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-amber-50 hover:bg-stone-800"
                >
                  <Share2 className="h-4 w-4" /> Share
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-sm font-medium hover:border-stone-900">
                  <Download className="h-4 w-4" /> Save
                </button>
              </div>

              <AnimatePresence>
                {shared && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-center text-xs text-stone-500"
                  >
                    Let them wonder what it said.
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="mt-5 flex items-start justify-center gap-2 text-center text-xs text-stone-400">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  This card holds shapes, not words. Your message never left
                  your phone.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="pb-8 text-center">
        <p className="font-serif text-sm italic text-stone-400">
          Unsent — for everything you almost said.
        </p>
      </footer>
    </div>
  );
}