import type { Stop, Dashboard, DashboardLibrary } from "./types";

export const LIBRARY_KEY = "mta-dashboard-library";
const LEGACY_KEY = "mta-dashboard-stops";

function makeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function defaultLibrary(): DashboardLibrary {
  const id = makeId();
  return { dashboards: [{ id, name: "Home", stops: [] }], activeId: id };
}

export function loadLibrary(): DashboardLibrary {
  if (typeof window === "undefined") return defaultLibrary();
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) return JSON.parse(raw) as DashboardLibrary;

    // Migrate from the old single-dashboard format
    const legacy = localStorage.getItem(LEGACY_KEY);
    const stops: Stop[] = legacy ? (JSON.parse(legacy) as Stop[]) : [];
    const id = makeId();
    const lib: DashboardLibrary = {
      dashboards: [{ id, name: "Home", stops }],
      activeId: id,
    };
    saveLibrary(lib);
    localStorage.removeItem(LEGACY_KEY);
    return lib;
  } catch {
    return defaultLibrary();
  }
}

export function saveLibrary(lib: DashboardLibrary): void {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
}

export function createDashboard(lib: DashboardLibrary, name = "New dashboard"): DashboardLibrary {
  const id = makeId();
  const dashboard: Dashboard = { id, name, stops: [] };
  return { dashboards: [...lib.dashboards, dashboard], activeId: id };
}

export function renameDashboard(lib: DashboardLibrary, id: string, name: string): DashboardLibrary {
  return {
    ...lib,
    dashboards: lib.dashboards.map((d) => (d.id === id ? { ...d, name } : d)),
  };
}

export function deleteDashboard(lib: DashboardLibrary, id: string): DashboardLibrary {
  if (lib.dashboards.length <= 1) return lib; // never delete the last one
  const dashboards = lib.dashboards.filter((d) => d.id !== id);
  const activeId = lib.activeId === id ? dashboards[0].id : lib.activeId;
  return { dashboards, activeId };
}

export function setActiveId(lib: DashboardLibrary, activeId: string): DashboardLibrary {
  return { ...lib, activeId };
}

export function updateStops(lib: DashboardLibrary, stops: Stop[]): DashboardLibrary {
  return {
    ...lib,
    dashboards: lib.dashboards.map((d) =>
      d.id === lib.activeId ? { ...d, stops } : d
    ),
  };
}
