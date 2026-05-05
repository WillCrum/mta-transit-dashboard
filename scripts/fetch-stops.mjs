// Downloads MTA subway GTFS and produces:
//   lib/subway-stops.json       — { stop_id: stop_name }
//   lib/subway-stop-routes.json — { stop_id: [route_id, ...] }
import http from "http";
import { writeFileSync } from "fs";
import unzipper from "unzipper";
import { fileURLToPath } from "url";
import path from "path";
import readline from "readline";
import { Readable } from "stream";

const __dir = path.dirname(fileURLToPath(import.meta.url));

const GTFS_URL = "http://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip";

// Only real revenue subway routes with GTFS-RT feeds.
// Shuttle route IDs in GTFS: GS (42nd St), FS (Franklin Av), H (Rockaway Park).
const ALLOWED_ROUTES = new Set([
  "1","2","3","4","5","6","6X","7","7X",
  "A","B","C","D","E","F","G","J","L","M","N","Q","R","W","Z",
  "GS","FS","H",
]);

console.log("Downloading MTA subway GTFS…");

function parseCsvLine(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let val = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { val += line[i++]; }
      }
      fields.push(val.trim());
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { fields.push(line.slice(i).trim()); break; }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

function parseStream(stream, onRow) {
  return new Promise((resolve, reject) => {
    let headers = null;
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    rl.on("line", (raw) => {
      const cols = parseCsvLine(raw);
      if (!headers) { headers = cols; return; }
      const row = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ""]));
      onRow(row);
    });
    rl.on("close", resolve);
    rl.on("error", reject);
  });
}

http.get(GTFS_URL, (res) => {
  if (res.statusCode !== 200) { console.error("HTTP", res.statusCode); process.exit(1); }

  const stops  = {};   // stop_id → name (parent stations only)
  const routes = {};   // stop_id → Set<route_id>
  const tripToRoute = {};  // trip_id → route_id

  // Collect raw file buffers while streaming the zip
  const fileBuffers = {};

  res.pipe(unzipper.Parse()).on("entry", (entry) => {
    const name = entry.path;
    if (!["stops.txt", "trips.txt", "stop_times.txt"].includes(name)) {
      entry.autodrain(); return;
    }
    const chunks = [];
    entry.on("data", (c) => chunks.push(c));
    entry.on("end", () => { fileBuffers[name] = Buffer.concat(chunks); });
  }).on("finish", async () => {
    // 1. Parse stops.txt — keep only parent stations (no N/S suffix)
    await parseStream(Readable.from(fileBuffers["stops.txt"]), (row) => {
      const id   = row.stop_id;
      const name = row.stop_name;
      if (!id || !name) return;
      const locType = row.location_type;
      if (locType === "1") {
        stops[id] = name;
      } else if (locType !== "0") {
        if (!/[NS]$/.test(id)) stops[id] = name;
      }
    });

    // 2. Parse trips.txt — build trip_id → route_id
    await parseStream(Readable.from(fileBuffers["trips.txt"]), (row) => {
      if (row.trip_id && row.route_id) tripToRoute[row.trip_id] = row.route_id;
    });

    // 3. Parse stop_times.txt — build stop_id → Set<route_id>
    //    Only use parent stop_ids (strip N/S suffix), only allowed routes
    await parseStream(Readable.from(fileBuffers["stop_times.txt"]), (row) => {
      const rawStop = row.stop_id ?? "";
      const stopId = /[NS]$/.test(rawStop) ? rawStop.slice(0, -1) : rawStop;
      if (!stops[stopId]) return;
      const routeId = tripToRoute[row.trip_id ?? ""];
      if (!routeId || !ALLOWED_ROUTES.has(routeId)) return;
      if (!routes[stopId]) routes[stopId] = new Set();
      routes[stopId].add(routeId);
    });

    // Remove stops that ended up with no allowed routes (e.g. GS shuttle-only stop 902)
    for (const id of Object.keys(stops)) {
      if (!routes[id] || routes[id].size === 0) delete stops[id];
    }

    // Serialise Sets → sorted arrays
    const routesJson = Object.fromEntries(
      Object.entries(routes).map(([id, set]) => [id, [...set].sort()])
    );

    writeFileSync(path.join(__dir, "../lib/subway-stops.json"), JSON.stringify(stops, null, 2));
    writeFileSync(path.join(__dir, "../lib/subway-stop-routes.json"), JSON.stringify(routesJson, null, 2));
    console.log(`Wrote ${Object.keys(stops).length} parent stations → lib/subway-stops.json`);
    console.log(`Wrote route mappings for ${Object.keys(routesJson).length} stops → lib/subway-stop-routes.json`);
  }).on("error", (e) => { console.error(e); process.exit(1); });
}).on("error", (e) => { console.error(e); process.exit(1); });
