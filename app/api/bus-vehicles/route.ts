import { NextRequest, NextResponse } from "next/server";

interface SiriVehicle {
  MonitoredVehicleJourney: {
    VehicleLocation: { Latitude: number; Longitude: number };
    Bearing: number;
    DirectionRef: string;
    DestinationName: string | string[];
    VehicleRef: string;
    ProgressRate: string;
  };
}

interface SiriVehicleResponse {
  Siri: {
    ServiceDelivery: {
      VehicleMonitoringDelivery: Array<{ VehicleActivity?: SiriVehicle[] }>;
    };
  };
}

export async function GET(req: NextRequest) {
  const route = req.nextUrl.searchParams.get("route");
  if (!route) return NextResponse.json({ error: "missing route" }, { status: 400 });

  const key = process.env.BUS_TIME_API_KEY;
  const lineRef = encodeURIComponent(`MTA NYCT_${route}`);
  const url = `https://bustime.mta.info/api/siri/vehicle-monitoring.json?key=${key}&LineRef=${lineRef}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`SIRI ${res.status}`);
    const data: SiriVehicleResponse = await res.json();

    const vehicles = data?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery?.[0]?.VehicleActivity ?? [];

    return NextResponse.json(
      vehicles.map((v) => {
        const j = v.MonitoredVehicleJourney;
        const dest = Array.isArray(j.DestinationName) ? j.DestinationName[0] : j.DestinationName;
        return {
          lat:       j.VehicleLocation.Latitude,
          lon:       j.VehicleLocation.Longitude,
          bearing:   j.Bearing ?? 0,
          direction: j.DirectionRef,
          destination: dest ?? "",
          vehicleRef: j.VehicleRef,
          inProgress: j.ProgressRate !== "noProgress",
        };
      })
    );
  } catch (err) {
    console.error("bus-vehicles error:", err);
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
