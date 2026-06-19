const TOKEN_KEY = "unsent.device-token:v1";
const LEGACY_TOKEN_KEY = "unsent.device-token";
const READ_COUNT_KEY = "unsent.read-count:v1";
const DECISION_COUNTS_KEY = "unsent.decisions:v1";
const FUNNEL_COUNTS_KEY = "unsent.funnel:v1";
const ENTITLEMENT_KEY = "unsent.entitlement:v1";

export type DecisionKind = "calmer" | "nothing" | "original" | "burned" | "kept";
export type FunnelEvent =
  | "sample_started"
  | "mirror_completed"
  | "crisis_path"
  | "cooldown_started"
  | "cooldown_returned"
  | "burn_started"
  | "paywall_shown"
  | "purchase_started"
  | "purchase_unlocked"
  | "purchase_restored"
  | "vault_kept"
  | "vault_viewed"
  | "receipt_opened"
  | "receipt_shared"
  | "receipt_saved";
export type EntitlementPlan = "tonight" | "monthly" | "yearly";
export type EntitlementSource =
  | "local_phase2"
  | "checkout"
  | "restored_local"
  | "revenuecat"
  | null;
export type EntitlementState = {
  active: boolean;
  plan: EntitlementPlan | null;
  expiresAt: string | null;
  source: EntitlementSource;
};

export type DecisionCounts = {
  calmer: number;
  nothing: number;
  original: number;
  burned: number;
  kept: number;
};

const emptyCounts: DecisionCounts = {
  calmer: 0,
  nothing: 0,
  original: 0,
  burned: 0,
  kept: 0,
};

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing and disabled storage still allow the core flow.
  }
}

/** Anonymous, generated client-side, never tied to identity or content. */
export function getDeviceToken(): string {
  const existing = readStorage(TOKEN_KEY) ?? readStorage(LEGACY_TOKEN_KEY);
  if (existing) {
    writeStorage(TOKEN_KEY, existing);
    return existing;
  }

  const token = crypto.randomUUID();
  writeStorage(TOKEN_KEY, token);
  return token;
}

export function incrementReadCount(): number {
  const next = Number(readStorage(READ_COUNT_KEY) ?? "0") + 1;
  writeStorage(READ_COUNT_KEY, String(next));
  return next;
}

export function getReadCount(): number {
  return Number(readStorage(READ_COUNT_KEY) ?? "0");
}

export function getDecisionCounts(): DecisionCounts {
  const raw = readStorage(DECISION_COUNTS_KEY);
  if (!raw) return emptyCounts;
  try {
    const parsed = JSON.parse(raw) as Partial<DecisionCounts>;
    return {
      calmer: Number(parsed.calmer ?? 0),
      nothing: Number(parsed.nothing ?? 0),
      original: Number(parsed.original ?? 0),
      burned: Number(parsed.burned ?? 0),
      kept: Number(parsed.kept ?? 0),
    };
  } catch {
    return emptyCounts;
  }
}

export function recordDecision(kind: DecisionKind): DecisionCounts {
  const counts = getDecisionCounts();
  const next = { ...counts, [kind]: counts[kind] + 1 };
  writeStorage(DECISION_COUNTS_KEY, JSON.stringify(next));
  return next;
}

export function recordFunnelEvent(event: FunnelEvent) {
  const raw = readStorage(FUNNEL_COUNTS_KEY);
  let counts: Partial<Record<FunnelEvent, number>> = {};
  if (raw) {
    try {
      counts = JSON.parse(raw) as Partial<Record<FunnelEvent, number>>;
    } catch {
      counts = {};
    }
  }
  counts[event] = (counts[event] ?? 0) + 1;
  writeStorage(FUNNEL_COUNTS_KEY, JSON.stringify(counts));
}

function planDurationMs(plan: EntitlementPlan): number {
  if (plan === "tonight") return 24 * 60 * 60 * 1000;
  if (plan === "monthly") return 31 * 24 * 60 * 60 * 1000;
  return 366 * 24 * 60 * 60 * 1000;
}

function emptyEntitlement(): EntitlementState {
  return {
    active: false,
    plan: null,
    expiresAt: null,
    source: null,
  };
}

export function getEntitlement(): EntitlementState {
  const raw = readStorage(ENTITLEMENT_KEY);
  if (!raw) return emptyEntitlement();
  try {
    const parsed = JSON.parse(raw) as Partial<EntitlementState>;
    const plan =
      parsed.plan === "tonight" ||
      parsed.plan === "monthly" ||
      parsed.plan === "yearly"
        ? parsed.plan
        : null;
    const expiresAt =
      typeof parsed.expiresAt === "string" ? parsed.expiresAt : null;
    const active =
      plan !== null && expiresAt !== null && Date.parse(expiresAt) > Date.now();
    if (!active) return emptyEntitlement();
    return {
      active,
      plan,
      expiresAt,
      source:
        parsed.source === "checkout" ||
        parsed.source === "restored_local" ||
        parsed.source === "revenuecat" ||
        parsed.source === "local_phase2"
          ? parsed.source
          : "local_phase2",
    };
  } catch {
    return emptyEntitlement();
  }
}

/** Empty (no entitlement) state. */
export function noEntitlement(): EntitlementState {
  return emptyEntitlement();
}

/**
 * Overwrite the cached entitlement (e.g. with a result derived from
 * RevenueCat). getEntitlement() reads this cache synchronously so the
 * UI stays sync; the remote source of truth refreshes it on load.
 */
export function writeEntitlementCache(state: EntitlementState) {
  writeStorage(ENTITLEMENT_KEY, JSON.stringify(state));
}

export function activateLocalEntitlement(
  plan: EntitlementPlan,
  source: EntitlementState["source"] = "local_phase2",
): EntitlementState {
  const entitlement: EntitlementState = {
    active: true,
    plan,
    expiresAt: new Date(Date.now() + planDurationMs(plan)).toISOString(),
    source,
  };
  writeStorage(ENTITLEMENT_KEY, JSON.stringify(entitlement));
  return entitlement;
}

/**
 * Dev only — wipes all unsent.* localStorage (token, read-count,
 * decisions, funnel, entitlement) so the next load behaves like a true
 * first-timer. The Vault (IndexedDB) is cleared separately.
 */
export function resetAllLocalData() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("unsent.")) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // nothing to do — storage unavailable
  }
}
