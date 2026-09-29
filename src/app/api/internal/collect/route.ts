import { NextResponse } from "next/server";
import { CollectorAuthConfigError, collectorSecretFromEnv, isCollectorAuthorized } from "@/lib/security/collector-auth";
import { collectElectionResultsFromEnv, TseCollectorError } from "@/lib/tse/collector";
import { TseFetchError } from "@/lib/tse/client";
import { TsePayloadError } from "@/lib/tse/parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Aggregates + photos + two municipal batches (TSE_MUNICIPAL_BUDGET_MS each) must fit here.
export const maxDuration = 60;

function safeErrorCode(error: unknown): string {
  if (error instanceof TseCollectorError) return `collector:${error.code}`;
  if (error instanceof TseFetchError) return `fetch:${error.code}`;
  if (error instanceof TsePayloadError) return `payload:${error.code}`;
  return "collector:UNEXPECTED";
}

async function runCollector(request: Request) {
  let secret: string;
  try {
    secret = collectorSecretFromEnv();
  } catch (error) {
    if (error instanceof CollectorAuthConfigError) {
      return NextResponse.json({ error: "collector unavailable" }, { status: 503 });
    }
    throw error;
  }

  if (!isCollectorAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Bearer" } }
    );
  }

  try {
    const report = await collectElectionResultsFromEnv();
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = safeErrorCode(error);
    console.error("TSE collector failed", { code });
    return NextResponse.json({ error: "collection failed", code }, { status: 502 });
  }
}

export const GET = runCollector;
export const POST = runCollector;
