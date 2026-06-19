/**
 * Client-side crisis pre-pass (plan §3.6). A fast, keyword + pattern
 * check that runs BEFORE any engine call, so a self-harm signal breaks
 * the flow to support resources even when:
 *   - the model misses it (the engine's crisis flag is the second layer), or
 *   - the engine is down (the network never gets a vote).
 *
 * It never sees a server and never logs. It is deliberately tuned for
 * self-harm / suicide signals only — threats toward others are handled
 * by the rewrite engine, not here. Patterns require a self-directed
 * harm context so common idioms ("I'll die of embarrassment", "this is
 * killing me", "I could kill him") do NOT trip it; the model catches
 * subtler phrasings this misses.
 */

const CRISIS_PATTERNS: RegExp[] = [
  /\b(kill|hurt|harm|cut|cutting)\s+(myself|me)\b/i,
  /\bkms\b/i,
  /\b(end|ending|take|taking)\s+(my\s+(own\s+)?life|my\s+life|it\s+all)\b/i,
  /\bend\s+myself\b/i,
  /\bwant(ing)?\s+to\s+die\b/i,
  /\b(don'?t|do\s+not|never)\s+want\s+to\s+(be\s+(here|alive)|live|wake\s+up|exist)\b/i,
  /\bno\s+longer\s+want\s+to\s+(be\s+(here|alive)|live|exist)\b/i,
  /\bbetter\s+off\s+without\s+me\b/i,
  /\b(everyone|you('?d|\s+would)|they('?d|\s+would))\s+.{0,24}\bbetter\s+off\b.{0,16}\b(without|if\s+i)\b/i,
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living|life|go(ing)?\s+on)\b/i,
  /\b(nothing|no\s+reason)\s+(left\s+)?to\s+live\s+for\b/i,
  /\bwish\s+I\s+(was|were)\s+(dead|gone|never\s+born)\b/i,
  /\bwant\s+(it|everything)\s+to\s+(end|stop)\b/i,
  /\bsuicid(e|al)\b/i,
  /\b(take|end)\s+my\s+own\s+life\b/i,
];

export function looksLikeCrisis(draft: string): boolean {
  const text = draft.normalize("NFKC");
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}
