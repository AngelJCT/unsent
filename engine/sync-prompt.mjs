#!/usr/bin/env node
/**
 * Generates web/src/lib/engine/prompt.ts from engine/prompt.txt.
 * The .txt is the canonical artifact; the edge runtime can't read
 * files, so the proxy imports the generated module.
 *
 * Usage: node engine/sync-prompt.mjs   (or `npm run sync-prompt` in web/)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "engine", "prompt.txt");
const out = join(root, "web", "src", "lib", "engine", "prompt.ts");

const text = readFileSync(src, "utf8");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  `// GENERATED from engine/prompt.txt — do not edit by hand.\n` +
    `// Regenerate with: npm run sync-prompt (from web/)\n` +
    `export const SYSTEM_PROMPT = ${JSON.stringify(text)};\n`
);
console.log(`wrote ${out} (${text.length} chars)`);
