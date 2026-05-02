"use client";
import { useState, useRef, useEffect } from "react";
import { Search, SearchX } from "lucide-react";
import type { Stop } from "@/lib/types";

interface Props {
  onSelect: (stop: Stop) => void;
  selectedIds: Set<string>;
}

export default function SearchBar({ onSelect, selectedIds }: Props) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<Stop[]>([]);
  const [open, setOpen]         = useState(false);
  const [focused, setFocused]   = useState(false);
  const [noResults, setNoResults] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); setOpen(false); setNoResults(false); return; }

    debounceRef.current = setTimeout(async () => {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setNoResults(data.length === 0);
      setOpen(true);
    }, 200);
  }, [query]);

  function select(stop: Stop) {
    if (!selectedIds.has(stop.id)) onSelect(stop);
    setQuery("");
    setResults([]);
    setOpen(false);
    setNoResults(false);
    inputRef.current?.blur();
  }

  return (
    <div className="relative w-full">
      <div
        className={`flex items-center gap-3 bg-white rounded-full px-5 h-12 border transition-colors ${
          focused
            ? "border-[#003DA5] shadow-sm"
            : "border-[#ECEDF0] shadow-sm"
        }`}
      >
        <Search
          size={16}
          className={`flex-shrink-0 transition-colors ${focused ? "text-[#003DA5]" : "text-[#777D88]"}`}
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for a station or stop…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); results.length > 0 && setOpen(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 150); }}
          className="flex-1 bg-transparent text-[14px] text-[#1A1D23] placeholder:text-[#777D88] outline-none"
        />
      </div>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-lg overflow-hidden z-50">
          {noResults ? (
            <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#F2F4F8]">
                <SearchX size={18} className="text-[#777D88]" strokeWidth={1.75} />
              </div>
              <p className="text-[13px] font-semibold text-[#1A1D23]">No stops found</p>
              <p className="text-[12px] text-[#777D88]">Check for typos and try again</p>
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
                    {group.map((stop) => {
                      const already = selectedIds.has(stop.id);
                      return (
                        <button
                          key={stop.id}
                          onMouseDown={() => select(stop)}
                          disabled={already}
                          className={`w-full text-left px-4 py-2.5 flex flex-col gap-0.5 transition-colors ${
                            already
                              ? "opacity-40 cursor-default"
                              : "hover:bg-[#F2F4F8] cursor-pointer"
                          }`}
                        >
                          <span className="text-[14px] font-medium text-[#1A1D23]">
                            {stop.name}
                          </span>
                          <span className="text-[12px] text-[#777D88]">
                            {stop.lines.join(" · ")}
                            {stop.direction && ` · ${stop.direction}`}
                          </span>
                        </button>
                      );
                    })}
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
