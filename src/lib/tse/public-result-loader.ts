import { getCache, type CacheStore } from "../cache";
import { readLastKnownGood, type ElectionResultIdentity } from "./last-known-good";
import { mockResult } from "./mock";
import type { ElectionResult } from "./types";

export type LoadedPublicResult =
  | { source: "cache"; data: ElectionResult; storedAt: string }
  | { source: "mock"; data: ElectionResult }
  | { source: "unavailable" };

type LoaderOptions = {
  cache?: CacheStore;
  production?: boolean;
};

// Shared by the public API and server-rendered pages: reads only our cache, never the TSE.
export async function loadPublicResult(
  identity: ElectionResultIdentity,
  isDefault: boolean,
  options: LoaderOptions = {}
): Promise<LoadedPublicResult> {
  const cache = options.cache ?? (await getCache());
  const production = options.production ?? process.env.NODE_ENV === "production";
  const snapshot = await readLastKnownGood(cache, identity);

  if (snapshot) return { source: "cache", data: snapshot.data, storedAt: snapshot.storedAt };
  if (!production && isDefault) return { source: "mock", data: mockResult };
  return { source: "unavailable" };
}
