import { transit_realtime } from "gtfs-realtime-bindings";

const BASE = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds";

// Which GTFS-RT feed carries each subway line
export const LINE_TO_FEED: Record<string, string> = {
  "1": "nyct%2Fgtfs",  "2": "nyct%2Fgtfs",  "3": "nyct%2Fgtfs",
  "4": "nyct%2Fgtfs",  "5": "nyct%2Fgtfs",  "6": "nyct%2Fgtfs",
  "7": "nyct%2Fgtfs",  "7X": "nyct%2Fgtfs", "6X": "nyct%2Fgtfs",
  // Shuttle trains: GS = 42nd St, FS = Franklin Av, H = Rockaway Park
  "GS": "nyct%2Fgtfs",
  "A": "nyct%2Fgtfs-ace", "C": "nyct%2Fgtfs-ace", "E": "nyct%2Fgtfs-ace",
  "FS": "nyct%2Fgtfs-ace", "H": "nyct%2Fgtfs-ace",
  "B": "nyct%2Fgtfs-bdfm","D": "nyct%2Fgtfs-bdfm","F": "nyct%2Fgtfs-bdfm","M": "nyct%2Fgtfs-bdfm",
  "G": "nyct%2Fgtfs-g",
  "J": "nyct%2Fgtfs-jz", "Z": "nyct%2Fgtfs-jz",
  "L": "nyct%2Fgtfs-l",
  "N": "nyct%2Fgtfs-nqrw","Q": "nyct%2Fgtfs-nqrw","R": "nyct%2Fgtfs-nqrw","W": "nyct%2Fgtfs-nqrw",
};

export const ALERTS_SUBWAY_URL  = `${BASE}/camsys%2Fsubway-alerts.json`;
export const ALERTS_BUS_URL     = `${BASE}/camsys%2Fbus-alerts.json`;
export const ELEVATOR_URL       = `${BASE}/nyct%2Fnyct_ene.json`;

/** Fetch and decode a GTFS-RT protobuf feed */
export async function fetchGtfsRt(feedPath: string): Promise<transit_realtime.FeedMessage> {
  const res = await fetch(`${BASE}/${feedPath}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`GTFS-RT fetch failed: ${res.status} ${feedPath}`);
  const buf = await res.arrayBuffer();
  return transit_realtime.FeedMessage.decode(new Uint8Array(buf));
}

/** Fetch a JSON endpoint */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

/** Unique feed paths needed for a set of lines */
export function feedsForLines(lines: string[]): string[] {
  const seen = new Set<string>();
  for (const l of lines) {
    const feed = LINE_TO_FEED[l];
    if (feed) seen.add(feed);
  }
  return [...seen];
}

/** Convert a Long or number arrival time to minutes from now */
export function toMinutes(t: number | Long | null | undefined): number | null {
  if (t == null) return null;
  const secs = typeof t === "number" ? t : (t as { low: number }).low;
  return Math.round((secs - Date.now() / 1000) / 60);
}

// Re-export Long type shim
type Long = { low: number; high: number; unsigned: boolean };
