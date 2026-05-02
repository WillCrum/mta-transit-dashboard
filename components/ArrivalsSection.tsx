import LineBadge from "./LineBadge";
import type { Arrival, DirectionArrivals } from "@/lib/types";

interface Props {
  directions: DirectionArrivals[];
}

function TimeChip({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center justify-center bg-[#ECEDF0] rounded text-[11px] font-medium text-[#1A1D23] px-2 py-1 min-w-[46px] text-center">
      {minutes} min
    </span>
  );
}

function groupArrivals(arrivals: Arrival[]) {
  const map = new Map<string, { line: string; destination: string; times: number[] }>();
  for (const a of arrivals) {
    const key = `${a.line}|${a.destination}`;
    if (!map.has(key)) map.set(key, { line: a.line, destination: a.destination, times: [] });
    map.get(key)!.times.push(a.minutes);
  }
  return [...map.values()];
}

export default function ArrivalsSection({ directions }: Props) {
  return (
    <div className="px-4 py-3 flex flex-col gap-4">
      {directions.map((dir) => (
        <div key={dir.direction}>
          <p className="text-[10px] font-semibold text-[#777D88] tracking-wide mb-2">
            {dir.direction}
          </p>
          <div className="flex flex-col gap-2">
            {groupArrivals(dir.arrivals).map((group, i) => (
              <div key={i} className="flex items-center gap-2">
                <LineBadge line={group.line} />
                <span className="text-[13px] text-[#1A1D23] flex-1 min-w-0 truncate">
                  {group.destination}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                  {group.times.slice(0, 3).map((m, j) => (
                    <TimeChip key={j} minutes={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {directions.indexOf(dir) < directions.length - 1 && (
            <hr className="mt-3 border-[#ECEDF0]" />
          )}
        </div>
      ))}
    </div>
  );
}
