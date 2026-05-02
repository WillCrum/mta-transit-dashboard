// Fetches all NYCT bus stops from the Bus Time REST API and produces:
//   lib/bus-stops.json — { "MTA_XXXXXX": { name, lat, lon, routes, direction } }
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

// "DOWNTOWN BKLYN TILLARY ST via HALSEY" → "Downtown Bklyn Tillary St"
function extractDirection(rawName) {
  return toTitleCase(rawName.replace(/\s+via\s+.*/i, "").trim());
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

const stops = {}; // MTA_STOPID → { name, lat, lon, direction, routes: Set<string> }

async function fetchStopsForRoute(route) {
  const routeId = encodeURIComponent(route.id);
  const shortName = route.shortName ?? route.id.replace(/^MTA NYCT_/, "");
  try {
    const data = await fetchJson(
      `${BASE}/stops-for-route/${routeId}.json?key=${KEY}&includePolylines=false`
    );

    // Build a lookup of stopId → stop ref
    const stopRefs = {};
    for (const s of (data?.data?.stops ?? [])) {
      stopRefs[s.id] = s;
    }

    // Use stopGroupings to get direction per stop
    const stopGroupings = data?.data?.stopGroupings ?? [];
    let count = 0;
    for (const grouping of stopGroupings) {
      for (const group of grouping.stopGroups ?? []) {
        const direction = extractDirection(group.name?.name ?? "");
        for (const stopId of group.stopIds ?? []) {
          const s = stopRefs[stopId];
          if (!s) continue;
          if (!stops[stopId]) {
            stops[stopId] = {
              name: toTitleCase(s.name),
              lat: s.lat,
              lon: s.lon,
              direction,
              routes: new Set(),
            };
          }
          stops[stopId].routes.add(shortName);
          count++;
        }
      }
    }

    // Fallback: if no stopGroupings, use flat stops list
    if (count === 0) {
      const stopList = data?.data?.stops ?? [];
      for (const s of stopList) {
        if (!stops[s.id]) {
          stops[s.id] = { name: toTitleCase(s.name), lat: s.lat, lon: s.lon, direction: "", routes: new Set() };
        }
        stops[s.id].routes.add(shortName);
        count++;
      }
    }

    return count;
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
  Object.entries(stops).map(([id, { name, lat, lon, direction, routes }]) => [
    id,
    { name, lat, lon, direction, routes: [...routes].sort() },
  ])
);

const outPath = path.join(__dir, "../lib/bus-stops.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nWrote ${Object.keys(output).length} unique stops → lib/bus-stops.json`);
console.log(`(${totalStopsFetched} total stop-route pairs across all routes)`);
