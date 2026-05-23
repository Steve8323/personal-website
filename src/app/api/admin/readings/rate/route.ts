import {
  getState,
  isStoreConfigured,
  saveState,
  TIERS,
  type Tier,
} from "@/lib/readings-store";

export async function POST(request: Request) {
  if (!isStoreConfigured()) {
    return Response.json(
      { error: "Storage is not configured." },
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

  const { id, tier, tierRank } = body as Record<string, unknown>;
  if (typeof id !== "string" || !id) {
    return Response.json({ error: "Missing id." }, { status: 400 });
  }
  if (tier !== null && tier !== undefined) {
    if (typeof tier !== "string" || !(TIERS as readonly string[]).includes(tier)) {
      return Response.json({ error: "Invalid tier." }, { status: 400 });
    }
  }
  if (tierRank !== null && tierRank !== undefined) {
    if (typeof tierRank !== "number" || !Number.isFinite(tierRank)) {
      return Response.json({ error: "Invalid tierRank." }, { status: 400 });
    }
  }

  const state = await getState();
  const idx = state.readings.findIndex((r) => r.id === id);
  if (idx < 0) {
    return Response.json({ error: "Reading not found." }, { status: 404 });
  }

  const target = state.readings[idx];
  const next = { ...target };
  if (tier === null) {
    delete next.tier;
    delete next.tierRank;
  } else {
    next.tier = tier as Tier;
    if (typeof tierRank === "number") next.tierRank = tierRank;
  }

  const readings = state.readings.slice();
  readings[idx] = next;

  try {
    await saveState({ readings, categoryOrder: state.categoryOrder });
  } catch (err) {
    console.error("Failed to save rating:", err);
    return Response.json({ error: "Could not save." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
