import { NextRequest, NextResponse } from "next/server";
import type { Stop } from "@/lib/types";
import subwayStopsJson    from "@/lib/subway-stops.json";
import subwayRoutesJson   from "@/lib/subway-stop-routes.json";
import subwayLineOrderJson from "@/lib/subway-line-order.json";
import busStopsJson       from "@/lib/bus-stops.json";

const subwayStops  = subwayStopsJson      as Record<string, string>;
const subwayRoutes = subwayRoutesJson     as Record<string, string[]>;
const lineOrder    = subwayLineOrderJson  as Record<string, string[]>;
const busStops     = busStopsJson         as Record<string, { name: string; routes: string[]; lat?: number; lon?: number; direction?: string }>;

/** Sort stops by canonical trip order; unrecognised stops fall to the end. */
function sortByLineOrder(results: Stop[], codes: string[]): void {
  // Build a combined ordered list: for /s this is GS→FS→H in sequence order
  const combined = codes.flatMap((c) => lineOrder[c] ?? []);
  const orderMap = new Map(combined.map((id, i) => [id, i]));
  results.sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999));
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  // ── Line-browse mode: query starts with "/" ──────────────────────────────
  if (raw.startsWith("/")) {
    const lineCode = raw.slice(1).toUpperCase();
    if (!lineCode) return NextResponse.json([]);

    // "/s" expands to all three shuttle variants so they appear together
    const matchCodes = lineCode === "S" ? ["GS", "FS", "H"] : [lineCode];

    const lineResults: Stop[] = [];
    for (const [id, lines] of Object.entries(subwayRoutes)) {
      if ((lines as string[]).some((l) => matchCodes.includes(l))) {
        lineResults.push({
          id,
          name: (subwayStops as Record<string, string>)[id] ?? id,
          type: "SUBWAY",
          lines: lines as string[],
        });
      }
    }
    sortByLineOrder(lineResults, matchCodes);

    const busLineResults: Stop[] = [];
    for (const [id, { name, routes, direction }] of Object.entries(busStops)) {
      if (busLineResults.length >= 150) break;
      if (routes.some((r) => r.toUpperCase() === lineCode)) {
        busLineResults.push({ id, name, type: "BUS", lines: routes, direction });
      }
    }
    busLineResults.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json([...lineResults, ...busLineResults]);
  }

  // ── Normal stop/name search ───────────────────────────────────────────────
  const q = raw.toLowerCase();
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
