/**
 * One-shot verification against the official TSE simulation, using an in-memory cache.
 * Nothing is written anywhere; it prints what the collector would promote.
 *
 *   pnpm check:simulado
 *
 * Defaults target the 2026 simulation; override with the usual TSE_* variables.
 */
import { createMemoryCache } from "../src/lib/cache/memory";
import { createTseClient, tseClientConfigFromEnv } from "../src/lib/tse/client";
import { collectElectionResults, collectorConfigFromEnv } from "../src/lib/tse/collector";
import { readLastKnownGood } from "../src/lib/tse/last-known-good";
import { readMunicipalSummary } from "../src/lib/tse/municipal-results";
import { readPhoto } from "../src/lib/tse/photos";
import { readUpdates } from "../src/lib/tse/updates";

process.env.TSE_ENV ??= "remote";
process.env.TSE_BASE_URL ??= "https://resultados-sim.tse.jus.br/simulado";
process.env.TSE_RESULTS_ENV ??= "simulado2026";
process.env.TSE_UF ??= "PR";
process.env.TSE_ROUND ??= "1";
process.env.TSE_MUNICIPAL_BUDGET_MS ??= "45000";

async function main() {
  const cache = createMemoryCache();
  const client = createTseClient(tseClientConfigFromEnv());
  const started = Date.now();
  const report = await collectElectionResults({ client, cache, config: collectorConfigFromEnv() });

  console.log(`\nColeta concluída em ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log("Descoberta:", report.discovery);
  console.log("Catálogo:", report.catalog);
  console.table(report.items);
  console.log("Municípios:", report.municipal);
  console.log("Fotos:", report.photos);

  const federal = await readLastKnownGood(cache, { scope: "PR", scopeType: "state", office: "federal-deputy" });
  const groups = federal?.data.groups ?? [];
  const groupVotes = groups.reduce((sum, group) => sum + group.votes, 0);
  console.log(`\nDeputado Federal: ${groups.length} agremiações; soma = ${groupVotes}; votos válidos = ${federal?.data.votes.valid}`);
  console.table(groups.slice(0, 5).map(({ acronym, type, votes, percentage, seats }) => ({ acronym, type, votes, percentage: percentage.toFixed(2), seats })));

  const president = await readMunicipalSummary(cache, "president", "pr");
  const curitiba = president?.entries["75353"];
  console.log(`\nPresidente por município: ${Object.keys(president?.entries ?? {}).length} municípios; Curitiba:`, curitiba?.candidates.slice(0, 3));

  const presidentBr = await readLastKnownGood(cache, { scope: "BR", scopeType: "country", office: "president" });
  const firstId = presidentBr?.data.candidates[0]?.id;
  const photo = firstId ? await readPhoto(cache, firstId) : null;
  const photoUrl = firstId
    ? client.buildPhotoUrl({ cycle: report.discovery.cycle, electionId: report.discovery.federalElectionId, scope: "br", candidateId: firstId }).href
    : "-";
  console.log(`\nFoto do 1º colocado (${firstId}): ${photo ? `${photo.byteLength} bytes` : `NÃO encontrada — URL tentada: ${photoUrl}`}`);

  console.log("\nÚltimas atualizações:");
  for (const item of (await readUpdates(cache)).slice(0, 8)) console.log(`  ${item.at}  ${item.text}`);
}

main().catch((error) => {
  console.error("Falha:", error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exit(1);
});
