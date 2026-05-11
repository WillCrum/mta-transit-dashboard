"use client";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import type { Stop, PlaceResult } from "@/lib/types";
import subwayStopsJson     from "@/lib/subway-stops.json";
import subwayCoordsJson    from "@/lib/subway-stop-coords.json";
import subwayRoutesJson    from "@/lib/subway-stop-routes.json";
import subwayLineOrderJson from "@/lib/subway-line-order.json";

const stops     = subwayStopsJson     as Record<string, string>;
const coords    = subwayCoordsJson    as Record<string, { lat: number; lon: number }>;
const routes    = subwayRoutesJson    as Record<string, string[]>;
const lineOrder = subwayLineOrderJson as Record<string, string[]>;

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
  pinLocation?: PlaceResult | null;
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
  const [nearbyBusStops, setNearbyBusStops] = useState<Stop[]>([]);

  useEffect(() => {
    if (!props.pinLocation) {
      setNearbyBusStops([]);
      return;
    }
    const { lat, lon } = props.pinLocation;
    fetch(`/api/nearby-bus-stops?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then(setNearbyBusStops)
      .catch(() => setNearbyBusStops([]));
  }, [props.pinLocation]);

  return (
    <MapSearchDropdownInner
      {...props}
      allSubwayStops={allSubwayStops}
      lineOrder={lineOrder}
      nearbyBusStops={nearbyBusStops}
    />
  );
}
