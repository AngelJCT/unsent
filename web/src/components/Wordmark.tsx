/** The one reusable lockup: serif italic, burn-orange period. */
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-brand italic tracking-tight ${className}`}>
      Unsent<span className="not-italic text-burn">.</span>
    </span>
  );
}
