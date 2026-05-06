"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from "react-leaflet";
import { SearchX } from "lucide-react";
import type { Stop } from "@/lib/types";
import { LINE_COLORS } from "@/lib/constants";

// Only subway lines have meaningful stop-sequence data; skip polyline for buses
const SUBWAY_LINE_CODES = new Set([
  "1","2","3","4","5","6","6X","7","7X",
  "A","B","C","D","E","F","G","J","L","M","N","Q","R","W","Z",
  "GS","FS","H","S",
]);

// Shuttle groups for /S line-browse
const SHUTTLE_GROUPS = [
  { code: "GS" },
  { code: "FS" },
  { code: "H"  },
] as const;

interface SubwayStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  lines: string[];
}

interface Props {
  results: Stop[];
  isLineBrowse: boolean;
  lineCode: string;
  allSubwayStops: SubwayStop[];
  onSelect: (stop: Stop) => void;
  selectedIds: Set<string>;
}

// NYC center — Manhattan midpoint
const NYC_CENTER: [number, number] = [40.728, -73.974];
const NYC_DEFAULT_ZOOM = 12;

function stopColor(lines: string[]): string {
  return LINE_COLORS[lines[0]]?.bg ?? LINE_COLORS["BUS"].bg;
}

/** Pans/zooms the map to fit the current results. */
function FitResults({ results }: { results: Stop[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = results
      .filter((s) => s.lat != null && s.lon != null)
      .map((s) => [s.lat!, s.lon!] as [number, number]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [32, 32], maxZoom: 15, animate: true });
  }, [map, results]);
  return null;
}

/** Polyline(s) for subway line-browse only — buses have no meaningful stop sequence. */
function LineBrowsePolyline({ results, lineCode }: { results: Stop[]; lineCode: string }) {
  if (!SUBWAY_LINE_CODES.has(lineCode)) return null;

  if (lineCode === "S") {
    return (
      <>
        {SHUTTLE_GROUPS.map(({ code }) => {
          const group = results.filter((s) => s.lines.some((l) => l === code));
          const pts = group
            .filter((s) => s.lat != null && s.lon != null)
            .map((s) => [s.lat!, s.lon!] as [number, number]);
          if (pts.length < 2) return null;
          return (
            <Polyline key={code} positions={pts} color={LINE_COLORS["GS"]?.bg ?? "#808183"} weight={4} opacity={0.8} />
          );
        })}
      </>
    );
  }

  const pts = results
    .filter((s) => s.lat != null && s.lon != null)
    .map((s) => [s.lat!, s.lon!] as [number, number]);
  if (pts.length < 2) return null;
  return <Polyline positions={pts} color={LINE_COLORS[lineCode]?.bg ?? "#808183"} weight={4} opacity={0.8} />;
}

function StopTooltip({ name, lines }: { name: string; lines: string[] }) {
  return (
    <div style={{ lineHeight: 1.4 }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
      <div style={{ fontSize: 11, color: "#777D88", marginTop: 2 }}>{lines.join(" · ")}</div>
    </div>
  );
}

export default function MapSearchDropdown({
  results,
  isLineBrowse,
  lineCode,
  allSubwayStops,
  onSelect,
  selectedIds,
}: Props) {
  const hasResults = results.length > 0;
  const hasCoordResults = results.some((s) => s.lat != null && s.lon != null);
  const showPolyline = isLineBrowse && hasCoordResults && SUBWAY_LINE_CODES.has(lineCode);

  const idleMarkers  = !hasResults ? allSubwayStops : [];
  const resultMarkers = hasResults ? results.filter((s) => s.lat != null && s.lon != null) : [];

  return (
    <div className="relative" style={{ height: 360 }}>
      <MapContainer
        center={NYC_CENTER}
        zoom={NYC_DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Idle state — all subway stations */}
        {idleMarkers.map((stop) => {
          const already = selectedIds.has(stop.id);
          return (
            <CircleMarker
              key={stop.id}
              center={[stop.lat, stop.lon]}
              radius={5}
              pathOptions={{
                color:       already ? "#777D88" : stopColor(stop.lines),
                fillColor:   already ? "#777D88" : stopColor(stop.lines),
                fillOpacity: already ? 0.4 : 0.85,
                weight: 1.5,
                opacity: 1,
              }}
              eventHandlers={{
                mousedown: () => {
                  if (!already) {
                    onSelect({ id: stop.id, name: stop.name, type: "SUBWAY", lines: stop.lines, lat: stop.lat, lon: stop.lon });
                  }
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                <StopTooltip name={stop.name} lines={stop.lines} />
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Search results — filtered stops */}
        {resultMarkers.map((stop) => {
          const already = selectedIds.has(stop.id);
          return (
            <CircleMarker
              key={stop.id}
              center={[stop.lat!, stop.lon!]}
              radius={7}
              pathOptions={{
                color:       already ? "#777D88" : stopColor(stop.lines),
                fillColor:   already ? "#777D88" : stopColor(stop.lines),
                fillOpacity: already ? 0.4 : 0.9,
                weight: 2,
                opacity: 1,
              }}
              eventHandlers={{
                mousedown: () => { if (!already) onSelect(stop); },
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <StopTooltip name={stop.name} lines={stop.lines} />
              </Tooltip>
            </CircleMarker>
          );
        })}

        {showPolyline && <LineBrowsePolyline results={results} lineCode={lineCode} />}
        {hasCoordResults && <FitResults results={results} />}
      </MapContainer>

      {/* No-results overlay (keeps map visible underneath) */}
      {hasResults && !hasCoordResults && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 z-[1000]">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#F2F4F8]">
            <SearchX size={18} className="text-[#777D88]" strokeWidth={1.75} />
          </div>
          <p className="text-[13px] font-semibold text-[#1A1D23]">No stops with coordinates</p>
        </div>
      )}
    </div>
  );
}
