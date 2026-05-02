import { NextRequest, NextResponse } from "next/server";
import { fetchGtfsRt, fetchJson, feedsForLines, toMinutes } from "@/lib/mta-feeds";
import type { StopData, DirectionArrivals, Arrival } from "@/lib/types";
import subwayStopsJson  from "@/lib/subway-stops.json";
import subwayRoutesJson from "@/lib/subway-stop-routes.json";
import busStopsJson     from "@/lib/bus-stops.json";

const subwayStops  = subwayStopsJson  as Record<string, string>;
const subwayRoutes = subwayRoutesJson as Record<string, string[]>;
const busStops     = busStopsJson     as Record<string, { name: string; lat: number; lon: number; routes: string[] }>;

// ── Subway ─────────────────────────────────────────────────────────────────

const DIRECTION_LABELS: Record<string, string> = { N: "UPTOWN", S: "DOWNTOWN" };

async function subwayArrivals(stopId: string, lines: string[]): Promise<DirectionArrivals[]> {
  // Use stored lines if available; otherwise search all feeds
  const feedPaths = lines.length > 0
    ? feedsForLines(lines)
    : [
        "nyct%2Fgtfs", "nyct%2Fgtfs-ace", "nyct%2Fgtfs-bdfm",
        "nyct%2Fgtfs-g", "nyct%2Fgtfs-jz", "nyct%2Fgtfs-l",
        "nyct%2Fgtfs-nqrw",
      ];

  const feeds = await Promise.all(feedPaths.map(fetchGtfsRt));

  const grouped: Record<"N" | "S", Array<{ line: string; destination: string; minutes: number }>> =
    { N: [], S: [] };

  for (const feed of feeds) {
    for (const entity of feed.entity) {
      const tu = entity.tripUpdate;
      if (!tu) continue;
      const routeId = tu.trip?.routeId ?? "";

      for (const stu of tu.stopTimeUpdate ?? []) {
        const fullStopId = stu.stopId ?? "";
        if (!fullStopId.startsWith(stopId)) continue;
        const dir = fullStopId.slice(stopId.length) as "N" | "S";
        if (dir !== "N" && dir !== "S") continue;

        const t    = stu.departure?.time ?? stu.arrival?.time;
        const mins = toMinutes(t as Parameters<typeof toMinutes>[0]);
        if (mins === null || mins < 0 || mins > 60) continue;

        // Destination: name of the last stop in the trip
        const allStus    = tu.stopTimeUpdate ?? [];
        const lastId     = allStus[allStus.length - 1]?.stopId ?? "";
        const baseLastId = /[NS]$/.test(lastId) ? lastId.slice(0, -1) : lastId;
        const destination = subwayStops[baseLastId] ?? baseLastId;

        grouped[dir].push({ line: routeId, destination, minutes: mins });
      }
    }
  }

  const result: DirectionArrivals[] = [];
  for (const dir of ["N", "S"] as const) {
    const arrivals = grouped[dir].sort((a, b) => a.minutes - b.minutes).slice(0, 6);
    if (arrivals.length === 0) continue;
    result.push({ direction: DIRECTION_LABELS[dir], arrivals });
  }
  return result;
}

// ── Bus (SIRI Stop Monitoring) ─────────────────────────────────────────────

interface SiriVisit {
  MonitoredVehicleJourney: {
    LineRef:           string;
    DirectionRef:      string;
    PublishedLineName: string | string[];
    DestinationName:   string | string[];
    MonitoredCall: {
      ExpectedArrivalTime?:   string;
      ExpectedDepartureTime?: string;
      AimedArrivalTime?:      string;
    };
  };
}

interface SiriResponse {
  Siri: {
    ServiceDelivery: {
      StopMonitoringDelivery: Array<{ MonitoredStopVisit?: SiriVisit[] }>;
    };
  };
}

async function busArrivals(stopId: string): Promise<DirectionArrivals[]> {
  const key = process.env.BUS_TIME_API_KEY;
  const url  =
    `https://bustime.mta.info/api/siri/stop-monitoring.json` +
    `?key=${key}&MonitoringRef=${encodeURIComponent(stopId)}&MaximumStopVisits=12`;

  const data    = await fetchJson<SiriResponse>(url);
  const visits  =
    data?.Siri?.ServiceDelivery?.StopMonitoringDelivery?.[0]?.MonitoredStopVisit ?? [];

  const grouped: Record<string, Arrival[]> = {};

  for (const v of visits) {
    const j    = v.MonitoredVehicleJourney;
    const call = j.MonitoredCall;
    const rawLine = Array.isArray(j.PublishedLineName)
      ? j.PublishedLineName[0]
      : (j.PublishedLineName ?? j.LineRef ?? "");
    const line = (rawLine as string)
      .replace(/^MTA\s+NYCT_/i, "")
      .replace(/^MTA_/i, "");

    const rawDest = Array.isArray(j.DestinationName)
      ? j.DestinationName[0]
      : (j.DestinationName ?? "");
    const dest = (rawDest as string)
      .replace(/^MTA\s+NYCT_/i, "")
      .replace(/^MTA_/i, "");
    const dir  = j.DirectionRef ?? "0";

    const timeStr =
      call.ExpectedArrivalTime ??
      call.ExpectedDepartureTime ??
      call.AimedArrivalTime;

    if (!timeStr) continue;
    const mins = Math.round((new Date(timeStr).getTime() - Date.now()) / 60000);
    if (mins < 0 || mins > 90) continue;

    if (!grouped[dir]) grouped[dir] = [];
    grouped[dir].push({ line, destination: dest, minutes: mins });
  }

  const DIR_LABELS: Record<string, string> = { "0": "NORTHBOUND", "1": "SOUTHBOUND" };
  return Object.entries(grouped).map(([dir, arrivals]) => ({
    direction: DIR_LABELS[dir] ?? dir,
    arrivals:  arrivals.sort((a, b) => a.minutes - b.minutes).slice(0, 6),
  }));
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const isBus = id.startsWith("MTA_");

  try {
    if (isBus) {
      const meta = busStops[id];
      if (!meta) return NextResponse.json({ error: "unknown bus stop" }, { status: 404 });

      const directions = await busArrivals(id);
      const result: StopData = {
        stop:      { id, name: meta.name, type: "BUS", lines: meta.routes, lat: meta.lat, lon: meta.lon },
        alerts:    [],
        directions,
        updatedAt: Date.now(),
      };
      return NextResponse.json(result);
    } else {
      const name  = subwayStops[id];
      if (!name) return NextResponse.json({ error: "unknown subway stop" }, { status: 404 });
      const lines = subwayRoutes[id] ?? [];

      const directions = await subwayArrivals(id, lines);
      const result: StopData = {
        stop:      { id, name, type: "SUBWAY", lines },
        alerts:    [],
        directions,
        updatedAt: Date.now(),
      };
      return NextResponse.json(result);
    }
  } catch (err) {
    console.error("arrivals error:", err);
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
