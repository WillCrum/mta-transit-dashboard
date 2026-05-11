"use client";
import { useState, useRef, useEffect } from "react";
import { Search, SearchX, Type, Map, MapPin, X } from "lucide-react";
import type { Stop, PlaceResult } from "@/lib/types";
import MapSearchDropdownWrapper from "./MapSearchDropdownWrapper";

interface Props {
  onSelect: (stop: Stop) => void;
  selectedIds: Set<string>;
}

// When the user types "/s", results come back with GS/FS/H in their lines
// arrays. We split them into three named groups for display.
const SHUTTLE_GROUPS = [
  { code: "GS", label: "42ND ST SHUTTLE" },
  { code: "FS", label: "FRANKLIN AV SHUTTLE" },
  { code: "H",  label: "ROCKAWAY PARK SHUTTLE" },
] as const;

const PLACEHOLDERS = [
  "Search by station or bus stop name",
  'Type "/" to search by train or bus line',
];
const DISPLAY_MS  = 5000;
const FADE_OUT_MS = 500;
const FADE_IN_MS  = 250;

function StopButton({
  stop,
  onSelect,
  selectedIds,
}: {
  stop: Stop;
  onSelect: (s: Stop) => void;
  selectedIds: Set<string>;
}) {
  const already = selectedIds.has(stop.id);
  return (
    <button
      onMouseDown={() => { if (!already) onSelect(stop); }}
      disabled={already}
      className={`w-full text-left px-4 py-2.5 flex flex-col gap-0.5 transition-colors ${
        already ? "opacity-40 cursor-default" : "hover:bg-[#F2F4F8] cursor-pointer"
      }`}
    >
      <span className="text-[14px] font-medium text-[#1A1D23]">{stop.name}</span>
      <span className="text-[12px] text-[#777D88]">
        {stop.lines.join(" · ")}
        {stop.direction && ` · ${stop.direction}`}
      </span>
    </button>
  );
}

export default function SearchBar({ onSelect, selectedIds }: Props) {
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<Stop[]>([]);
  const [open, setOpen]             = useState(false);
  const [focused, setFocused]       = useState(false);
  const [noResults, setNoResults]   = useState(false);
  const [searchMode, setSearchMode] = useState<"text" | "map">("text");
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [pinLocation, setPinLocation]   = useState<PlaceResult | null>(null);

  // Animated placeholder state
  const [phIndex, setPhIndex]     = useState(0);
  const [phVisible, setPhVisible] = useState(true);

  const inputRef          = useRef<HTMLInputElement>(null);
  const debounceRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while a pointer (mouse or finger) is inside the dropdown.
  // Prevents blur from closing the dropdown during map pan/zoom on both
  // desktop (mouseenter/leave) and mobile (touchstart/touchend).
  const dropdownHoveredRef = useRef(false);

  useEffect(() => {
    // Reset the flag when touch ends anywhere — mirrors the mouseLeave path
    // for cases where touchend fires outside the dropdown element.
    const onTouchEnd = () => { dropdownHoveredRef.current = false; };
    window.addEventListener("touchend", onTouchEnd);
    return () => window.removeEventListener("touchend", onTouchEnd);
  }, []);

  // Cycle placeholder text: show → fade out → swap → fade in → repeat
  useEffect(() => {
    let tDisplay: ReturnType<typeof setTimeout>;
    let tSwap:    ReturnType<typeof setTimeout>;

    function cycle() {
      tDisplay = setTimeout(() => {
        setPhVisible(false);
        tSwap = setTimeout(() => {
          setPhIndex((i) => (i + 1) % PLACEHOLDERS.length);
          setPhVisible(true);
          cycle();
        }, FADE_OUT_MS);
      }, DISPLAY_MS);
    }

    cycle();
    return () => { clearTimeout(tDisplay); clearTimeout(tSwap); };
  }, []);

  const isLineBrowse = query.startsWith("/");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Always clear stale place suggestions when the query changes
    setPlaceResults([]);
    // NOTE: do NOT clear pinLocation here — selectPlace() calls setQuery("") to
    // reset the input, and clearing pin in this effect would immediately undo it.
    // Pin is cleared only when the user manually types (see onChange below).

    // In map mode, open even with no query so the idle map shows
    if (query.length < 2) {
      setResults([]);
      setNoResults(false);
      if (searchMode !== "map") setOpen(false);
      return;
    }

    const fetchPlaces = searchMode === "map" && !query.startsWith("/");

    debounceRef.current = setTimeout(async () => {
      const [transitData, placesData] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(query)}`).then((r) => r.json()),
        fetchPlaces
          ? fetch(`/api/geocode?q=${encodeURIComponent(query)}`).then((r) => r.json())
          : Promise.resolve([]),
      ]);
      setResults(transitData);
      setPlaceResults(placesData);
      setNoResults(transitData.length === 0 && placesData.length === 0);
      setOpen(true);
    }, 200);
  }, [query, searchMode]);

  function handleModeChange(mode: "text" | "map") {
    setSearchMode(mode);
    if (mode === "map" && focused) setOpen(true);
    // Focus the input so the user can type right away
    inputRef.current?.focus();
  }

  function select(stop: Stop) {
    if (!selectedIds.has(stop.id)) onSelect(stop);
    setQuery("");
    setResults([]);
    setPlaceResults([]);
    setNoResults(false);
    // In pin mode keep the map open so the user can add more nearby stops
    if (pinLocation) {
      setOpen(true);
    } else {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function selectPlace(place: PlaceResult) {
    setPinLocation(place);
    setPlaceResults([]);
    setQuery("");
    setResults([]);
    setNoResults(false);
    setOpen(true);
    inputRef.current?.focus();
  }

  function clearPin() {
    setPinLocation(null);
    setPlaceResults([]);
  }

  return (
    <div className="relative w-full">
      <div
        className={`flex items-center gap-3 bg-white rounded-full px-4 h-12 border transition-colors ${
          focused ? "border-[#003DA5] shadow-sm" : "border-[#ECEDF0] shadow-sm"
        }`}
      >
        <Search
          size={16}
          className={`flex-shrink-0 transition-colors ml-1 ${focused ? "text-[#003DA5]" : "text-[#777D88]"}`}
        />

        {/* Input + animated fake placeholder in the same flex cell */}
        <div className="relative flex-1 flex items-center h-full">
          <input
            ref={inputRef}
            type="text"
            placeholder=""
            value={query}
            onChange={(e) => {
              // User typed something new — clear any active pin
              if (pinLocation) setPinLocation(null);
              setQuery(e.target.value);
            }}
            onFocus={() => {
              setFocused(true);
              if (searchMode === "map" || results.length > 0 || pinLocation) setOpen(true);
            }}
            onBlur={() => { setFocused(false); setTimeout(() => { if (!dropdownHoveredRef.current) setOpen(false); }, 150); }}
            className="w-full bg-transparent text-[14px] text-[#1A1D23] outline-none"
          />

          {/* Fake placeholder — hidden once the user starts typing */}
          {!query && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center text-[14px] text-[#777D88] whitespace-nowrap overflow-hidden"
              style={{
                opacity: phVisible ? 1 : 0,
                transition: phVisible
                  ? `opacity ${FADE_IN_MS}ms ease`
                  : `opacity ${FADE_OUT_MS}ms ease`,
              }}
            >
              {PLACEHOLDERS[phIndex]}
            </span>
          )}
        </div>

        {/* Text / Map mode toggle */}
        <div className="flex items-center gap-0.5 flex-shrink-0 border-l border-[#ECEDF0] pl-2">
          <div className="relative group/tip">
            <button
              type="button"
              onMouseDown={() => handleModeChange("text")}
              aria-label="Text search"
              className={`p-1.5 rounded-md transition-colors ${
                searchMode === "text" ? "text-[#003DA5]" : "text-[#777D88] hover:text-[#1A1D23]"
              }`}
            >
              <Type size={16} />
            </button>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-[11px] font-medium text-white bg-[#1A1D23] whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-[9999]">
              Text search
            </span>
          </div>
          <div className="relative group/tip2">
            <button
              type="button"
              onMouseDown={() => handleModeChange("map")}
              aria-label="Map search"
              className={`p-1.5 rounded-md transition-colors ${
                searchMode === "map" ? "text-[#003DA5]" : "text-[#777D88] hover:text-[#1A1D23]"
              }`}
            >
              <Map size={16} />
            </button>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-[11px] font-medium text-white bg-[#1A1D23] whitespace-nowrap opacity-0 group-hover/tip2:opacity-100 transition-opacity duration-150 z-[9999]">
              Map search
            </span>
          </div>
        </div>
      </div>

      {open && (
        <div
          className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-lg overflow-hidden z-50"
          onMouseEnter={() => { dropdownHoveredRef.current = true; }}
          onMouseLeave={() => { dropdownHoveredRef.current = false; }}
          onTouchStart={() => { dropdownHoveredRef.current = true; }}
        >
          {searchMode === "map" ? (
            <>
              {/* Pin location banner */}
              {pinLocation && (
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#ECEDF0] bg-[#EEF2FA]">
                  <MapPin size={14} className="flex-shrink-0 text-[#003DA5]" />
                  <span className="flex-1 text-[13px] font-medium text-[#1A1D23] truncate">{pinLocation.label}</span>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); clearPin(); }}
                    className="flex-shrink-0 p-0.5 rounded hover:bg-[#D8E2F5] text-[#777D88] hover:text-[#1A1D23] transition-colors"
                    aria-label="Clear location"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Place autocomplete suggestions — shown above the map */}
              {placeResults.length > 0 && (
                <div className="border-b border-[#ECEDF0]">
                  <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-[#777D88] tracking-widest uppercase">
                    Places
                  </p>
                  {placeResults.map((place, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectPlace(place); }}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[#F2F4F8] transition-colors"
                    >
                      <MapPin size={14} className="flex-shrink-0 text-[#777D88]" />
                      <span className="text-[13px] text-[#1A1D23] truncate">{place.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <MapSearchDropdownWrapper
                results={results}
                isLineBrowse={isLineBrowse}
                lineCode={isLineBrowse ? query.slice(1).toUpperCase() : ""}
                onSelect={select}
                selectedIds={selectedIds}
                pinLocation={pinLocation}
              />
            </>
          ) : noResults ? (
            <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#F2F4F8]">
                <SearchX size={18} className="text-[#777D88]" strokeWidth={1.75} />
              </div>
              <p className="text-[13px] font-semibold text-[#1A1D23]">No stops found</p>
              <p className="text-[12px] text-[#777D88]">Check for typos and try again</p>
            </div>
          ) : isLineBrowse ? (
            <div className="max-h-[min(320px,50dvh)] overflow-y-auto divide-y divide-[#ECEDF0]">
              {query.toUpperCase() === "/S" ? (
                // Shuttle search — split into three named groups
                SHUTTLE_GROUPS.map(({ code, label }) => {
                  const group = results.filter((s) =>
                    s.lines.some((l) => l.toUpperCase() === code)
                  );
                  if (group.length === 0) return null;
                  return (
                    <div key={code}>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-[#777D88] tracking-widest uppercase">
                        S · {label}
                      </p>
                      <div className="divide-y divide-[#ECEDF0]">
                        {group.map((stop) => (
                          <StopButton key={stop.id} stop={stop} onSelect={select} selectedIds={selectedIds} />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Normal line-browse — flat list
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-[#777D88] tracking-widest uppercase">
                    {query.slice(1).toUpperCase()} · {results.length} stop{results.length !== 1 ? "s" : ""}
                  </p>
                  <div className="divide-y divide-[#ECEDF0]">
                    {results.map((stop) => (
                      <StopButton key={stop.id} stop={stop} onSelect={select} selectedIds={selectedIds} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-[min(320px,50dvh)] overflow-y-auto divide-y divide-[#ECEDF0]">
              {(["SUBWAY", "BUS"] as const).map((type) => {
                const group = results.filter((s) => s.type === type);
                if (group.length === 0) return null;
                return (
                  <div key={type}>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-[#777D88] tracking-widest uppercase">
                      {type}
                    </p>
                    {group.map((stop) => (
                      <StopButton key={stop.id} stop={stop} onSelect={select} selectedIds={selectedIds} />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
