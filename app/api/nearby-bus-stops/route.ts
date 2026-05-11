import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import busStopsJson from "@/lib/bus-stops.json";

const RADIUS_KM = 1.60934; // 1 mile

interface BusStop {
  name: string;
  lat: number;
  lon: number;
  direction: string;
  routes: string[];
}

const busStops = busStopsJson as Record<string, BusStop>;

function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") ?? "");
  if (isNaN(lat) || isNaN(lon)) return NextResponse.json([]);

  // Find all bus stops within 1 mile and compute distance
  const nearby: Array<{ id: string; stop: BusStop; dist: number }> = [];
  for (const [id, stop] of Object.entries(busStops)) {
    const dist = distKm(lat, lon, stop.lat, stop.lon);
    if (dist <= RADIUS_KM) nearby.push({ id, stop, dist });
  }

  // Per-route: keep only the closest stop for each route
  const closestByRoute = new Map<string, { id: string; stop: BusStop; dist: number }>();
  for (const entry of nearby) {
    for (const route of entry.stop.routes) {
      const existing = closestByRoute.get(route);
      if (!existing || entry.dist < existing.dist) {
        closestByRoute.set(route, entry);
      }
    }
  }

  // Deduplicate: a stop may be the closest for several routes — emit it once
  // but with all its routes listed.
  const seenIds = new Set<string>();
  const results = [];
  for (const entry of closestByRoute.values()) {
    if (seenIds.has(entry.id)) continue;
    seenIds.add(entry.id);
    results.push({
      id: entry.id,
      name: entry.stop.name,
      type: "BUS",
      lines: entry.stop.routes,
      lat: entry.stop.lat,
      lon: entry.stop.lon,
      direction: entry.stop.direction,
    });
  }

  // Sort by distance for consistent ordering
  results.sort((a, b) =>
    distKm(lat, lon, a.lat!, a.lon!) - distKm(lat, lon, b.lat!, b.lon!)
  );

  return NextResponse.json(results);
}
