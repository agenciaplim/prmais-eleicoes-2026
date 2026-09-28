import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createTseClient, TseFetchError, type TseClientConfig } from "../src/lib/tse/client";

const simulationConfig: TseClientConfig = {
  baseUrl: "https://resultados-sim.tse.jus.br/simulado",
  environment: "simulado2026",
  timeoutMs: 1_000,
  maxPayloadBytes: 1_000_000
};

async function fixture(name: string): Promise<string> {
  const url = new URL(`./fixtures/tse/${name}`, import.meta.url);
  return readFile(fileURLToPath(url), "utf8");
}

function jsonResponse(body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, { headers: { "content-type": "application/json", ...headers } });
}

test("builds only documented TSE file URLs", () => {
  const client = createTseClient(simulationConfig);

  assert.equal(
    client.buildUrl({ kind: "EA11" }).href,
    "https://resultados-sim.tse.jus.br/simulado/simulado2026/comum/config/ele-c.json"
  );
  assert.equal(
    client.buildUrl({ kind: "EA12", cycle: "ele2026", electionId: "21270" }).href,
    "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/config/mun-e021270-cm.json"
  );
  assert.equal(
    client.buildUrl({ kind: "EA14", cycle: "ele2026", electionId: "21270" }).href,
    "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-e021270-ab.json"
  );
  assert.equal(
    client.buildUrl({ kind: "EA15", cycle: "ele2026", electionId: "21272", uf: "PR" }).href,
    "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/pr/pr-e021272-ab.json"
  );
  assert.equal(
    client.buildUrl({
      kind: "EA20",
      cycle: "ele2026",
      electionId: "21272",
      officeCode: "5",
      scope: { type: "municipality", uf: "PR", municipalityCode: "75353" }
    }).href,
    "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/pr/pr75353-c0005-e021272-u.json"
  );
});

test("rejects non-allowlisted origins and mismatched environments", () => {
  assert.throws(
    () => createTseClient({ ...simulationConfig, baseUrl: "https://example.com" }),
    (error: unknown) => error instanceof TseFetchError && error.code === "INVALID_CONFIG"
  );
  assert.throws(
    () => createTseClient({ ...simulationConfig, environment: "oficial" }),
    (error: unknown) => error instanceof TseFetchError && error.code === "INVALID_CONFIG"
  );
});

test("rejects path tokens before making a request", () => {
  const client = createTseClient(simulationConfig);
  assert.throws(
    () => client.buildUrl({ kind: "EA15", cycle: "../ele2026", electionId: "21272", uf: "PR" }),
    (error: unknown) => error instanceof TseFetchError && error.code === "INVALID_REQUEST"
  );
});

test("fetches, bounds, parses, and checks a TSE payload", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const client = createTseClient(simulationConfig, async (input, init) => {
    calls.push({ url: input.toString(), init });
    return jsonResponse(await fixture("ea20-president-br.json"));
  });

  const payload = await client.fetchPayload({
    kind: "EA20",
    cycle: "ele2026",
    electionId: "21270",
    officeCode: "1",
    scope: { type: "country" }
  });

  assert.equal(payload.carg?.[0]?.cd, "1");
  assert.equal(calls[0]?.url.endsWith("/br-c0001-e021270-u.json"), true);
  assert.equal(calls[0]?.init?.redirect, "error");
  assert.equal(calls[0]?.init?.cache, "no-store");
});

test("rejects an oversized response from content-length", async () => {
  const client = createTseClient(
    { ...simulationConfig, maxPayloadBytes: 100 },
    async () => jsonResponse("{}", { "content-length": "101" })
  );

  await assert.rejects(
    () => client.fetchPayload({ kind: "EA11" }),
    (error: unknown) => error instanceof TseFetchError && error.code === "PAYLOAD_TOO_LARGE"
  );
});

test("rejects an oversized streamed response without content-length", async () => {
  const client = createTseClient(
    { ...simulationConfig, maxPayloadBytes: 100 },
    async () => jsonResponse("x".repeat(101))
  );

  await assert.rejects(
    () => client.fetchPayload({ kind: "EA11" }),
    (error: unknown) => error instanceof TseFetchError && error.code === "PAYLOAD_TOO_LARGE"
  );
});

test("rejects unexpected content types before reading the body", async () => {
  const client = createTseClient(simulationConfig, async () =>
    new Response("not json", { headers: { "content-type": "text/html" } })
  );

  await assert.rejects(
    () => client.fetchPayload({ kind: "EA11" }),
    (error: unknown) => error instanceof TseFetchError && error.code === "INVALID_CONTENT_TYPE"
  );
});

test("rejects a valid payload that does not match the requested office", async () => {
  const client = createTseClient(simulationConfig, async () =>
    jsonResponse(await fixture("ea20-president-br.json"))
  );

  await assert.rejects(
    () =>
      client.fetchPayload({
        kind: "EA20",
        cycle: "ele2026",
        electionId: "21270",
        officeCode: "3",
        scope: { type: "country" }
      }),
    (error: unknown) => error instanceof TseFetchError && error.code === "REQUEST_MISMATCH"
  );
});

test("aborts requests after the configured timeout", async () => {
  const client = createTseClient(
    { ...simulationConfig, timeoutMs: 10 },
    async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      })
  );

  await assert.rejects(
    () => client.fetchPayload({ kind: "EA11" }),
    (error: unknown) => error instanceof TseFetchError && error.code === "TIMEOUT"
  );
});

test("keeps the timeout active while streaming the response", async () => {
  const client = createTseClient(
    { ...simulationConfig, timeoutMs: 10 },
    async (_input, init) => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener("abort", () => controller.error(init.signal?.reason), { once: true });
        }
      });
      return new Response(stream, { headers: { "content-type": "application/json" } });
    }
  );

  await assert.rejects(
    () => client.fetchPayload({ kind: "EA11" }),
    (error: unknown) => error instanceof TseFetchError && error.code === "TIMEOUT"
  );
});
