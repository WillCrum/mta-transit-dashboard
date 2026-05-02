"use client";
import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Stop pin ──────────────────────────────────────────────────────────────────

const stopIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:12px;height:12px;
    background:#fff;
    border:3px solid #0d61a9;
    border-radius:50%;
    box-shadow:0 1px 4px rgba(0,0,0,.35);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// ── Bus vehicle icon (arrow pointing in bearing direction) ────────────────────

function busIcon(bearing: number, inProgress: boolean) {
  const color = inProgress ? "#0039A6" : "#A7A9AC";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <g transform="rotate(${bearing}, 14, 14)">
        <circle cx="14" cy="14" r="11" fill="${color}" stroke="#fff" stroke-width="2"/>
        <polygon points="14,4 18.5,12 9.5,12" fill="#fff"/>
      </g>
    </svg>`;
  return L.divIcon({
    className: "",
    html: svg,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// ── Fit bounds after route loads ──────────────────────────────────────────────

function FitBounds({ segments, center }: { segments: [number, number][][]; center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const all = segments.flat();
    if (all.length > 1) {
      map.fitBounds(L.latLngBounds(all), { padding: [20, 20] });
    } else {
      map.setView(center, 16);
    }
  }, [map, segments, center]);
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Vehicle {
  lat: number;
  lon: number;
  bearing: number;
  vehicleRef: string;
  inProgress: boolean;
  destination: string;
}

interface Props {
  lat: number;
  lon: number;
  route: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BusMapInner({ lat, lon, route }: Props) {
  const center: [number, number] = [lat, lon];
  const [segments, setSegments] = useState<[number, number][][]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Fetch route polyline once per route
  useEffect(() => {
    setSegments([]);
    fetch(`/api/bus-route?route=${encodeURIComponent(route)}`)
      .then((r) => r.json())
      .then((d) => { if (d.segments?.length) setSegments(d.segments); })
      .catch(() => {});
  }, [route]);

  // Fetch live vehicles, refresh every 30s
  const fetchVehicles = useCallback(() => {
    fetch(`/api/bus-vehicles?route=${encodeURIComponent(route)}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setVehicles(d); })
      .catch(() => {});
  }, [route]);

  useEffect(() => {
    fetchVehicles();
    const id = setInterval(fetchVehicles, 30_000);
    return () => clearInterval(id);
  }, [fetchVehicles]);

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Route polyline — each segment drawn separately to avoid zigzag */}
      {segments.map((seg, i) => (
        <Polyline key={i} positions={seg} color="#0039A6" weight={3} opacity={0.6} />
      ))}

      {/* Live bus positions */}
      {vehicles.map((v) => (
        <Marker
          key={v.vehicleRef}
          position={[v.lat, v.lon]}
          icon={busIcon(v.bearing, v.inProgress)}
        />
      ))}

      {/* Selected stop pin */}
      <Marker position={center} icon={stopIcon} />

      <FitBounds segments={segments} center={center} />
    </MapContainer>
  );
}
