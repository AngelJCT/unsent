export type RewriteWant = { rewrite: boolean; tones: boolean };

export const FREE_REWRITE_LIMIT = 1;

export function requestedWant(input: unknown): RewriteWant {
  const raw = (input ?? {}) as { rewrite?: unknown; tones?: unknown };
  return {
    rewrite: raw.rewrite !== false,
    tones: raw.tones !== false,
  };
}

export function resolveRewriteWant(input: {
  requested: RewriteWant;
  isEntitled: boolean;
  freeReads: number;
}): RewriteWant {
  if (input.isEntitled) return input.requested;

  return {
    rewrite:
      input.requested.rewrite && input.freeReads < FREE_REWRITE_LIMIT,
    tones: false,
  };
}
