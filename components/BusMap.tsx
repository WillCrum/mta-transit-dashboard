"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { LINE_COLORS } from "@/lib/constants";

const BusMapInner = dynamic(() => import("./BusMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#E0E4EC] flex items-center justify-center text-[12px] text-[#777D88] font-medium">
      Loading map…
    </div>
  ),
});

interface Props {
  lat: number;
  lon: number;
  routes: string[];
}

export default function BusMap({ lat, lon, routes }: Props) {
  const [activeRoute, setActiveRoute] = useState(routes[0]);

  return (
    <div className="flex flex-col h-full">
      {routes.length > 1 && (
        <div className="flex gap-1.5 px-3 py-2 border-b border-[#ECEDF0] bg-white">
          {routes.map((r) => {
            const colors = LINE_COLORS[r] ?? LINE_COLORS["BUS"];
            const isActive = r === activeRoute;
            return (
              <button
                key={r}
                onClick={() => setActiveRoute(r)}
                className="px-2.5 py-1 rounded text-[11px] font-bold leading-none transition-opacity"
                style={{
                  background: isActive ? colors.bg : "#E8ECF2",
                  color: isActive ? colors.text : "#777D88",
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {r}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <BusMapInner key={activeRoute} lat={lat} lon={lon} route={activeRoute} />
      </div>
    </div>
  );
}
