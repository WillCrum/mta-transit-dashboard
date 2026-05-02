export type StopType = "SUBWAY" | "BUS";

export interface Stop {
  id: string;         // GTFS stop_id
  name: string;       // Display name
  type: StopType;
  lines: string[];    // e.g. ["A", "C", "E"] or ["M15", "M15 SBS"]
  lat?: number;
  lon?: number;
  direction?: string; // Bus stops only — e.g. "Downtown Bklyn Tillary St"
}

export interface Arrival {
  line: string;
  destination: string;
  minutes: number;
}

export interface DirectionArrivals {
  direction: string;  // e.g. "NORTHBOUND" or "SOUTHBOUND"
  arrivals: Arrival[];
}

export interface Alert {
  id: string;
  summary: string;
  type: "SERVICE" | "ELEVATOR";
}

export interface StopData {
  stop: Stop;
  alerts: Alert[];
  directions: DirectionArrivals[];
  updatedAt: number;  // unix ms
}
