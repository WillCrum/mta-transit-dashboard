import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NYC bounding box: west, south, east, north
const NYC_BBOX = "-74.26,40.48,-73.70,40.92";

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  };
}

function buildLabel(p: PhotonFeature["properties"]): string {
  const parts: string[] = [];
  if (p.name) parts.push(p.name);
  // For addresses: include the street number + street if available
  if (p.housenumber && p.street) {
    parts.push(`${p.housenumber} ${p.street}`);
  } else if (p.street && p.street !== p.name) {
    parts.push(p.street);
  }
  // City / borough
  if (p.city && p.city !== p.name) parts.push(p.city);
  else if (p.district && p.district !== p.name) parts.push(p.district);
  return parts.join(", ");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  try {
    const url =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
      `&limit=5&bbox=${NYC_BBOX}&lang=en`;

    const res = await fetch(url, {
      headers: { "User-Agent": "mta-transit-dashboard/1.0" },
      next: { revalidate: 60 },
    });

    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const features: PhotonFeature[] = data.features ?? [];

    const places = features
      .map((f) => ({
        label: buildLabel(f.properties),
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      }))
      .filter((p) => p.label.length > 0);

    return NextResponse.json(places);
  } catch {
    return NextResponse.json([]);
  }
}
