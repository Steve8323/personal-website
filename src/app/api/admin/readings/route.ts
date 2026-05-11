import {
  getReadings,
  isStoreConfigured,
  sanitizeReading,
  saveReadings,
  type Reading,
} from "@/lib/readings-store";

export async function GET() {
  const readings = await getReadings();
  return Response.json({
    readings,
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

  const incoming =
    body && typeof body === "object" && "readings" in body
      ? (body as { readings: unknown }).readings
      : null;

  if (!Array.isArray(incoming)) {
    return Response.json(
      { error: "Body must be { readings: Reading[] }" },
      { status: 400 },
    );
  }
  if (incoming.length > 200) {
    return Response.json(
      { error: "Too many entries (max 200)" },
      { status: 400 },
    );
  }

  const cleaned: Reading[] = [];
  for (let i = 0; i < incoming.length; i++) {
    const r = sanitizeReading(incoming[i]);
    if (!r) {
      return Response.json(
        { error: `Entry ${i + 1} is missing required fields.` },
        { status: 400 },
      );
    }
    cleaned.push(r);
  }

  try {
    await saveReadings(cleaned);
  } catch (err) {
    console.error("Failed to save readings:", err);
    return Response.json({ error: "Could not save." }, { status: 500 });
  }

  return Response.json({ ok: true, count: cleaned.length });
}
