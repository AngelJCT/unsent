/**
 * The engine proxy (plan §2, §3.3) — the ONLY server code that ever
 * touches a draft.
 *
 * NON-NEGOTIABLES, enforced here and in review:
 * - No logging of request/response bodies. Error telemetry is status
 *   code + latency ONLY. No analytics middleware on this route.
 * - No persistence in the path. The draft lives in memory for one
 *   request and is gone.
 * - IP is never read, stored, or used — not even for rate limiting
 *   (plan §3.3: nothing that fingerprints a person). Keep platform
 *   request logging off for this route in hosting config.
 * - Every call carries the OpenRouter no-retention/no-training
 *   data-policy filter (plan §3.2). Account-side toggles must also be
 *   off — see engine/README.md checklist.
 *
 * Small is the security model: this file should stay auditable in an
 * afternoon.
 */
import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/engine/prompt";
import {
  requestedWant,
  resolveRewriteWant,
  type RewriteWant,
} from "@/lib/server/rewrite-access";

export const runtime = "edge";

const MAX_DRAFT_CHARS = 4000;
const MAX_REQUEST_BYTES = 16 * 1024;
const ATTEMPT_TIMEOUT_MS = 6000;
const TOKEN_LIMIT_PER_HOUR = 10;
const USAGE_COOKIE = "unsent_usage_v1";
const USAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const RC_KEY =
  process.env.REVENUECAT_PUBLIC_API_KEY ??
  process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY;
const ENTITLEMENT_ID =
  process.env.REVENUECAT_ENTITLEMENT ??
  process.env.NEXT_PUBLIC_REVENUECAT_ENTITLEMENT ??
  "pro";

const RECIPIENTS = new Set(["an ex", "boss", "family", "friend", "other"]);
const FEELINGS = new Set(["hurt", "angry", "anxious", "done", "hopeful"]);

// Best-effort, per-isolate, keyed only by the ephemeral device token.
// The hard backstop is the OpenRouter spend cap, not this map.
const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(token: string): boolean {
  const now = Date.now();
  const b = buckets.get(token);
  if (!b || now > b.resetAt) {
    buckets.set(token, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }
  b.count++;
  return b.count > TOKEN_LIMIT_PER_HOUR;
}

function modelList(): string[] {
  const primary = process.env.OPENROUTER_MODEL;
  if (!primary) return [];
  const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [primary, ...fallbacks];
}

type EngineTones = { warm: string; final: string; unbothered: string };
// Generation is scoped to entitlement (plan: generate-on-pay). `want`
// decides which paid parts get generated AND returned — the server never
// produces text the caller hasn't earned. mirror + crisis are always on.
type Want = RewriteWant;
type EngineOut = {
  mirror: string;
  crisis: boolean;
  rewrite?: string;
  tones?: EngineTones;
};
type UsageState = { deviceHash: string; freeReads: number };

const TONES_SCHEMA = {
  type: "object",
  properties: {
    warm: { type: "string" },
    final: { type: "string" },
    unbothered: { type: "string" },
  },
  required: ["warm", "final", "unbothered"],
  additionalProperties: false,
};

// Hard JSON guarantee where the provider supports it (plan §3.4), built
// per-request so the schema only lists the keys this caller may receive.
// Best-effort: OpenRouter routes around providers that can't honor it, and
// the prompt + parseEngineJson still cover any that ignore it.
function responseFormat(want: Want) {
  const properties: Record<string, unknown> = {
    mirror: { type: "string" },
    crisis: { type: "boolean" },
  };
  const required = ["mirror", "crisis"];
  if (want.rewrite) {
    properties.rewrite = { type: "string" };
    required.push("rewrite");
  }
  if (want.tones) {
    properties.tones = TONES_SCHEMA;
    required.push("tones");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: "mirror_rewrite",
      strict: true,
      schema: { type: "object", properties, required, additionalProperties: false },
    },
  };
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodePayload(value: unknown): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodePayload(value: string): unknown {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
}

async function sign(value: string): Promise<string> {
  const secret =
    process.env.UNSEND_USAGE_SECRET ??
    process.env.OPENROUTER_API_KEY ??
    "dev-only-usage-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

async function deviceHash(deviceToken: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(deviceToken),
  );
  return bytesToBase64Url(new Uint8Array(digest)).slice(0, 32);
}

async function readUsage(
  req: NextRequest,
  deviceToken: string,
): Promise<UsageState> {
  const hash = await deviceHash(deviceToken);
  const empty: UsageState = { deviceHash: hash, freeReads: 0 };
  const raw = req.cookies.get(USAGE_COOKIE)?.value;
  if (!raw) return empty;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature || (await sign(payload)) !== signature) {
    return empty;
  }

  try {
    const parsed = decodePayload(payload) as {
      v?: unknown;
      d?: unknown;
      r?: unknown;
    };
    if (parsed.v !== 1 || parsed.d !== hash) return empty;
    return {
      deviceHash: hash,
      freeReads:
        typeof parsed.r === "number" && Number.isFinite(parsed.r)
          ? Math.max(0, Math.floor(parsed.r))
          : 0,
    };
  } catch {
    return empty;
  }
}

async function usageCookieValue(usage: UsageState): Promise<string> {
  const payload = encodePayload({
    v: 1,
    d: usage.deviceHash,
    r: usage.freeReads,
  });
  return `${payload}.${await sign(payload)}`;
}

async function jsonWithUsage(
  body: unknown,
  init: ResponseInit,
  usage?: UsageState,
) {
  const response = NextResponse.json(body, init);
  if (usage) {
    response.cookies.set(USAGE_COOKIE, await usageCookieValue(usage), {
      httpOnly: true,
      maxAge: USAGE_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}

async function readBoundedJson(req: NextRequest): Promise<
  | { ok: true; body: unknown }
  | { ok: false; status: 400 | 413 | 415; error: string }
> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, status: 415, error: "bad_request" };
  }

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return { ok: false, status: 413, error: "bad_request" };
  }

  const reader = req.body?.getReader();
  if (!reader) return { ok: false, status: 400, error: "bad_request" };

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return { ok: false, status: 413, error: "bad_request" };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      ok: true,
      body: JSON.parse(new TextDecoder().decode(bytes)),
    };
  } catch {
    return { ok: false, status: 400, error: "bad_request" };
  }
}

function canUseDevEntitlement(req: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (req.headers.get("x-unsent-dev-entitlement") !== "local") return false;
  const origin = req.headers.get("origin") ?? "";
  return (
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1")
  );
}

async function isRevenueCatEntitled(deviceToken: string): Promise<boolean> {
  if (!RC_KEY) return false;
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(deviceToken)}`,
      {
        cache: "no-store",
        headers: { Authorization: `Bearer ${RC_KEY}` },
      },
    );
    if (!res.ok) return false;
    const data = await res.json();
    const ent = data?.subscriber?.entitlements?.[ENTITLEMENT_ID] as
      | { expires_date?: string | null }
      | undefined;
    if (!ent) return false;
    if (!ent.expires_date) return true;
    const expires = Date.parse(ent.expires_date);
    return Number.isFinite(expires) && expires > Date.now();
  } catch {
    return false;
  }
}

/**
 * Strip fences, find the JSON object, validate shape. Null = malformed.
 * Only the requested parts are read; absent rewrite/tones stay undefined.
 */
function parseEngineJson(text: string, want: Want): EngineOut | null {
  const t = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(t.slice(start, end + 1));
    if (typeof o.mirror !== "string") return null;
    if (want.rewrite && typeof o.rewrite !== "string") return null;
    if (want.tones && (!o.tones || typeof o.tones !== "object")) return null;
    const out: EngineOut = { mirror: o.mirror.trim(), crisis: o.crisis === true };
    if (want.rewrite) out.rewrite = str(o.rewrite);
    if (want.tones) {
      out.tones = {
        warm: str(o.tones.warm),
        final: str(o.tones.final),
        unbothered: str(o.tones.unbothered),
      };
    }
    return out;
  } catch {
    return null;
  }
}

async function callOpenRouter(
  userPayload: string,
  maxTokens: number,
  responseFmt: ReturnType<typeof responseFormat>,
) {
  const models = modelList();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "x-title": "Unsend",
      },
      body: JSON.stringify({
        model: models[0],
        // OpenRouter falls back down this list; every candidate is still
        // constrained by the data-policy filter below.
        ...(models.length > 1 ? { models } : {}),
        // Plan §3.2: per-request belt-and-suspenders — only providers
        // that don't retain or train on prompts may serve this call.
        provider: { data_collection: "deny" },
        response_format: responseFmt,
        temperature: 0.4,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPayload },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`rewrite http=${res.status} ms=${Date.now() - started}`);
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? text : null;
  } catch {
    console.error(`rewrite timeout/network ms=${Date.now() - started}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const deviceToken = req.headers.get("x-device-token") ?? "";
  if (deviceToken.length < 8 || deviceToken.length > 64) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (rateLimited(deviceToken)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsedBody = await readBoundedJson(req);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.error },
      { status: parsedBody.status },
    );
  }
  const body = parsedBody.body as {
    draft?: unknown;
    recipient?: unknown;
    feeling?: unknown;
    goal?: unknown;
    context?: unknown;
    want?: unknown;
  };
  const { draft } = body;
  if (
    typeof draft !== "string" ||
    !draft.trim() ||
    draft.length > MAX_DRAFT_CHARS
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  // Recipient: a known label passes through; anything else (the custom
  // "Other") is accepted as bounded free text — collapsed whitespace,
  // capped at 40 chars. The prompt treats the whole message as data, so
  // a typed recipient can't smuggle instructions.
  const recipientRaw =
    typeof body.recipient === "string" ? body.recipient.trim() : "";
  const recipient = recipientRaw
    ? RECIPIENTS.has(recipientRaw)
      ? recipientRaw
      : recipientRaw.replace(/\s+/g, " ").slice(0, 40)
    : null;
  const feeling =
    typeof body.feeling === "string" && FEELINGS.has(body.feeling)
      ? body.feeling
      : null;
  // goal comes from our own fixed outcome list; bound it and pass as
  // context (the prompt treats the user message as data, not instructions).
  const goal =
    typeof body.goal === "string" && body.goal.trim() && body.goal.length <= 60
      ? body.goal.trim()
      : null;
  // context is the user's optional on-device recipient note (Pro). Bounded
  // free text; like everything else in the user message it's data, never an
  // instruction, and it's never logged here.
  const rawContext =
    typeof body.context === "string" && body.context.trim()
      ? body.context.trim().replace(/\s+/g, " ").slice(0, 120)
      : null;

  const usage = await readUsage(req, deviceToken);
  const isEntitled =
    canUseDevEntitlement(req) || (await isRevenueCatEntitled(deviceToken));
  const context = isEntitled ? rawContext : null;
  const want = resolveRewriteWant({
    requested: requestedWant(body.want),
    isEntitled,
    freeReads: usage.freeReads,
  });

  if (!process.env.OPENROUTER_API_KEY || modelList().length === 0) {
    return NextResponse.json({ error: "engine_unavailable" }, { status: 503 });
  }

  const userPayload = JSON.stringify({ draft, recipient, feeling, goal, context });
  // Budget scales with what's requested: mirror (~200 tok) + each
  // version ≤ draft length (chars/4 ≈ tokens, ×~2 headroom).
  const versions = 1 + (want.rewrite ? 1 : 0) + (want.tones ? 3 : 0);
  const maxTokens = Math.min(1800, 200 + versions * (Math.ceil(draft.length / 2) + 80));
  const responseFmt = responseFormat(want);

  // One attempt + one retry covers both transient failure and malformed
  // JSON (plan W0.3), then a graceful error the client renders in-brand.
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callOpenRouter(userPayload, maxTokens, responseFmt);
    if (raw === null) continue;
    const out = parseEngineJson(raw, want);
    if (out) {
      if (out.crisis) {
        return NextResponse.json({ mirror: "", crisis: true });
      }
      return jsonWithUsage(
        out,
        { status: 200 },
        { ...usage, freeReads: usage.freeReads + 1 },
      );
    }
  }
  return NextResponse.json({ error: "engine_unavailable" }, { status: 503 });
}
