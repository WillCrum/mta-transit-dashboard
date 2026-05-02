import { NextRequest, NextResponse } from "next/server";
import polyline from "@mapbox/polyline";

interface Trip {
  shapeId: string;
}

interface TripsResponse {
  data?: {
    references?: { trips?: Trip[] };
  };
}

interface ShapeResponse {
  data?: {
    entry?: { points: string };
  };
}

export async function GET(req: NextRequest) {
  const route = req.nextUrl.searchParams.get("route");
  if (!route) return NextResponse.json({ error: "missing route" }, { status: 400 });

  const key = process.env.BUS_TIME_API_KEY;
  const routeId = encodeURIComponent(`MTA NYCT_${route}`);

  try {
    // Step 1: get trips to find shape IDs
    const tripsUrl = `https://bustime.mta.info/api/where/trips-for-route/${routeId}.json?key=${key}&includeTripsForCurrentDay=true`;
    const tripsRes = await fetch(tripsUrl, { next: { revalidate: 3600 } });
    if (!tripsRes.ok) throw new Error(`trips-for-route ${tripsRes.status}`);
    const tripsData: TripsResponse = await tripsRes.json();

    const trips = tripsData?.data?.references?.trips ?? [];
    const shapeIds = [...new Set(trips.map((t) => t.shapeId).filter(Boolean))];

    if (shapeIds.length === 0) return NextResponse.json({ segments: [] });

    // Step 2: fetch each unique shape and decode
    const segments: [number, number][][] = [];
    await Promise.all(
      shapeIds.map(async (shapeId) => {
        const shapeUrl = `https://bustime.mta.info/api/where/shape/${encodeURIComponent(shapeId)}.json?key=${key}`;
        const shapeRes = await fetch(shapeUrl, { next: { revalidate: 3600 } });
        if (!shapeRes.ok) return;
        const shapeData: ShapeResponse = await shapeRes.json();
        const points = shapeData?.data?.entry?.points;
        if (points) segments.push(polyline.decode(points));
      })
    );

    return NextResponse.json({ segments });
  } catch (err) {
    console.error("bus-route error:", err);
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
