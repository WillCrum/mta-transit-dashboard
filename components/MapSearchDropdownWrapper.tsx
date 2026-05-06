"use client";
import dynamic from "next/dynamic";
import type { Stop } from "@/lib/types";
import subwayStopsJson  from "@/lib/subway-stops.json";
import subwayCoordsJson from "@/lib/subway-stop-coords.json";
import subwayRoutesJson from "@/lib/subway-stop-routes.json";

const stops  = subwayStopsJson  as Record<string, string>;
const coords = subwayCoordsJson as Record<string, { lat: number; lon: number }>;
const routes = subwayRoutesJson as Record<string, string[]>;

// Built once at module level — stable reference across renders
const allSubwayStops = Object.entries(coords)
  .filter(([id]) => stops[id] != null)
  .map(([id, { lat, lon }]) => ({
    id,
    name: stops[id],
    lat,
    lon,
    lines: routes[id] ?? [],
  }));

interface Props {
  results: Stop[];
  isLineBrowse: boolean;
  lineCode: string;
  onSelect: (stop: Stop) => void;
  selectedIds: Set<string>;
}

const MapSearchDropdownInner = dynamic(() => import("./MapSearchDropdown"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center bg-[#E8ECF2] text-[12px] text-[#777D88] font-medium"
      style={{ height: 360 }}
    >
      Loading map…
    </div>
  ),
});

export default function MapSearchDropdownWrapper(props: Props) {
  return <MapSearchDropdownInner {...props} allSubwayStops={allSubwayStops} />;
}
