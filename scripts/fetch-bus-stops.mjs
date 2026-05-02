// Fetches all NYCT bus stops from the Bus Time REST API and produces:
//   lib/bus-stops.json — { "MTA_XXXXXX": { name: string, routes: string[] } }
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dir = path.dirname(fileURLToPath(import.meta.url));

// Read API key from .env.local
const envPath = path.join(__dir, "../.env.local");
const envContent = readFileSync(envPath, "utf8");
const KEY = envContent.match(/BUS_TIME_API_KEY=(.+)/)?.[1]?.trim();
if (!KEY) { console.error("BUS_TIME_API_KEY not found in .env.local"); process.exit(1); }

const BASE = "https://bustime.mta.info/api/where";

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

console.log("Fetching NYCT route list…");
const routesData = await fetchJson(`${BASE}/routes-for-agency/MTA%20NYCT.json?key=${KEY}`);
const routes = routesData.data?.list ?? [];
console.log(`Found ${routes.length} routes`);

const stops = {}; // MTA_STOPID → { name: string, routes: Set<string> }

async function fetchStopsForRoute(route) {
  const routeId = encodeURIComponent(route.id);
  const shortName = route.shortName ?? route.id.replace(/^MTA NYCT_/, "");
  try {
    const data = await fetchJson(
      `${BASE}/stops-for-route/${routeId}.json?key=${KEY}&includePolylines=false`
    );
    const stopList = data?.data?.references?.stops ?? data?.data?.stops ?? [];
    for (const stop of stopList) {
      if (!stops[stop.id]) stops[stop.id] = { name: toTitleCase(stop.name), lat: stop.lat, lon: stop.lon, routes: new Set() };
      stops[stop.id].routes.add(shortName);
    }
    return stopList.length;
  } catch (err) {
    console.warn(`  Skipped ${shortName}: ${err.message}`);
    return 0;
  }
}

// Process in batches of 10 to avoid hammering the API
const BATCH = 10;
let totalStopsFetched = 0;
for (let i = 0; i < routes.length; i += BATCH) {
  const batch = routes.slice(i, i + BATCH);
  const counts = await Promise.all(batch.map(fetchStopsForRoute));
  totalStopsFetched += counts.reduce((a, b) => a + b, 0);
  console.log(`  ${Math.min(i + BATCH, routes.length)}/${routes.length} routes processed`);
}

// Serialise Sets → sorted arrays
const output = Object.fromEntries(
  Object.entries(stops).map(([id, { name, lat, lon, routes }]) => [id, { name, lat, lon, routes: [...routes].sort() }])
);

const outPath = path.join(__dir, "../lib/bus-stops.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nWrote ${Object.keys(output).length} unique stops → lib/bus-stops.json`);
console.log(`(${totalStopsFetched} total stop-route pairs across all routes)`);
