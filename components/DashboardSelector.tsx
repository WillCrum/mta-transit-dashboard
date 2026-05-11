"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { LayoutDashboard, ChevronDown, Plus, Check, Pencil, X } from "lucide-react";
import type { DashboardLibrary } from "@/lib/types";
import {
  createDashboard,
  renameDashboard,
  deleteDashboard,
  setActiveId,
  saveLibrary,
} from "@/lib/dashboard-storage";

interface Props {
  library: DashboardLibrary;
  onChange: (lib: DashboardLibrary) => void;
}

export default function DashboardSelector({ library, onChange }: Props) {
  const [open, setOpen]           = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const active = library.dashboards.find((d) => d.id === library.activeId);
  const onlyOne = library.dashboards.length === 1;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commitRename();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, renamingId, renameValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId) {
      setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 0);
    }
  }, [renamingId]);

  function update(lib: DashboardLibrary) {
    saveLibrary(lib);
    onChange(lib);
  }

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
  }

  const commitRename = useCallback(() => {
    if (!renamingId) return;
    const name = renameValue.trim() || "Untitled";
    update(renameDashboard(library, renamingId, name));
    setRenamingId(null);
    setRenameValue("");
  }, [renamingId, renameValue, library]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRenameKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); commitRename(); }
    if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
  }

  function handleSwitch(id: string) {
    if (renamingId) return; // don't switch while renaming
    const lib = setActiveId(library, id);
    update(lib);
    setOpen(false);
  }

  function handleNew() {
    const lib = createDashboard(library);
    update(lib);
    // Enter rename mode for the new dashboard immediately
    const newDash = lib.dashboards[lib.dashboards.length - 1];
    startRename(newDash.id, newDash.name);
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (onlyOne) return;
    update(deleteDashboard(library, id));
  }

  function handleRenameClick(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    startRename(id, name);
  }

  return (
    <div ref={containerRef} className="relative w-full md:w-[220px] flex-shrink-0">
      {/* Trigger pill — matches search bar height and style */}
      <button
        type="button"
        onClick={() => { commitRename(); setOpen((v) => !v); }}
        className={`flex items-center gap-2 bg-[#F2F4F8] rounded-full px-4 h-12 border transition-colors w-full min-w-[160px] ${
          open ? "border-[#003DA5]" : "border-[#ECEDF0]"
        }`}
      >
        <LayoutDashboard
          size={16}
          className={`flex-shrink-0 transition-colors ${open ? "text-[#003DA5]" : "text-[#777D88]"}`}
        />
        <span className="flex-1 text-left text-[14px] font-semibold text-[#1A1D23] truncate">
          {active?.name ?? "Dashboard"}
        </span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-[#777D88] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-[#F2F4F8] rounded-2xl shadow-sm border border-[#ECEDF0] overflow-hidden z-50">
          {/* New dashboard */}
          <button
            type="button"
            onMouseDown={handleNew}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] font-medium text-[#003DA5] hover:bg-[#E6E8EE] transition-colors border-b border-[#DCDEE3]"
          >
            <Plus size={15} strokeWidth={2.5} />
            New dashboard
          </button>

          {/* Dashboard list */}
          <div className="py-1">
            {library.dashboards.map((dash) => {
              const isActive = dash.id === library.activeId;
              const isRenaming = renamingId === dash.id;

              return (
                <div
                  key={dash.id}
                  onClick={() => handleSwitch(dash.id)}
                  className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                    isActive ? "bg-[#E6E8EE]" : "hover:bg-[#E6E8EE]"
                  }`}
                >
                  {/* Active checkmark */}
                  <div className="w-5 flex-shrink-0 flex items-center justify-center">
                    {isActive && <Check size={14} className="text-[#003DA5]" strokeWidth={2.5} />}
                  </div>

                  {/* Name or rename input */}
                  {isRenaming ? (
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value.slice(0, 30))}
                        onBlur={commitRename}
                        onKeyDown={handleRenameKey}
                        onClick={(e) => e.stopPropagation()}
                        maxLength={30}
                        className={`w-full text-[13px] font-medium text-[#1A1D23] bg-white rounded px-1.5 py-0.5 outline-none border focus:bg-white ${
                          renameValue.length >= 30 ? "border-red-500" : "border-[#003DA5]"
                        }`}
                      />
                      {renameValue.length >= 20 && (
                        <span
                          onClick={(e) => e.stopPropagation()}
                          className={`text-[10px] text-right leading-none ${
                            renameValue.length >= 30 ? "text-red-500 font-semibold" : "text-[#777D88]"
                          }`}
                        >
                          {renameValue.length}/30
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className={`flex-1 min-w-0 text-[13px] truncate ${
                      isActive ? "font-semibold text-[#1A1D23]" : "font-medium text-[#1A1D23]"
                    }`}>
                      {dash.name}
                    </span>
                  )}

                  {/* Action buttons */}
                  {/* Desktop: hidden until hover. Mobile: visible at reduced opacity. */}
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-40 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onMouseDown={(e) => handleRenameClick(e, dash.id, dash.name)}
                      className="p-1 rounded hover:bg-[#DCDEE3] text-[#777D88] hover:text-[#1A1D23] transition-colors"
                      aria-label={`Rename ${dash.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => handleDelete(e, dash.id)}
                      disabled={onlyOne}
                      className={`p-1 rounded transition-colors ${
                        onlyOne
                          ? "opacity-30 cursor-not-allowed text-[#777D88]"
                          : "hover:bg-[#DCDEE3] text-[#777D88] hover:text-[#1A1D23]"
                      }`}
                      aria-label={`Delete ${dash.name}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
