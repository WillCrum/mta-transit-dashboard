"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, Marker, useMap } from "react-leaflet";
import { SearchX } from "lucide-react";
import type { Stop, PlaceResult } from "@/lib/types";
import { LINE_COLORS } from "@/lib/constants";

// Only subway lines have meaningful stop-sequence data; skip polyline for buses
const SUBWAY_LINE_CODES = new Set([
  "1","2","3","4","5","6","6X","7","7X",
  "A","B","C","D","E","F","G","J","L","M","N","Q","R","W","Z",
  "GS","FS","H","S",
]);

// Shuttle groups for /S line-browse
const SHUTTLE_GROUPS = [{ code: "GS" }, { code: "FS" }, { code: "H" }] as const;

// Maximum distance (km) between consecutive polyline points.
// Breaks long diagonal jumps caused by branches or data gaps while keeping
// legitimate long segments like the A train's Jamaica Bay crossing (~6 km).
const MAX_SEGMENT_KM = 7;

interface SubwayStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  lines: string[];
}

const RADIUS_KM = 1.60934; // 1 mile

interface Props {
  results: Stop[];
  isLineBrowse: boolean;
  lineCode: string;
  allSubwayStops: SubwayStop[];
  lineOrder: Record<string, string[]>;
  onSelect: (stop: Stop) => void;
  selectedIds: Set<string>;
  pinLocation?: PlaceResult | null;
}

const NYC_CENTER: [number, number] = [40.728, -73.974];
const NYC_DEFAULT_ZOOM = 12;

/** Haversine distance in km between two [lat, lon] points. */
function distKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = (b[0] - a[0]) * (Math.PI / 180);
  const dLon = (b[1] - a[1]) * (Math.PI / 180);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * (Math.PI / 180)) *
      Math.cos(b[0] * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Split a point array into segments, breaking where consecutive points exceed MAX_SEGMENT_KM. */
function buildSegments(pts: [number, number][]): [number, number][][] {
  const segs: [number, number][][] = [];
  let seg: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i === 0 || distKm(pts[i - 1], pts[i]) <= MAX_SEGMENT_KM) {
      seg.push(pts[i]);
    } else {
      if (seg.length >= 2) segs.push(seg);
      seg = [pts[i]];
    }
  }
  if (seg.length >= 2) segs.push(seg);
  return segs;
}

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
    if (pts.length === 1) { map.setView(pts[0], 15); return; }
    map.fitBounds(L.latLngBounds(pts), { padding: [32, 32], maxZoom: 15, animate: true });
  }, [map, results]);
  return null;
}

/** Pans/zooms to fit a pin and its nearby stops. */
function FitPin({ pin, nearby }: { pin: PlaceResult; nearby: SubwayStop[] }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = [
      [pin.lat, pin.lon],
      ...nearby.map((s) => [s.lat, s.lon] as [number, number]),
    ];
    if (pts.length === 1) { map.setView(pts[0], 15); return; }
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16, animate: true });
  }, [map, pin, nearby]);
  return null;
}

/** Custom drop-pin icon for geocoded place locations. */
function makePinIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 20px; height: 20px;
      background: #003DA5;
      border: 2.5px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    tooltipAnchor: [6, -18],
  });
}

/** Subway route polyline(s).
 *  Filters to canonical-trip stops only (removes branch-only outliers),
 *  then splits on any gap > MAX_SEGMENT_KM to prevent long diagonal jumps. */
function LineBrowsePolyline({
  results,
  lineCode,
  lineOrder,
}: {
  results: Stop[];
  lineCode: string;
  lineOrder: Record<string, string[]>;
}) {
  if (!SUBWAY_LINE_CODES.has(lineCode)) return null;

  const color = LINE_COLORS[lineCode]?.bg ?? LINE_COLORS["S"].bg;

  function renderPolylines(stops: Stop[]) {
    const pts = stops
      .filter((s) => s.lat != null && s.lon != null)
      .map((s) => [s.lat!, s.lon!] as [number, number]);
    return buildSegments(pts).map((seg, i) => (
      <Polyline key={i} positions={seg} color={color} weight={4} opacity={0.85} />
    ));
  }

  if (lineCode === "S") {
    return (
      <>
        {SHUTTLE_GROUPS.map(({ code }) => {
          const canonical = new Set(lineOrder[code] ?? []);
          const group = results.filter((s) => s.lines.some((l) => l === code) && canonical.has(s.id));
          return <>{renderPolylines(group)}</>;
        })}
      </>
    );
  }

  // Filter to stops that appear in the canonical trip for this line.
  // This removes branch-only stops (e.g. Lefferts Blvd / Rockaway Park on the A)
  // which would otherwise produce long diagonal jumps in the polyline.
  const canonical = new Set(lineOrder[lineCode] ?? []);
  const canonicalStops = canonical.size > 0
    ? results.filter((s) => canonical.has(s.id))
    : results; // fallback: use all results if no lineOrder data

  return <>{renderPolylines(canonicalStops)}</>;
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
  lineOrder,
  onSelect,
  selectedIds,
  pinLocation,
}: Props) {
  // Pin mode: filter all subway stops to within 1 mile of pin
  const nearbyStops = pinLocation
    ? allSubwayStops.filter(
        (s) => distKm([pinLocation.lat, pinLocation.lon], [s.lat, s.lon]) <= RADIUS_KM
      )
    : [];

  const pinMode = !!pinLocation;

  const hasResults = results.length > 0;
  const hasCoordResults = results.some((s) => s.lat != null && s.lon != null);
  const showPolyline = !pinMode && isLineBrowse && hasCoordResults && SUBWAY_LINE_CODES.has(lineCode);

  // In pin mode: show nearby stops. In normal mode: idle = all stops, results = filtered.
  const idleMarkers   = pinMode ? [] : (!hasResults ? allSubwayStops : []);
  const resultMarkers = pinMode ? [] : (hasResults ? results.filter((s) => s.lat != null && s.lon != null) : []);

  // In line-browse mode all result stops should use the searched line's color,
  // not lines[0] which may be a different line that shares the station.
  const resultColor = (stop: Stop) =>
    isLineBrowse && lineCode
      ? (LINE_COLORS[lineCode]?.bg ?? stopColor(stop.lines))
      : stopColor(stop.lines);

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

        {/* Search results — filtered/line-browse stops */}
        {resultMarkers.map((stop) => {
          const already = selectedIds.has(stop.id);
          const color = resultColor(stop);
          return (
            <CircleMarker
              key={stop.id}
              center={[stop.lat!, stop.lon!]}
              radius={7}
              pathOptions={{
                color:       already ? "#777D88" : color,
                fillColor:   already ? "#777D88" : color,
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

        {/* Pin mode — drop-pin marker + nearby transit stops */}
        {pinMode && pinLocation && (
          <>
            <Marker
              position={[pinLocation.lat, pinLocation.lon]}
              icon={makePinIcon()}
            >
              <Tooltip direction="top" offset={[0, -22]} opacity={1} permanent={false}>
                <div style={{ fontWeight: 600, fontSize: 13, maxWidth: 200 }}>{pinLocation.label}</div>
              </Tooltip>
            </Marker>
            {nearbyStops.map((stop) => {
              const already = selectedIds.has(stop.id);
              return (
                <CircleMarker
                  key={stop.id}
                  center={[stop.lat, stop.lon]}
                  radius={7}
                  pathOptions={{
                    color:       already ? "#777D88" : stopColor(stop.lines),
                    fillColor:   already ? "#777D88" : stopColor(stop.lines),
                    fillOpacity: already ? 0.4 : 0.9,
                    weight: 2,
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
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <StopTooltip name={stop.name} lines={stop.lines} />
                  </Tooltip>
                </CircleMarker>
              );
            })}
            <FitPin pin={pinLocation} nearby={nearbyStops} />
          </>
        )}

        {showPolyline && (
          <LineBrowsePolyline results={results} lineCode={lineCode} lineOrder={lineOrder} />
        )}
        {!pinMode && hasCoordResults && <FitResults results={results} />}
      </MapContainer>

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
