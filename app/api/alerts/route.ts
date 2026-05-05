import { NextRequest, NextResponse } from "next/server";
import { fetchJson } from "@/lib/mta-feeds";
import { ALERTS_SUBWAY_URL, ALERTS_BUS_URL, ELEVATOR_URL } from "@/lib/mta-feeds";
import type { Alert } from "@/lib/types";

// ── MTA JSON alert shapes ──────────────────────────────────────────────────

interface GtfsRtJsonAlert {
  id: string;
  alert: {
    active_period?: Array<{ start?: number; end?: number }>;
    informed_entity?: Array<{
      route_id?:  string;
      stop_id?:   string;
      agency_id?: string;
    }>;
    header_text?: {
      translation: Array<{ text: string; language: string }>;
    };
    description_text?: {
      translation: Array<{ text: string; language: string }>;
    };
  };
}

interface GtfsRtJsonFeed {
  entity: GtfsRtJsonAlert[];
}

interface EneOutage {
  station:     string;
  trainno:     string;
  equipment:   string;
  serving:     string;
  ADA:         string;
  isupcomingoutage: string;
  reason:      string;
  outagedate:  string;
  estimatedreturntoservice: string;
}

function isActive(periods: Array<{ start?: number; end?: number }> | undefined): boolean {
  if (!periods || periods.length === 0) return true; // no period = always active
  const nowSecs = Date.now() / 1000;
  return periods.some((p) => {
    const after  = p.start == null || nowSecs >= p.start;
    const before = p.end   == null || nowSecs <= p.end;
    return after && before;
  });
}

function englishText(
  t: { translation: Array<{ text: string; language: string }> } | undefined
): string {
  if (!t) return "";
  return (
    t.translation.find((x) => x.language === "en")?.text ??
    t.translation[0]?.text ??
    ""
  );
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const stopId  = req.nextUrl.searchParams.get("stopId");
  const type    = req.nextUrl.searchParams.get("type") as "SUBWAY" | "BUS" | null;
  const lines   = req.nextUrl.searchParams.get("lines")?.split(",") ?? [];
  const station = req.nextUrl.searchParams.get("station") ?? "";

  if (!stopId || !type) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const alerts: Alert[] = [];

  try {
    if (type === "SUBWAY") {
      // ── Service alerts ──────────────────────────────────────────────
      const feed = await fetchJson<GtfsRtJsonFeed>(ALERTS_SUBWAY_URL);
      for (const entity of feed.entity ?? []) {
        if (!isActive(entity.alert?.active_period)) continue;
        const informed = entity.alert?.informed_entity ?? [];
        const relevant =
          informed.some((e) => e.stop_id && (e.stop_id === stopId || e.stop_id.startsWith(stopId))) ||
          informed.some((e) => e.route_id && lines.includes(e.route_id));
        if (!relevant) continue;

        const summary = englishText(entity.alert.header_text);
        if (!summary) continue;

        alerts.push({ id: entity.id, summary, type: "SERVICE" });
      }

      // ── Elevator / escalator outages ────────────────────────────────
      const ene = await fetchJson<EneOutage[]>(ELEVATOR_URL);
      for (const outage of ene ?? []) {
        // Match by station name (fuzzy: outage.station contains the stop name)
        if (!station || !outage.station?.toLowerCase().includes(station.toLowerCase())) continue;
        const summary = `${outage.equipment ?? "Elevator"} out of service at ${outage.station}. ${
          outage.estimatedreturntoservice ? `Est. return: ${outage.estimatedreturntoservice}.` : ""
        }`.trim();
        alerts.push({ id: `ene-${outage.trainno}-${outage.equipment}`, summary, type: "ELEVATOR" });
      }
    } else {
      // ── Bus service alerts ──────────────────────────────────────────
      const feed = await fetchJson<GtfsRtJsonFeed>(ALERTS_BUS_URL);
      for (const entity of feed.entity ?? []) {
        if (!isActive(entity.alert?.active_period)) continue;
        const informed = entity.alert?.informed_entity ?? [];
        const relevant =
          informed.some((e) => e.stop_id === stopId) ||
          informed.some((e) => e.route_id && lines.includes(e.route_id));
        if (!relevant) continue;

        const summary = englishText(entity.alert.header_text);
        if (!summary) continue;

        alerts.push({ id: entity.id, summary, type: "SERVICE" });
      }
    }

    // Deduplicate: first by entity id, then by summary text.
    // The MTA feed sometimes emits the same alert as two separate entities
    // (different ids, identical text) — one matched by route_id, one by stop_id.
    const seenIds      = new Set<string>();
    const seenSummaries = new Set<string>();
    const deduped = alerts.filter((a) => {
      if (seenIds.has(a.id) || seenSummaries.has(a.summary)) return false;
      seenIds.add(a.id);
      seenSummaries.add(a.summary);
      return true;
    });
    return NextResponse.json(deduped);
  } catch (err) {
    console.error("alerts error:", err);
    // Non-fatal: return empty list rather than breaking the card
    return NextResponse.json([]);
  }
}
