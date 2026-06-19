import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

type CounterEvent = "burned" | "kept";
type CounterCategory = "ex" | "boss" | "family" | "friend" | "other";

const EVENTS = new Set<CounterEvent>(["burned", "kept"]);
const CATEGORIES = new Set<CounterCategory>([
  "ex",
  "boss",
  "family",
  "friend",
  "other",
]);

// Per-isolate aggregate scaffold. Replace with an append-only aggregate
// store before production; never add draft text or per-user identifiers here.
const totals = new Map<string, number>();

function key(event: CounterEvent, category: CounterCategory) {
  return `${event}:${category}`;
}

export async function POST(req: NextRequest) {
  let body: { event?: unknown; category?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (
    typeof body.event !== "string" ||
    typeof body.category !== "string" ||
    !EVENTS.has(body.event as CounterEvent) ||
    !CATEGORIES.has(body.category as CounterCategory)
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const event = body.event as CounterEvent;
  const category = body.category as CounterCategory;
  const aggregateKey = key(event, category);
  totals.set(aggregateKey, (totals.get(aggregateKey) ?? 0) + 1);

  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  const byCategory: Record<CounterCategory, Record<CounterEvent, number>> = {
    ex: { burned: 0, kept: 0 },
    boss: { burned: 0, kept: 0 },
    family: { burned: 0, kept: 0 },
    friend: { burned: 0, kept: 0 },
    other: { burned: 0, kept: 0 },
  };

  for (const category of CATEGORIES) {
    for (const event of EVENTS) {
      byCategory[category][event] = totals.get(key(event, category)) ?? 0;
    }
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    byCategory,
    monument: Object.entries(byCategory).map(([category, counts]) => ({
      category,
      unsent: counts.burned + counts.kept,
      burned: counts.burned,
      kept: counts.kept,
    })),
  });
}
