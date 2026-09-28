import { NextResponse } from "next/server";
import { getCache } from "@/lib/cache";
import { mockResult } from "@/lib/tse/mock";
import { readLastKnownGood } from "@/lib/tse/last-known-good";

export async function GET() {
  const cache = await getCache();
  const snapshot = await readLastKnownGood(cache, {
    scope: "BR",
    scopeType: "country",
    office: "president"
  });

  if (!snapshot && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "results unavailable" }, { status: 503 });
  }

  return NextResponse.json(snapshot?.data ?? mockResult, {
    headers: {
      "Cache-Control": snapshot ? "public, max-age=5, stale-while-revalidate=30" : "no-store",
      ...(snapshot ? { "X-Result-Stored-At": snapshot.storedAt } : {})
    }
  });
}
