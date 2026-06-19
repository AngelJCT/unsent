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

export const runtime = "edge";

const MAX_DRAFT_CHARS = 4000;
const ATTEMPT_TIMEOUT_MS = 6000;
const TOKEN_LIMIT_PER_HOUR = 10;

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
type Want = { rewrite: boolean; tones: boolean };
type EngineOut = {
  mirror: string;
  crisis: boolean;
  rewrite?: string;
  tones?: EngineTones;
};

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
        "x-title": "Unsent",
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

  let body: {
    draft?: unknown;
    recipient?: unknown;
    feeling?: unknown;
    goal?: unknown;
    want?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
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

  // What the caller may receive. Defaults to the full set so a plain
  // request still behaves; the client narrows it per entitlement tier.
  const wantRaw = (body.want ?? {}) as { rewrite?: unknown; tones?: unknown };
  const want: Want = {
    rewrite: wantRaw.rewrite !== false,
    tones: wantRaw.tones !== false,
  };

  if (!process.env.OPENROUTER_API_KEY || modelList().length === 0) {
    return NextResponse.json({ error: "engine_unavailable" }, { status: 503 });
  }

  const userPayload = JSON.stringify({ draft, recipient, feeling, goal });
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
      return NextResponse.json(out);
    }
  }
  return NextResponse.json({ error: "engine_unavailable" }, { status: 503 });
}
