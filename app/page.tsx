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
import type { Stop } from "@/lib/types";

const STORAGE_KEY = "mta-dashboard-stops";

function loadStops(): Stop[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveStops(stops: Stop[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stops));
}

export default function Home() {
  const [stops, setStops]       = useState<Stop[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStops(loadStops());
    setHydrated(true);
  }, []);

  function addStop(stop: Stop) {
    setStops((prev) => {
      if (prev.some((s) => s.id === stop.id)) return prev;
      const next = [...prev, stop];
      saveStops(next);
      return next;
    });
  }

  function removeStop(id: string) {
    setStops((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveStops(next);
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStops((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      saveStops(next);
      return next;
    });
  }

  const sensors = useSensors(
    // Desktop: start drag after moving 8px
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Mobile: long-press 250ms (allows scroll/tap to pass through),
    // with 5px tolerance for slight finger movement during the hold
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(_event: DragStartEvent) {
    // Single haptic pulse when drag activates — matches the long-press moment
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

      {/* Search bar */}
      <div className="px-4 pt-4">
        <div className="max-w-[690px] mx-auto">
          <SearchBar onSelect={addStop} selectedIds={selectedIds} />
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
