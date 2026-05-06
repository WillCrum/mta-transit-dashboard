"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from "react-leaflet";
import { SearchX } from "lucide-react";
import type { Stop } from "@/lib/types";
import { LINE_COLORS } from "@/lib/constants";

// Shuttle groups for /S line-browse
const SHUTTLE_GROUPS = [
  { code: "GS", lines: ["GS"] },
  { code: "FS", lines: ["FS"] },
  { code: "H",  lines: ["H"] },
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

// NYC bounding box
const NYC_BOUNDS: L.LatLngBoundsLiteral = [
  [40.4774, -74.2591],
  [40.9176, -73.7004],
];

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

/** Polyline(s) for line-browse mode. Handles /S shuttle (3 disconnected segments). */
function LineBrowsePolyline({
  results,
  lineCode,
}: {
  results: Stop[];
  lineCode: string;
}) {
  if (lineCode === "S") {
    return (
      <>
        {SHUTTLE_GROUPS.map(({ code }) => {
          const group = results.filter((s) => s.lines.some((l) => l === code));
          const pts = group
            .filter((s) => s.lat != null && s.lon != null)
            .map((s) => [s.lat!, s.lon!] as [number, number]);
          if (pts.length < 2) return null;
          const color = LINE_COLORS["GS"]?.bg ?? "#808183";
          return (
            <Polyline key={code} positions={pts} color={color} weight={4} opacity={0.8} />
          );
        })}
      </>
    );
  }

  const pts = results
    .filter((s) => s.lat != null && s.lon != null)
    .map((s) => [s.lat!, s.lon!] as [number, number]);
  if (pts.length < 2) return null;
  const color = LINE_COLORS[lineCode]?.bg ?? "#808183";
  return <Polyline positions={pts} color={color} weight={4} opacity={0.8} />;
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

  // Markers to render on the map
  const idleMarkers = !hasResults ? allSubwayStops : [];
  const resultMarkers = hasResults
    ? results.filter((s) => s.lat != null && s.lon != null)
    : [];

  return (
    <div className="relative" style={{ height: 360 }}>
      <MapContainer
        bounds={NYC_BOUNDS}
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
                color: already ? "#777D88" : stopColor(stop.lines),
                fillColor: already ? "#777D88" : stopColor(stop.lines),
                fillOpacity: already ? 0.4 : 0.85,
                weight: 1.5,
                opacity: 1,
              }}
              eventHandlers={{
                mousedown: () => {
                  if (!already) {
                    onSelect({
                      id: stop.id,
                      name: stop.name,
                      type: "SUBWAY",
                      lines: stop.lines,
                      lat: stop.lat,
                      lon: stop.lon,
                    });
                  }
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <span className="text-xs font-medium">{stop.name}</span>
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
                color: already ? "#777D88" : stopColor(stop.lines),
                fillColor: already ? "#777D88" : stopColor(stop.lines),
                fillOpacity: already ? 0.4 : 0.9,
                weight: 2,
                opacity: 1,
              }}
              eventHandlers={{
                mousedown: () => {
                  if (!already) onSelect(stop);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <span className="text-xs font-medium">{stop.name}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Route polyline in line-browse mode */}
        {isLineBrowse && hasCoordResults && (
          <LineBrowsePolyline results={results} lineCode={lineCode} />
        )}

        {/* Auto-fit when results change */}
        {hasCoordResults && <FitResults results={results} />}
      </MapContainer>

      {/* No-results overlay */}
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
