import type { Metadata } from "next";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";

export const metadata: Metadata = {
  title: "Privacy — Unsent.",
  description: "What Unsent does and doesn't do with your words.",
};

const UPDATED = "June 14, 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/" aria-label="Back to Unsent">
        <Wordmark className="text-2xl" />
      </Link>

      <h1 className="mt-10 font-brand text-4xl italic tracking-tight">
        Privacy
      </h1>
      <p className="mt-2 font-receipt text-xs uppercase tracking-wider text-ash">
        Last updated {UPDATED}
      </p>

      <p className="mt-8 text-base leading-relaxed text-ink">
        The short version: your words are sacred. We don&apos;t store them, we
        can&apos;t read them, and we never use them to train anything. Most of
        Unsent runs on your own device. Here&apos;s exactly what happens.
      </p>

      <Section title="What we never do">
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>We never store your messages on our servers.</li>
          <li>We never write your draft to a database or a log.</li>
          <li>We can&apos;t read your messages, and we don&apos;t want to.</li>
          <li>We never sell or share your words, or use them to train models.</li>
        </ul>
      </Section>

      <Section title="The one place your draft travels">
        <p>
          To rewrite your message, your draft is sent — once, in the moment —
          to an AI service (via OpenRouter) that returns the calmer version. It
          isn&apos;t stored, logged, or used to train anything, and we can&apos;t
          read it. The request carries no name, no email, and no account — only
          your draft and the calmer text that comes back, which is shown to you
          and then discarded.
        </p>
      </Section>

      <Section title="What stays on your device">
        <p>
          The Vault (messages you choose to keep) is encrypted and lives only on
          your device — never on our servers. The Receipt is generated on your
          device and holds shapes, not words. If you clear the app&apos;s data
          or use &ldquo;Burn everything,&rdquo; it&apos;s gone.
        </p>
      </Section>

      <Section title="What we do collect (and it&apos;s tiny)">
        <p>
          Everything we collect is anonymous and content-free — it&apos;s about
          decisions, never words:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            A random device token generated on your device. It isn&apos;t tied
            to your identity and contains nothing about you.
          </li>
          <li>
            Aggregate counts — e.g. &ldquo;a message was burned&rdquo; with a
            category like &ldquo;an ex&rdquo; — with no text attached.
          </li>
          <li>
            Basic, content-free usage events (e.g. that a rewrite was shown) so
            we can tell whether the app works.
          </li>
        </ul>
        <p className="mt-3">
          No accounts. No email is asked for until you choose to purchase.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          If you buy Pro, payment is handled by Stripe as merchant of record,
          and entitlements are managed by RevenueCat. To process your purchase,
          those providers receive the information you give them at checkout
          (such as your email and payment details) under their own privacy
          policies. We receive only whether your device is entitled to Pro —
          never your card details.
        </p>
      </Section>

      <Section title="On-device storage">
        <p>
          We use your browser&apos;s local storage for the things that make the
          app work: your anonymous device token, your kept Vault, and your Pro
          status. We don&apos;t use third-party advertising or cross-site
          tracking.
        </p>
      </Section>

      <Section title="Children">
        <p>
          Unsent isn&apos;t directed to anyone under 16, and we don&apos;t
          knowingly collect information from them.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can clear your local data at any time from your browser or the
          app. Because there&apos;s no account and no message storage on our
          side, there&apos;s nothing of your content for us to delete — there
          was never a copy.
        </p>
      </Section>

      <Section title="Changes & contact">
        <p>
          We may update this page; the date above reflects the latest version.
          Questions? Email{" "}
          <a
            href="mailto:acarrion5991@gmail.com"
            className="text-burn underline underline-offset-2"
          >
            acarrion5991@gmail.com
          </a>
          .
        </p>
        <p className="mt-3">
          Unsent is operated by Angel J. Carrión from the Commonwealth of Puerto
          Rico. See our{" "}
          <Link href="/terms" className="text-burn underline underline-offset-2">
            Terms
          </Link>
          .
        </p>
      </Section>

      <footer className="mt-12 border-t border-paper-border pt-6 font-brand text-sm italic text-ash">
        We never store your messages. We can&apos;t read them.
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-brand text-xl italic tracking-tight">{title}</h2>
      <div className="mt-2 text-base leading-relaxed text-ash-deep">{children}</div>
    </section>
  );
}
