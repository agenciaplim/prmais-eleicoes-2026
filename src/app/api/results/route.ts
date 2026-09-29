import { NextResponse } from "next/server";
import { cacheUnavailable } from "@/lib/cache/unavailable";
import { loadPublicResult } from "@/lib/tse/public-result-loader";
import { parsePublicResultQuery } from "@/lib/tse/public-results";

export async function GET(request: Request) {
  const query = parsePublicResultQuery(new URL(request.url).searchParams);
  if (!query.success) {
    return NextResponse.json(
      { error: "invalid results query", code: query.code },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  let result: Awaited<ReturnType<typeof loadPublicResult>>;
  try {
    result = await loadPublicResult(query.identity, query.isDefault);
  } catch (error) {
    return cacheUnavailable("results", error);
  }

  if (result.source === "unavailable") {
    return NextResponse.json(
      { error: "results unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(result.data, {
    headers: {
      "Cache-Control": result.source === "cache" ? "public, max-age=5, stale-while-revalidate=30" : "no-store",
      ...(result.source === "cache" ? { "X-Result-Stored-At": result.storedAt } : {})
    }
  });
}
