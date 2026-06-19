#!/usr/bin/env node
/**
 * Phase 0 gate helper (plan §6, Phase 0 DoD): throw real, ugly drafts
 * at the running proxy and eyeball the result. PASS is a judgment
 * call — "if the mirror reads like a horoscope, stop and fix the
 * prompt" — but this script gives you the inputs fast and checks the
 * mechanical parts: valid JSON shape, crisis flagging, and latency
 * against the ~2.5s ceremony budget.
 *
 * Usage (dev server running, OPENROUTER_API_KEY + OPENROUTER_MODEL set):
 *   node engine/smoke.mjs [--url http://localhost:3000/api/rewrite] [--all] [--limit N]
 *
 * No dependencies; Node 18+. Drafts are synthetic — fine to send.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--"))
      acc.push([a.slice(2), arr[i + 1]?.startsWith("--") ? true : arr[i + 1] ?? true]);
    return acc;
  }, [])
);
const url = typeof args.url === "string" ? args.url : "http://localhost:3000/api/rewrite";

const { drafts } = JSON.parse(readFileSync(join(here, "drafts.json"), "utf8"));
// Default spread: ugly, long, calm, incoherent, threat, and the
// self-harm draft (must come back crisis:true, empty mirror/rewrite).
const DEFAULT_IDS = ["ex-02", "boss-01", "family-08", "friend-09", "other-12", "ex-06", "ex-10", "ex-05"];
let sample = args.all
  ? drafts
  : DEFAULT_IDS.map((id) => drafts.find((d) => d.id === id)).filter(Boolean);
if (args.limit) sample = sample.slice(0, Number(args.limit));

const recipientFor = (cat) => (cat === "ex" ? "an ex" : cat);
const latencies = [];
let failures = 0;

for (const [i, d] of sample.entries()) {
  const t0 = Date.now();
  let status = 0;
  let body = null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // unique per request so the smoke run never trips its own rate limit
        "x-device-token": `smoke-${Date.now()}-${i}`,
      },
      body: JSON.stringify({ draft: d.text, recipient: recipientFor(d.category), feeling: null }),
    });
    status = res.status;
    body = await res.json().catch(() => null);
  } catch (e) {
    body = { error: String(e.message ?? e) };
  }
  const ms = Date.now() - t0;
  latencies.push(ms);

  const ok = status === 200 && body && (body.crisis === true || (body.mirror && body.rewrite));
  if (!ok) failures++;
  console.log(`\n━━ ${d.id} (${d.special}) — ${status} in ${ms}ms ${ok ? "" : "✗ FAIL"}`);
  console.log(`draft:   ${d.text.slice(0, 100)}${d.text.length > 100 ? "…" : ""}`);
  if (body?.crisis) console.log(`crisis:  true (flow breaks, resources shown)`);
  else if (ok) {
    console.log(`mirror:  ${body.mirror}`);
    console.log(`rewrite: ${body.rewrite}`);
  } else console.log(`body:    ${JSON.stringify(body)}`);
}

latencies.sort((a, b) => a - b);
const pct = (p) => latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))];
console.log(`\n──────────────────────────────────────`);
console.log(`drafts: ${sample.length}   mechanical failures: ${failures}`);
console.log(`latency p50 ${pct(50)}ms · p95 ${pct(95)}ms · budget ≤2500ms ${pct(95) <= 2500 ? "✓" : "✗ over"}`);
console.log(`\nnow the human gate: do the mirrors quote the drafts' own words back?`);
process.exit(failures ? 1 : 0);
