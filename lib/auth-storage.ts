/**
 * Auth-aware storage layer.
 *
 * When the user is anonymous (user === null) all reads/writes go to localStorage
 * via the existing dashboard-storage helpers.
 *
 * When signed in, reads/writes go to Supabase. The localStorage copy becomes
 * stale and is ignored while the session is active.
 */
import type { User } from "@supabase/supabase-js";
import type { DashboardLibrary, Dashboard, Stop } from "./types";
import {
  loadLibrary,
  saveLibrary,
  defaultLibrary,
  LIBRARY_KEY,
} from "./dashboard-storage";
import { createClient } from "./supabase/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export async function loadLibraryForUser(
  user: User | null
): Promise<DashboardLibrary> {
  if (!user) return loadLibrary();
  return pullFromSupabase(user);
}

export async function pullFromSupabase(user: User): Promise<DashboardLibrary> {
  const supabase = createClient();

  const { data: dashboardRows, error: dashErr } = await supabase
    .from("dashboards")
    .select("id, name, position")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (dashErr || !dashboardRows || dashboardRows.length === 0) {
    return defaultLibrary();
  }

  // Fetch all stops for this user's dashboards in one query
  const dashboardIds = dashboardRows.map((d) => d.id);
  const { data: stopRows } = await supabase
    .from("stops")
    .select(
      "id, dashboard_id, gtfs_id, name, type, lines, lat, lon, direction, position"
    )
    .in("dashboard_id", dashboardIds)
    .order("position", { ascending: true });

  // Group stops by dashboard_id
  const stopsByDashboard = new Map<string, Stop[]>();
  for (const row of stopRows ?? []) {
    if (!stopsByDashboard.has(row.dashboard_id)) {
      stopsByDashboard.set(row.dashboard_id, []);
    }
    stopsByDashboard.get(row.dashboard_id)!.push({
      id: row.gtfs_id,
      name: row.name,
      type: row.type as Stop["type"],
      lines: row.lines ?? [],
      lat: row.lat ?? undefined,
      lon: row.lon ?? undefined,
      direction: row.direction ?? undefined,
    });
  }

  const dashboards: Dashboard[] = dashboardRows.map((d) => ({
    id: d.id,
    name: d.name,
    stops: stopsByDashboard.get(d.id) ?? [],
  }));

  // Fetch active dashboard preference
  const { data: settings } = await supabase
    .from("user_settings")
    .select("active_dashboard_id")
    .eq("user_id", user.id)
    .single();

  const activeId =
    settings?.active_dashboard_id ?? dashboards[0]?.id ?? makeId();

  return { dashboards, activeId };
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

export async function saveLibraryForUser(
  lib: DashboardLibrary,
  user: User | null
): Promise<void> {
  if (!user) {
    saveLibrary(lib);
    return;
  }

  const supabase = createClient();

  // Upsert dashboards (position = array index)
  const dashboardUpserts = lib.dashboards.map((d, i) => ({
    id: d.id,
    user_id: user.id,
    name: d.name,
    position: i,
    updated_at: new Date().toISOString(),
  }));

  const { error: dashErr } = await supabase
    .from("dashboards")
    .upsert(dashboardUpserts, { onConflict: "id" });

  if (dashErr) throw new Error(`Failed to save dashboards: ${dashErr.message}`);

  // Upsert stops for each dashboard, then delete removed stops
  for (const dashboard of lib.dashboards) {
    if (dashboard.stops.length > 0) {
      const stopUpserts = dashboard.stops.map((s, i) => ({
        dashboard_id: dashboard.id,
        gtfs_id: s.id,
        name: s.name,
        type: s.type,
        lines: s.lines,
        lat: s.lat ?? null,
        lon: s.lon ?? null,
        direction: s.direction ?? null,
        position: i,
      }));

      const { error: stopErr } = await supabase
        .from("stops")
        .upsert(stopUpserts, { onConflict: "dashboard_id,gtfs_id" });

      if (stopErr)
        throw new Error(`Failed to save stops: ${stopErr.message}`);
    }

    // Delete stops that are no longer in the dashboard
    const currentGtfsIds = dashboard.stops.map((s) => s.id);
    if (currentGtfsIds.length > 0) {
      await supabase
        .from("stops")
        .delete()
        .eq("dashboard_id", dashboard.id)
        .not("gtfs_id", "in", `(${currentGtfsIds.map((id) => `"${id}"`).join(",")})`);
    } else {
      // All stops removed from this dashboard
      await supabase
        .from("stops")
        .delete()
        .eq("dashboard_id", dashboard.id);
    }
  }

  // Delete dashboards that were removed (UUIDs don't use quotes in PostgREST)
  const currentDashboardIds = lib.dashboards.map((d) => d.id);
  if (currentDashboardIds.length > 0) {
    await supabase
      .from("dashboards")
      .delete()
      .eq("user_id", user.id)
      .not("id", "in", `(${currentDashboardIds.join(",")})`);
  }

  // Update active dashboard preference
  await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      active_dashboard_id: lib.activeId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

// ---------------------------------------------------------------------------
// Migration (first sign-in: localStorage → Supabase)
// ---------------------------------------------------------------------------

export async function migrateLocalToSupabase(
  user: User
): Promise<DashboardLibrary> {
  const localLib = loadLibrary();
  const supabase = createClient();

  // Insert dashboards
  const dashboardInserts = localLib.dashboards.map((d, i) => ({
    id: d.id,               // keep the local UUID — Supabase will store it
    user_id: user.id,
    name: d.name,
    position: i,
  }));

  const { data: insertedDashboards, error: dashErr } = await supabase
    .from("dashboards")
    .upsert(dashboardInserts, { onConflict: "id" })
    .select("id");

  if (dashErr) throw new Error(`Migration failed (dashboards): ${dashErr.message}`);

  // Insert stops for each dashboard
  for (const dashboard of localLib.dashboards) {
    if (dashboard.stops.length === 0) continue;

    const stopInserts = dashboard.stops.map((s, i) => ({
      dashboard_id: dashboard.id,
      gtfs_id: s.id,
      name: s.name,
      type: s.type,
      lines: s.lines,
      lat: s.lat ?? null,
      lon: s.lon ?? null,
      direction: s.direction ?? null,
      position: i,
    }));

    const { error: stopErr } = await supabase
      .from("stops")
      .upsert(stopInserts, { onConflict: "dashboard_id,gtfs_id" });

    if (stopErr)
      throw new Error(`Migration failed (stops): ${stopErr.message}`);
  }

  // Save active preference
  await supabase.from("user_settings").upsert(
    { user_id: user.id, active_dashboard_id: localLib.activeId },
    { onConflict: "user_id" }
  );

  // Clear localStorage — the user is now cloud-synced
  if (typeof window !== "undefined") {
    localStorage.removeItem(LIBRARY_KEY);
  }

  // Return the same library (IDs are unchanged — we kept the local UUIDs)
  return localLib;
}
