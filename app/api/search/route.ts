import { NextRequest, NextResponse } from "next/server";
import type { Stop } from "@/lib/types";
import subwayStopsJson  from "@/lib/subway-stops.json";
import subwayRoutesJson from "@/lib/subway-stop-routes.json";
import busStopsJson     from "@/lib/bus-stops.json";

const subwayStops  = subwayStopsJson  as Record<string, string>;
const subwayRoutes = subwayRoutesJson as Record<string, string[]>;
const busStops     = busStopsJson     as Record<string, { name: string; routes: string[]; lat?: number; lon?: number; direction?: string }>;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const results: Stop[] = [];

  // Subway — search all parent stations
  for (const [id, name] of Object.entries(subwayStops)) {
    if (results.length >= 20) break;
    if (
      name.toLowerCase().includes(q) ||
      id.toLowerCase().includes(q) ||
      (subwayRoutes[id] ?? []).some((r) => r.toLowerCase().startsWith(q))
    ) {
      results.push({ id, name, type: "SUBWAY", lines: subwayRoutes[id] ?? [] });
    }
  }

  // Bus — search all 11k+ stops
  const busResults: Stop[] = [];
  for (const [id, { name, routes, direction }] of Object.entries(busStops)) {
    if (busResults.length >= 100) break;
    if (
      name.toLowerCase().includes(q) ||
      routes.some((r) => r.toLowerCase().startsWith(q))
    ) {
      busResults.push({ id, name, type: "BUS", lines: routes, direction });
    }
  }

  return NextResponse.json([...results, ...busResults]);
}
