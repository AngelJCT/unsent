import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, Copy, Check, Clock, ArrowRight } from "lucide-react";

const FEELINGS = ["Hurt", "Angry", "Anxious", "Done", "Hopeful"];
const RECIPIENTS = ["An ex", "My boss", "Family", "A friend"];

const SAMPLE_DRAFT =
  "wow. so you're just not going to answer me? after everything i did for you, that's honestly insane. whatever. hope it was worth it.";

const MIRRORS = {
  Hurt: "This will read as wounded and accusatory. The sarcasm at the end won't land as strength — it'll land as proof that you're not over it. They'll feel attacked first, guilty second, and they'll respond to the attack.",
  Angry: "This reads as rage with a tripwire in every sentence. 'After everything I did' will be heard as a bill coming due — and people don't pay bills like that, they dispute them. Expect escalation, not an apology.",
  Anxious: "This reads as panic dressed up as anger. The recipient will feel the desperation underneath, and that question isn't a question — it's a test they'll know they're failing. Tests make people withdraw.",
  Done: "For a message about being done, this asks for a lot of response. 'Hope it was worth it' is a door left open while slamming it. If you're truly finished, this draft says otherwise — loudly.",
  Hopeful:
    "This is hope wearing armor. You want reconnection, but every line here pushes them further away. They won't hear 'I miss you' — they'll hear 'defend yourself.'",
};

const REWRITES = {
  Hurt: "I'll be honest — the silence stings, and I'd rather say that plainly than pretend it doesn't. If you're not in a place to talk, I understand. I just didn't want to leave it unsaid.",
  Angry: "I'm frustrated, and I don't want to say something I can't take back. When you have a moment, I'd like to actually talk about this — not like this.",
  Anxious:
    "I noticed I haven't heard back and I'm not sure how to read it. No pressure to respond right away — I'd just rather know where things stand than guess.",
  Done: "I think this is where I step back. No hard feelings on my end — I just know what I need going forward. Take care of yourself.",
  Hopeful:
    "I've been thinking about you, and I didn't want pride to keep me from saying it. No expectations — but if you're ever up for talking, I'd like that.",
};

const RECIPIENT_NOTES = {
  "An ex": "With an ex, every word gets re-read three times. Calm is the only thing that can't be used against you.",
  "My boss": "This one has consequences with a salary attached. We kept it direct, but removed everything HR could screenshot.",
  Family: "Family remembers tone longer than content. This version says the hard thing without giving them the fight they expect.",
  "A friend": "Friendships survive honesty better than they survive sarcasm. This keeps the honesty, drops the barbs.",
};

export default function UnsentLanding() {
  const [draft, setDraft] = useState("");
  const [feeling, setFeeling] = useState(null);
  const [recipient, setRecipient] = useState(null);
  const [stage, setStage] = useState("compose"); // compose | reading | result
  const [copied, setCopied] = useState(false);
  const [held, setHeld] = useState(false);

  const ready = draft.trim().length > 0 && feeling && recipient;

  const runRead = () => {
    if (!ready) return;
    setStage("reading");
    setHeld(false);
    setCopied(false);
    setTimeout(() => setStage("result"), 1600);
  };

  const copyRewrite = async () => {
    try {
      await navigator.clipboard.writeText(REWRITES[feeling]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setStage("compose");
    setHeld(false);
    setCopied(false);
  };

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

      <main className="mx-auto w-full max-w-5xl px-6 pb-20">
        {/* Hero */}
        <section className="mx-auto max-w-2xl pt-10 pb-12 text-center md:pt-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-orange-700">
            Emotional spellcheck
          </p>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-6xl">
            Feel everything.
            <br />
            <span className="italic">Send what serves you.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-stone-600">
            It's 11:47pm and your thumb is hovering over send. Before it goes
            anywhere — let's read it once, the way <em>they</em> will.
          </p>
        </section>

        {/* Composer */}
        <section className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-stone-700">
                The draft
              </label>
              <button
                onClick={() => setDraft(SAMPLE_DRAFT)}
                className="text-xs text-orange-700 underline underline-offset-2 hover:text-orange-800"
              >
                Try a sample draft
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              placeholder="Paste what you're about to send. We won't judge it — we've seen worse."
              className="w-full resize-none rounded-xl border border-stone-200 bg-amber-50 p-4 font-serif text-base leading-relaxed text-stone-800 placeholder:font-sans placeholder:text-sm placeholder:text-stone-400 focus:border-orange-700 focus:outline-none"
            />

            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-stone-700">
                This is going to…
              </p>
              <div className="flex flex-wrap gap-2">
                {RECIPIENTS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRecipient(r)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      recipient === r
                        ? "border-stone-900 bg-stone-900 text-amber-50"
                        : "border-stone-300 bg-white text-stone-600 hover:border-stone-500"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-stone-700">
                Right now you feel…
              </p>
              <div className="flex flex-wrap gap-2">
                {FEELINGS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFeeling(f)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      feeling === f
                        ? "border-orange-700 bg-orange-700 text-amber-50"
                        : "border-stone-300 bg-white text-stone-600 hover:border-stone-500"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={runRead}
              disabled={!ready || stage === "reading"}
              className={`mt-7 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-medium transition-all ${
                ready && stage !== "reading"
                  ? "bg-stone-900 text-amber-50 hover:bg-stone-800"
                  : "cursor-not-allowed bg-stone-200 text-stone-400"
              }`}
            >
              {stage === "reading" ? (
                "Reading it the way they will…"
              ) : (
                <>
                  Read it before they do <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs text-stone-400">
              Nothing is sent. Nothing is saved. This stays between us.
            </p>
          </div>
        </section>

        {/* Result */}
        <AnimatePresence>
          {stage === "result" && (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mx-auto mt-10 max-w-4xl"
            >
              <p className="mb-6 text-center font-serif text-xl italic text-stone-700">
                Okay. Here's the honest read.
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Mirror */}
                <div className="rounded-2xl border-2 border-orange-200 bg-white p-6">
                  <div className="mb-3 flex items-center gap-2 text-orange-700">
                    <Eye className="h-4 w-4" />
                    <h2 className="text-xs font-semibold uppercase tracking-widest">
                      How it will read
                    </h2>
                  </div>
                  <p className="text-sm leading-relaxed text-stone-700">
                    {MIRRORS[feeling]}
                  </p>
                  <p className="mt-4 border-t border-stone-100 pt-4 text-xs italic text-stone-500">
                    {RECIPIENT_NOTES[recipient]}
                  </p>
                </div>

                {/* Rewrite */}
                <div className="rounded-2xl border border-stone-200 bg-stone-900 p-6 text-amber-50">
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-200">
                    What you could send instead
                  </h2>
                  <p className="font-serif text-base leading-relaxed">
                    “{REWRITES[feeling]}”
                  </p>
                  <button
                    onClick={copyRewrite}
                    className="mt-5 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-amber-100"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" /> Copied. Go get 'em.
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy this version
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Cool-down */}
              <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-amber-50 p-5 text-center">
                {held ? (
                  <p className="text-sm text-stone-600">
                    <span className="font-medium text-stone-800">
                      Held for one hour.
                    </span>{" "}
                    If you still want to send it at 12:47am, it'll still be
                    wrong — but it'll be your call. We'll check on you.
                  </p>
                ) : (
                  <button
                    onClick={() => setHeld(true)}
                    className="mx-auto flex items-center gap-2 text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
                  >
                    <Clock className="h-4 w-4" />
                    Or keep it unsent for an hour. We'll check on you.
                  </button>
                )}
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={reset}
                  className="text-sm text-stone-500 underline underline-offset-4 hover:text-stone-800"
                >
                  Read another draft
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-20 border-t border-stone-200 pt-10 text-center">
          <p className="font-serif text-2xl italic tracking-tight text-stone-800 md:text-3xl">
            The best message is the one you{" "}
            <span className="text-orange-700">almost</span> sent.
          </p>
          <p className="mt-6 text-xs text-stone-400">
            Unsent. — say it right, or not at all.
          </p>
        </footer>
      </main>
    </div>
  );
}