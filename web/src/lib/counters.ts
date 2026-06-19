import type { CategoryId } from "@/lib/tokens";

export type CounterEvent = "burned" | "kept";

export function sendCounterTick(event: CounterEvent, category: CategoryId | null) {
  const body = JSON.stringify({
    event,
    category: category ?? "other",
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/counters", blob);
      return;
    }
  } catch {
    // The local decision is already recorded. Network counters are best effort.
  }

  fetch("/api/counters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Content-free aggregate failure must never block the ritual.
  });
}
