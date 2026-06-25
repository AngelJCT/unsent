/**
 * Client side of the engine call (plan W1.4). The draft lives in React
 * state and this one request — never in storage, never in logs.
 */
import { getDeviceToken, getEntitlement } from "@/lib/local-state";

export type EngineTones = { warm: string; final: string; unbothered: string };
// Parts are optional: the server only returns what the caller is entitled
// to (generate-on-pay). The mirror and crisis flag always come back.
export type EngineResult = {
  mirror: string;
  crisis: boolean;
  rewrite?: string;
  tones?: EngineTones;
};
export type EngineWant = { rewrite: boolean; tones: boolean };
export type EngineError =
  | "rate_limited"
  | "engine_unavailable"
  | "bad_request"
  | "network";

export async function requestRewrite(input: {
  draft: string;
  recipient?: string | null;
  feeling?: string | null;
  goal?: string | null;
  // Optional on-device recipient note (Pro). Bounded + treated as data
  // server-side; the proxy never logs it. See recipient-memory.ts.
  context?: string | null;
  want?: EngineWant;
}): Promise<
  { ok: true; result: EngineResult } | { ok: false; error: EngineError }
> {
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-device-token": getDeviceToken(),
    };
    if (
      ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
      getEntitlement().active
    ) {
      headers["x-unsent-dev-entitlement"] = "local";
    }
    const res = await fetch("/api/rewrite", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const error = body?.error;
      return {
        ok: false,
        error:
          error === "rate_limited" || error === "bad_request"
            ? error
            : "engine_unavailable",
      };
    }
    return { ok: true, result: (await res.json()) as EngineResult };
  } catch {
    return { ok: false, error: "network" };
  }
}
