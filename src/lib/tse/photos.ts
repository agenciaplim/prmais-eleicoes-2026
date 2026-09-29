import { z } from "zod";
import type { CacheStore } from "../cache";
import type { TseClient, TsePhotoRequest } from "./client";

const PREFIX = "photos:v1";
const INDEX_KEY = `${PREFIX}:index`;
const MAX_BASE64 = Math.ceil((300 * 1024) / 3) * 4;

const photoSchema = z.object({
  version: z.literal(1),
  storedAt: z.string().datetime({ offset: true }),
  data: z.string().min(4).max(MAX_BASE64).regex(/^[A-Za-z0-9+/]+={0,2}$/)
});
const indexSchema = z.object({ version: z.literal(1), ids: z.array(z.string().regex(/^\d{9,15}$/)) });

export const isCandidateId = (id: string) => /^\d{9,15}$/.test(id);
const photoKey = (id: string) => `${PREFIX}:${id}`;

export async function readPhoto(cache: CacheStore, id: string): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!isCandidateId(id)) return null;
  const parsed = photoSchema.safeParse(await cache.get<unknown>(photoKey(id)));
  return parsed.success ? new Uint8Array(Buffer.from(parsed.data.data, "base64")) : null;
}

export type PhotoTarget = Omit<TsePhotoRequest, "candidateId"> & { candidateIds: string[] };
export type PhotoReport = { fetched: number; failed: number; pending: number };

// Photos don't change during the election: each one is fetched once, validated by the client
// (JPEG content type + signature + size limit) and stored without TTL.
export async function collectPhotos(options: {
  client: TseClient;
  cache: CacheStore;
  targets: PhotoTarget[];
  limit?: number;
  now?: () => Date;
}): Promise<PhotoReport> {
  const now = options.now ?? (() => new Date());
  const index = indexSchema.safeParse(await options.cache.get<unknown>(INDEX_KEY));
  const stored = new Set(index.success ? index.data.ids : []);
  const queue = options.targets.flatMap(({ candidateIds, ...request }) =>
    [...new Set(candidateIds)].filter((id) => isCandidateId(id) && !stored.has(id)).map((candidateId) => ({ ...request, candidateId }))
  );
  const batch = queue.slice(0, options.limit ?? 20);
  let fetched = 0;
  let failed = 0;

  for (const request of batch) {
    try {
      const bytes = await options.client.fetchPhoto(request);
      await options.cache.set(photoKey(request.candidateId), {
        version: 1,
        storedAt: now().toISOString(),
        data: Buffer.from(bytes).toString("base64")
      });
      stored.add(request.candidateId);
      fetched++;
    } catch {
      failed++;
    }
  }

  if (fetched > 0) await options.cache.set(INDEX_KEY, { version: 1, ids: [...stored] });
  return { fetched, failed, pending: queue.length - batch.length };
}
