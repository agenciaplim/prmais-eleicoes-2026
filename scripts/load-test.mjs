/**
 * Basic load test without dependencies (Node 22+).
 *
 *   node scripts/load-test.mjs http://localhost:3000 30 50
 *   (base URL, duration in seconds, concurrent clients)
 *
 * Each client loops over the public routes a visitor hits. Reports throughput, latency and errors.
 */
const [base = "http://localhost:3000", seconds = "30", clients = "50"] = process.argv.slice(2);
const paths = [
  "/",
  "/api/results",
  "/api/results?office=governor&scope=pr",
  "/api/municipalities?office=president",
  "/api/locations?state=pr",
  "/maps/pr-municipios.json"
];

const deadline = Date.now() + Number(seconds) * 1000;
const latencies = [];
const statuses = new Map();
let errors = 0;

async function client(offset) {
  let index = offset;
  while (Date.now() < deadline) {
    const path = paths[index++ % paths.length];
    const started = performance.now();
    try {
      const response = await fetch(base + path, { headers: { "accept-encoding": "gzip" } });
      await response.arrayBuffer();
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
    } catch {
      errors++;
    }
    latencies.push(performance.now() - started);
  }
}

await Promise.all(Array.from({ length: Number(clients) }, (_, i) => client(i)));
latencies.sort((a, b) => a - b);
const pct = (p) => latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))]?.toFixed(0);
console.log({
  requests: latencies.length,
  rps: (latencies.length / Number(seconds)).toFixed(1),
  p50_ms: pct(50),
  p95_ms: pct(95),
  p99_ms: pct(99),
  statuses: Object.fromEntries(statuses),
  networkErrors: errors
});
