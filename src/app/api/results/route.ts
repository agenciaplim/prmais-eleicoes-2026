import { NextResponse } from "next/server";
import { getCache } from "@/lib/cache";
import { mockResult } from "@/lib/tse/mock";
import { readLastKnownGood } from "@/lib/tse/last-known-good";
import { parsePublicResultQuery } from "@/lib/tse/public-results";

export async function GET(request: Request) {
  const query = parsePublicResultQuery(new URL(request.url).searchParams);
  if (!query.success) {
    return NextResponse.json(
      { error: "invalid results query", code: query.code },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const cache = await getCache();
  const snapshot = await readLastKnownGood(cache, query.identity);

  if (!snapshot && (process.env.NODE_ENV === "production" || !query.isDefault)) {
    return NextResponse.json(
      { error: "results unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(snapshot?.data ?? mockResult, {
    headers: {
      "Cache-Control": snapshot ? "public, max-age=5, stale-while-revalidate=30" : "no-store",
      ...(snapshot ? { "X-Result-Stored-At": snapshot.storedAt } : {})
    }
  });
}
