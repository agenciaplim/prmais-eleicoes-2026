import { NextResponse } from "next/server";
import { getCache } from "@/lib/cache";
import { mockResult } from "@/lib/tse/mock";
import type { ElectionResult } from "@/lib/tse/types";

export async function GET() {
  const cache = await getCache();
  const cached = await cache.get<ElectionResult>("results:president:br");

  return NextResponse.json(cached ?? mockResult, {
    headers: {
      "Cache-Control": "public, max-age=5, stale-while-revalidate=30"
    }
  });
}
