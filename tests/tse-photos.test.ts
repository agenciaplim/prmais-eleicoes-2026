import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryCache } from "../src/lib/cache/memory";
import { createTseClient, TseFetchError, type TseClient, type TsePhotoRequest } from "../src/lib/tse/client";
import { collectPhotos, readPhoto } from "../src/lib/tse/photos";

const config = { baseUrl: "https://resultados-sim.tse.jus.br/simulado", environment: "simulado2026", timeoutMs: 1_000, jwsMode: "disabled" as const };
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const request: TsePhotoRequest = { cycle: "ele2026", electionId: "21270", scope: "br", candidateId: "10000000001" };

test("builds the photo URL only from validated parts", () => {
  const client = createTseClient(config);
  assert.equal(
    client.buildPhotoUrl(request).href,
    "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/fotos/br/10000000001.jpeg"
  );
  assert.equal(client.buildPhotoUrl({ ...request, candidateId: "41592406" }).pathname.endsWith("/fotos/br/41592406.jpeg"), true);
  assert.throws(() => client.buildPhotoUrl({ ...request, candidateId: "../x" }), TseFetchError);
  assert.throws(() => client.buildPhotoUrl({ ...request, scope: "p/r" }), TseFetchError);
});

test("accepts only JPEG photos within the size limit", async () => {
  const respond = (body: Uint8Array<ArrayBuffer>, type = "image/jpeg") => createTseClient(config, async () => new Response(body, { headers: { "content-type": type } }));
  assert.deepEqual(await respond(jpeg).fetchPhoto(request), jpeg);
  await assert.rejects(() => respond(jpeg, "text/html").fetchPhoto(request), (e: unknown) => e instanceof TseFetchError && e.code === "INVALID_CONTENT_TYPE");
  await assert.rejects(() => respond(new Uint8Array([0x3c, 0x68, 0x74])).fetchPhoto(request), (e: unknown) => e instanceof TseFetchError && e.code === "INVALID_CONTENT_TYPE");
  await assert.rejects(() => respond(new Uint8Array(400 * 1024).fill(0xff)).fetchPhoto(request), (e: unknown) => e instanceof TseFetchError && e.code === "PAYLOAD_TOO_LARGE");
});

test("fetches each photo once and respects the per-run limit", async () => {
  const cache = createMemoryCache();
  const fetched: string[] = [];
  const client = {
    async fetchPhoto(req: TsePhotoRequest) {
      fetched.push(req.candidateId);
      if (req.candidateId === "10000000003") throw new Error("404");
      return jpeg;
    }
  } as unknown as TseClient;
  const targets = [{ cycle: "ele2026", electionId: "21270", scope: "br", candidateIds: ["10000000001", "10000000002", "10000000003", "bad"] }];

  assert.deepEqual(await collectPhotos({ client, cache, targets, limit: 2 }), { fetched: 2, failed: 0, pending: 1 });
  assert.deepEqual(await readPhoto(cache, "10000000001"), jpeg);
  assert.deepEqual(await collectPhotos({ client, cache, targets }), { fetched: 0, failed: 1, pending: 0 });
  assert.deepEqual(fetched, ["10000000001", "10000000002", "10000000003"]);
  assert.equal(await readPhoto(cache, "../etc"), null);
});
