"use client";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Map, ChevronRight, X, RefreshCw, AlertCircle, Clock, GripVertical } from "lucide-react";
import BusMap from "./BusMap";
import LineBadge from "./LineBadge";
import AlertBar from "./AlertBar";
import ArrivalsSection from "./ArrivalsSection";
import type { Stop, StopData, Alert } from "@/lib/types";
import { REFRESH_INTERVAL_MS } from "@/lib/constants";

interface Props {
  stop: Stop;
  onRemove: () => void;
  dragHandleProps?: Record<string, unknown>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function useSecondsAgo(updatedAt: number | undefined) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (updatedAt == null) return;
    setSeconds(Math.floor((Date.now() - updatedAt) / 1000));
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - updatedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [updatedAt]);

  return seconds;
}

export default function StopCard({ stop, onRemove, dragHandleProps }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const mapEverOpened = useRef(false);
  if (mapOpen) mapEverOpened.current = true;
  const isBus = stop.type === "BUS";

  const { data, error, isValidating, mutate } = useSWR<StopData>(
    `/api/arrivals?id=${stop.id}`,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL_MS }
  );

  const alertsUrl =
    `/api/alerts?stopId=${stop.id}&type=${stop.type}` +
    `&lines=${stop.lines.join(",")}` +
    `&station=${encodeURIComponent(stop.name)}`;

  const { data: alerts, mutate: mutateAlerts } = useSWR<Alert[]>(
    alertsUrl,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL_MS }
  );

  const secondsAgo = useSecondsAgo(data?.updatedAt);

  function handleRefresh() {
    mutate();
    mutateAlerts();
  }

  function formatAge(s: number) {
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    return `${m}m ago`;
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-stretch gap-2 px-4 pt-3.5 pb-3">
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="flex items-center self-stretch -ml-1 mr-0.5 cursor-grab active:cursor-grabbing text-[#C8CBD2] hover:text-[#777D88] touch-none transition-colors"
            aria-label="Drag to reorder"
          >
            <GripVertical size={16} />
          </div>
        )}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {stop.lines.slice(0, 4).map((l) => (
              <LineBadge key={l} line={l} />
            ))}
            <span className="text-[10px] font-medium text-[#777D88] uppercase tracking-wide ml-1">
              {isBus ? "Bus" : "Subway"}
            </span>
          </div>
          <h2 className="text-[15px] font-semibold text-[#1A1D23] leading-tight">
            {stop.name}
          </h2>
        </div>
        <div className="flex flex-col items-end justify-between flex-shrink-0">
          <button
            onClick={onRemove}
            aria-label="Remove stop"
            className="text-[#777D88] hover:text-[#1A1D23]"
          >
            <X size={16} />
          </button>
          {data && (
            <button
              onClick={handleRefresh}
              disabled={isValidating}
              className="flex items-center gap-1.5 text-[11px] text-[#777D88] hover:text-[#1A1D23] transition-colors disabled:cursor-default"
              aria-label="Refresh"
            >
              <RefreshCw
                size={12}
                strokeWidth={1}
                className={isValidating ? "animate-spin" : ""}
              />
              <span>{isValidating ? "Updating…" : `Updated ${formatAge(secondsAgo)}`}</span>
            </button>
          )}
        </div>
      </div>

      <hr className="border-[#ECEDF0]" />

      {/* Alerts */}
      <AlertBar alerts={alerts ?? []} />

      <hr className="border-[#ECEDF0]" />

      {/* Map toggle — bus cards only */}
      {isBus && (
        <>
          <button
            onClick={() => setMapOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[#1A1D23] hover:bg-[#F2F4F8] transition-colors w-full text-left"
          >
            <Map size={16} className="flex-shrink-0 text-[#777D88]" />
            <span className="flex-1">{mapOpen ? "Hide map" : "Show map"}</span>
            <ChevronRight
              size={16}
              className="text-[#777D88] transition-transform duration-300"
              style={{ transform: mapOpen ? "rotate(90deg)" : "rotate(0deg)" }}
            />
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateRows: mapOpen ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease",
            }}
          >
            <div className="overflow-hidden">
              {mapEverOpened.current && (
                <div className="h-48 border-t border-b border-[#ECEDF0]">
                  {data?.stop.lat && data.stop.lon ? (
                    <BusMap lat={data.stop.lat} lon={data.stop.lon} routes={stop.lines} />
                  ) : (
                    <div className="h-full bg-[#E0E4EC] flex items-center justify-center text-[12px] text-[#777D88] font-medium">
                      Loading…
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <hr className="border-[#ECEDF0]" />
        </>
      )}

      {/* Arrivals */}
      {error && !data ? (
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-50">
            <AlertCircle size={18} className="text-orange-500" strokeWidth={1.75} />
          </div>
          <p className="text-[13px] font-semibold text-[#1A1D23]">Couldn't load arrivals</p>
          <p className="text-[12px] text-[#777D88]">Check your connection and try again</p>
          <button
            onClick={handleRefresh}
            className="mt-1 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#F2F4F8] text-[12px] font-medium text-[#1A1D23] hover:bg-[#E8ECF2] transition-colors"
          >
            <RefreshCw size={11} strokeWidth={2} />
            Retry
          </button>
        </div>
      ) : !data ? (
        <div className="px-4 py-6 text-[13px] text-[#777D88]">Loading…</div>
      ) : data.directions.length === 0 || data.directions.every((d) => d.arrivals.length === 0) ? (
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#F2F4F8]">
            <Clock size={18} className="text-[#777D88]" strokeWidth={1.75} />
          </div>
          <p className="text-[13px] font-semibold text-[#1A1D23]">No arrivals scheduled</p>
          <p className="text-[12px] text-[#777D88]">Service may have ended for the night</p>
        </div>
      ) : (
        <ArrivalsSection directions={data.directions} />
      )}

    </div>
  );
}
