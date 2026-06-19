/**
 * On-device draft stats for the Receipt (dev plan §2: computed on-device,
 * no server ever sees them). Runs live and silently while the user types.
 */

export type DraftStats = {
  words: number;
  capsWords: number;
  exclamations: number;
  questions: number;
  characters: number;
};

export function computeDraftStats(text: string): DraftStats {
  const tokens = text.split(/\s+/).filter(Boolean);
  let capsWords = 0;
  for (const token of tokens) {
    const letters = token.replace(/[^\p{L}]/gu, "");
    // "DONE" counts; "I" and "OK." don't shout on their own
    if (
      letters.length >= 2 &&
      letters === letters.toUpperCase() &&
      letters !== letters.toLowerCase()
    ) {
      capsWords++;
    }
  }
  return {
    words: tokens.length,
    capsWords,
    exclamations: (text.match(/!/g) ?? []).length,
    questions: (text.match(/\?/g) ?? []).length,
    characters: text.length,
  };
}
