import assert from "node:assert/strict";
import test from "node:test";
import {
  requestedWant,
  resolveRewriteWant,
} from "../src/lib/server/rewrite-access.ts";

test("unpaid first read can receive the default rewrite but never tones", () => {
  assert.deepEqual(
    resolveRewriteWant({
      requested: requestedWant({ rewrite: true, tones: true }),
      isEntitled: false,
      freeReads: 0,
    }),
    { rewrite: true, tones: false },
  );
});

test("unpaid returning reads receive mirror only even if the client asks for paid output", () => {
  assert.deepEqual(
    resolveRewriteWant({
      requested: requestedWant({ rewrite: true, tones: true }),
      isEntitled: false,
      freeReads: 1,
    }),
    { rewrite: false, tones: false },
  );
});

test("paid reads honor the requested paid parts", () => {
  assert.deepEqual(
    resolveRewriteWant({
      requested: requestedWant({ rewrite: false, tones: true }),
      isEntitled: true,
      freeReads: 20,
    }),
    { rewrite: false, tones: true },
  );
});
