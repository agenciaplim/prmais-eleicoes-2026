import { NextResponse } from "next/server";

// Public routes answer 503 when the cache is unreachable or misconfigured, never a raw 500.
// Only the error name is logged, so no connection string or token can leak.
export function cacheUnavailable(route: string, error: unknown) {
  console.error("cache unavailable", { route, error: error instanceof Error ? error.name : "unknown" });
  return NextResponse.json({ error: "results unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
