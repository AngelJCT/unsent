import type { Metadata } from "next";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";

export const metadata: Metadata = {
  title: "Terms — Unsent.",
  description: "The terms for using Unsent.",
};

const UPDATED = "June 14, 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/" aria-label="Back to Unsent">
        <Wordmark className="text-2xl" />
      </Link>

      <h1 className="mt-10 font-brand text-4xl italic tracking-tight">
        Terms of Use
      </h1>
      <p className="mt-2 font-receipt text-xs uppercase tracking-wider text-ash">
        Last updated {UPDATED}
      </p>

      <p className="mt-8 text-base leading-relaxed text-ink">
        Unsent is operated by Angel J. Carrión (&ldquo;we,&rdquo;
        &ldquo;us&rdquo;). By using Unsent, you agree to these terms. They&apos;re
        written plainly on purpose.
      </p>

      <Section title="What Unsent is">
        <p>
          Unsent helps you rewrite a message before you send it. It shows how
          your draft is likely to read and offers calmer versions. You always
          decide what to send — Unsent never sends anything on your behalf.
        </p>
      </Section>

      <Section title="Not a crisis, medical, or mental-health service">
        <p>
          Unsent is a writing tool, not therapy, counseling, medical advice, or
          an emergency service, and using it creates no professional
          relationship. It is not a substitute for professional help.{" "}
          <strong className="font-semibold text-ink">
            If you are in crisis or may be in danger, contact your local
            emergency number or a crisis line right away.
          </strong>{" "}
          Unsent may surface support resources, but it cannot and does not
          provide crisis intervention.
        </p>
      </Section>

      <Section title="Accounts">
        <p>
          There&apos;s no sign-up. Your device is your access; your anonymous
          device token represents your standing (including Pro). Keep your
          device secure — anyone using it can use your Unsent.
        </p>
      </Section>

      <Section title="Pro subscriptions & billing">
        <p>
          Pro is offered as Monthly and Yearly subscriptions. Payment is
          processed by Stripe as merchant of record. Subscriptions
          automatically renew at the then-current price until you cancel.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-ink">Cancel anytime.</strong>{" "}
            Canceling stops future renewals; your access continues until the end
            of the period you paid for.
          </li>
          <li>
            We may change prices or plans; changes apply to future billing
            periods, with notice where required.
          </li>
          <li>
            The honest read is always free. We will never charge you to{" "}
            <em>not</em> send something.
          </li>
        </ul>
      </Section>

      <Section title="Refunds">
        <p>
          Payments are for digital content delivered immediately, so all sales
          are final and we don&apos;t offer refunds except where required by
          law. Because Stripe is the merchant of record, refund requests may
          also be handled under Stripe&apos;s policies. To cancel future
          renewals or ask about a charge, email{" "}
          <a
            href="mailto:acarrion5991@gmail.com"
            className="text-burn underline underline-offset-2"
          >
            acarrion5991@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Use Unsent for your own messages and lawful purposes. Don&apos;t use
          it to harass, threaten, or harm others, to break the law, or to
          attempt to disrupt or reverse-engineer the service.
        </p>
      </Section>

      <Section title="Your content & the rewrites">
        <p>
          Your draft is yours. The calmer versions Unsent produces are yours to
          use freely. The app, its name, design, and brand remain ours. See our{" "}
          <Link href="/privacy" className="text-burn underline underline-offset-2">
            Privacy page
          </Link>{" "}
          for how your words are (and aren&apos;t) handled.
        </p>
      </Section>

      <Section title="The service is provided “as is”">
        <p>
          Unsent uses AI to rewrite messages, and AI output can be imperfect or
          unexpected. You are responsible for reviewing and deciding what you
          send. To the fullest extent permitted by law, Unsent is provided
          without warranties of any kind, and we aren&apos;t liable for
          indirect, incidental, or consequential damages, or for anything you
          choose to send.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of the Commonwealth of Puerto
          Rico and applicable United States law, without regard to conflict-of-law
          rules.
        </p>
      </Section>

      <Section title="Changes & contact">
        <p>
          We may update these terms; the date above reflects the latest version.
          Questions? Email{" "}
          <a
            href="mailto:acarrion5991@gmail.com"
            className="text-burn underline underline-offset-2"
          >
            acarrion5991@gmail.com
          </a>
          .
        </p>
      </Section>

      <footer className="mt-12 border-t border-paper-border pt-6 font-brand text-sm italic text-ash">
        The best message is the one you almost sent.
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
