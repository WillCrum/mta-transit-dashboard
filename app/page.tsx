"use client";
import { useState, useEffect } from "react";
import { MapPinPlus } from "lucide-react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import SearchBar from "@/components/SearchBar";
import SortableStopCard from "@/components/SortableStopCard";
import DashboardSelector from "@/components/DashboardSelector";
import type { Stop, DashboardLibrary } from "@/lib/types";
import {
  loadLibrary,
  saveLibrary,
  updateStops,
  defaultLibrary,
} from "@/lib/dashboard-storage";

export default function Home() {
  const [library, setLibrary]   = useState<DashboardLibrary>(defaultLibrary);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLibrary(loadLibrary());
    setHydrated(true);
  }, []);

  // Derive the active dashboard's stops from library state
  const active = library.dashboards.find((d) => d.id === library.activeId);
  const stops  = active?.stops ?? [];

  function mutate(next: DashboardLibrary) {
    saveLibrary(next);
    setLibrary(next);
  }

  function addStop(stop: Stop) {
    if (stops.some((s) => s.id === stop.id)) return;
    mutate(updateStops(library, [...stops, stop]));
  }

  function removeStop(id: string) {
    mutate(updateStops(library, stops.filter((s) => s.id !== id)));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex  = stops.findIndex((s) => s.id === over.id);
    mutate(updateStops(library, arrayMove(stops, oldIndex, newIndex)));
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(_event: DragStartEvent) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(40);
    }
  }

  const selectedIds = new Set(stops.map((s) => s.id));

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-[#003DA5] h-16 flex items-center justify-center px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/mta-logo.svg" width="36" height="36" alt="MTA" className="flex-shrink-0" />
          <span className="text-white font-semibold text-base leading-tight">
            My Transit Dashboard
          </span>
        </div>
      </header>

      {/* Dashboard selector + Search bar */}
      <div className="px-4 pt-4">
        <div className="max-w-[900px] mx-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <DashboardSelector library={library} onChange={setLibrary} />
          <div className="flex-1 min-w-0">
            <SearchBar onSelect={addStop} selectedIds={selectedIds} />
          </div>
        </div>
      </div>

      {/* Cards or empty state */}
      <main className="flex-1 px-4 md:px-6 pt-4 pb-8">
        {!hydrated ? null : stops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <MapPinPlus size={48} className="text-[#777D88]" strokeWidth={1.5} />
            <div>
              <p className="text-[22px] font-semibold text-[#1A1D23]">No stations added</p>
              <p className="text-[14px] text-[#777D88] mt-1">
                Add stations to your dashboard using the search bar above
              </p>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={stops.map((s) => s.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {stops.map((stop) => (
                  <SortableStopCard
                    key={stop.id}
                    stop={stop}
                    onRemove={() => removeStop(stop.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>
    </div>
  );
}
