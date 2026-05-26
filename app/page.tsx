"use client";
import { useState, useEffect, useRef } from "react";
import { MapPinPlus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
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
import AuthButton from "@/components/auth/AuthButton";
import AuthModal from "@/components/auth/AuthModal";
import AboutModal from "@/components/AboutModal";
import type { Stop, DashboardLibrary } from "@/lib/types";
import {
  loadLibrary,
  updateStops,
  defaultLibrary,
} from "@/lib/dashboard-storage";
import {
  loadLibraryForUser,
  saveLibraryForUser,
  migrateLocalToSupabase,
} from "@/lib/auth-storage";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [library, setLibrary]   = useState<DashboardLibrary>(defaultLibrary);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser]         = useState<User | null>(null);
  const [authModal, setAuthModal]   = useState(false);
  const [aboutModal, setAboutModal] = useState(false);
  const isLocalWriteRef           = useRef(false);

  // ── Auth init + session listener ──────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    // IMPORTANT: this callback must NOT be async, and must not call
    // supabase.from() / getSession() directly. Doing so deadlocks against the
    // internal auth lock that onAuthStateChange holds while notifying.
    // All Supabase DB work is deferred via setTimeout so it runs after the
    // callback returns and the lock is released.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUser = session?.user ?? null;
        setUser(newUser);

        if (event === "INITIAL_SESSION") {
          // Fires once on page load (signed-in or anonymous).
          // Defer DB access to outside the auth lock.
          setTimeout(async () => {
            try {
              setLibrary(await loadLibraryForUser(newUser));
            } catch {
              setLibrary(loadLibrary());
            }
            setHydrated(true);
          }, 0);
        }

        if (event === "SIGNED_IN") {
          // Fires when the user completes a sign-in flow.
          // Defer DB access to outside the auth lock.
          setTimeout(async () => {
            try {
              const localLib  = loadLibrary();
              const hasLocal  = localLib.dashboards.some((d) => d.stops.length > 0);
              const remoteLib = await loadLibraryForUser(newUser!);
              const hasRemote = remoteLib.dashboards.some((d) => d.stops.length > 0);

              if (hasLocal && !hasRemote) {
                setLibrary(await migrateLocalToSupabase(newUser!));
              } else {
                setLibrary(remoteLib);
              }
            } catch (err) {
              console.error("Sign-in library sync failed:", err);
            }
          }, 0);
        }

        if (event === "SIGNED_OUT") {
          // localStorage reads are synchronous — no lock needed.
          setLibrary(loadLibrary());
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Realtime cross-device sync ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`library:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dashboards", filter: `user_id=eq.${user.id}` },
        async () => {
          if (isLocalWriteRef.current) return; // suppress echo of our own write
          setLibrary(await loadLibraryForUser(user));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stops" },
        async () => {
          if (isLocalWriteRef.current) return;
          setLibrary(await loadLibraryForUser(user));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Derive active dashboard ────────────────────────────────────────────────
  const active = library.dashboards.find((d) => d.id === library.activeId);
  const stops  = active?.stops ?? [];

  // ── Optimistic mutate (saves to Supabase or localStorage) ─────────────────
  async function mutate(next: DashboardLibrary) {
    const prev = library; // capture for revert
    isLocalWriteRef.current = true;
    setLibrary(next);
    try {
      await saveLibraryForUser(next, user);
    } catch (err) {
      console.error("[mutate] save failed:", err);
      setLibrary(prev);
    }
    setTimeout(() => { isLocalWriteRef.current = false; }, 500);
  }

  // ── Stop CRUD ──────────────────────────────────────────────────────────────
  function addStop(stop: Stop) {
    if (stops.some((s) => s.id === stop.id)) return;
    void mutate(updateStops(library, [...stops, stop]));
  }

  function removeStop(id: string) {
    void mutate(updateStops(library, stops.filter((s) => s.id !== id)));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex  = stops.findIndex((s) => s.id === over.id);
    void mutate(updateStops(library, arrayMove(stops, oldIndex, newIndex)));
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
      <header className="bg-[#003DA5] h-16 flex items-center px-4 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <img src="/mta-logo.svg" width="36" height="36" alt="MTA" className="flex-shrink-0" />
          <span className="text-white font-semibold text-base leading-tight">
            My Transit Dashboard
          </span>
        </div>
        <AuthButton user={user} onSignInClick={() => setAuthModal(true)} />
        {authModal && <AuthModal onClose={() => setAuthModal(false)} />}
      </header>

      {/* Dashboard selector + Search bar */}
      <div className="px-4 pt-4">
        <div className="max-w-[900px] mx-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <DashboardSelector library={library} onMutate={mutate} />
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

      {/* Signature */}
      <div className="px-4 pb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setAboutModal(true)}
          className="text-[13px] text-[#777D88] hover:text-[#1A1D23] transition-colors"
        >
          created by Will Crum
        </button>
      </div>
      {aboutModal && <AboutModal onClose={() => setAboutModal(false)} />}
    </div>
  );
}
