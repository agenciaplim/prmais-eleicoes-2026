import { NextResponse } from "next/server";
import { getCache } from "@/lib/cache";
import { readLocationCatalog } from "@/lib/tse/location-catalog";
import { parsePublicLocationQuery, publicLocationPayload } from "@/lib/tse/public-locations";

export async function GET(request: Request) {
  const query = parsePublicLocationQuery(new URL(request.url).searchParams);
  if (!query.success) {
    return NextResponse.json(
      { error: "invalid locations query", code: query.code },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const snapshot = await readLocationCatalog(await getCache());
  if (!snapshot) {
    return NextResponse.json(
      { error: "locations unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const payload = publicLocationPayload(snapshot.data, query.state);
  if (!payload) {
    return NextResponse.json(
      { error: "state not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Catalog-Stored-At": snapshot.storedAt
    }
  });
}
