import {
  getState,
  isStoreConfigured,
  sanitizeCategoryOrder,
  sanitizeReading,
  saveState,
  type Reading,
} from "@/lib/readings-store";

export async function GET() {
  const state = await getState();
  return Response.json({
    readings: state.readings,
    categoryOrder: state.categoryOrder,
    storeConfigured: isStoreConfigured(),
  });
}

export async function PUT(request: Request) {
  if (!isStoreConfigured()) {
    return Response.json(
      {
        error:
          "Storage is not configured. Add KV_REST_API_URL and KV_REST_API_TOKEN env vars.",
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { readings: incoming, categoryOrder: incomingOrder } = body as Record<
    string,
    unknown
  >;

  if (!Array.isArray(incoming)) {
    return Response.json(
      { error: "Body must include readings: Reading[]" },
      { status: 400 },
    );
  }
  if (incoming.length > 500) {
    return Response.json(
      { error: "Too many entries (max 500)" },
      { status: 400 },
    );
  }

  const cleaned: Reading[] = [];
  for (let i = 0; i < incoming.length; i++) {
    const r = sanitizeReading(incoming[i]);
    if (!r) {
      return Response.json(
        { error: `Entry ${i + 1} is empty or invalid.` },
        { status: 400 },
      );
    }
    cleaned.push(r);
  }

  const order = sanitizeCategoryOrder(incomingOrder);
  if (order === null) {
    return Response.json(
      { error: "Body must include categoryOrder: string[]" },
      { status: 400 },
    );
  }

  try {
    await saveState({ readings: cleaned, categoryOrder: order });
  } catch (err) {
    console.error("Failed to save readings:", err);
    return Response.json({ error: "Could not save." }, { status: 500 });
  }

  return Response.json({ ok: true, count: cleaned.length });
}
