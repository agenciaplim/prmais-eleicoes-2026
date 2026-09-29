import { NextResponse } from "next/server";
import { getCache } from "@/lib/cache";
import { readMunicipalSummary } from "@/lib/tse/municipal-results";
import { municipalEntry, municipalOverview, parsePublicMunicipalQuery } from "@/lib/tse/public-municipal";

const UF = "pr";
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const query = parsePublicMunicipalQuery(new URL(request.url).searchParams);
  if (!query.success) {
    return NextResponse.json({ error: "invalid municipalities query", code: query.code }, { status: 400, headers: noStore });
  }

  const summary = await readMunicipalSummary(await getCache(), query.office, UF);
  if (!summary) return NextResponse.json({ error: "results unavailable" }, { status: 503, headers: noStore });

  const body = query.code ? municipalEntry(summary, query.code) : { office: query.office, items: municipalOverview(summary) };
  if (!body) return NextResponse.json({ error: "municipality not found" }, { status: 404, headers: noStore });

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
      "X-Result-Stored-At": summary.storedAt
    }
  });
}
