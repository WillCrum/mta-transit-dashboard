import { LINE_COLORS } from "@/lib/constants";

interface Props {
  line: string;
  size?: "sm" | "md";
}

export default function LineBadge({ line, size = "md" }: Props) {
  const colors = LINE_COLORS[line.toUpperCase()] ?? LINE_COLORS["BUS"];
  const isSmall = size === "sm";

  // Express trains (6X, 7X) — diamond badge
  if (/^\d+[Xx]$/.test(line)) {
    const displayText = line.slice(0, -1) + "x";
    const outer = isSmall ? 22 : 28;
    const inner = isSmall ? 16 : 20;
    const fontSize = isSmall ? 8 : 10;
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0 relative"
        style={{ width: outer, height: outer }}
      >
        <span
          className="absolute"
          style={{
            width: inner,
            height: inner,
            background: colors.bg,
            borderRadius: 2,
            transform: "rotate(45deg)",
          }}
        />
        <span
          className="relative font-bold leading-none"
          style={{ color: colors.text, fontSize }}
        >
          {displayText}
        </span>
      </span>
    );
  }

  // Single-character lines — circle
  if (line.length === 1) {
    const dim = isSmall ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-[11px]";
    return (
      <span
        className={`inline-flex items-center justify-center font-semibold rounded-full flex-shrink-0 ${dim}`}
        style={{ background: colors.bg, color: colors.text }}
      >
        {line}
      </span>
    );
  }

  // Multi-character lines (bus routes, SBS, etc.) — pill
  return (
    <span
      className={`inline-flex items-center justify-center font-semibold rounded flex-shrink-0 ${
        isSmall ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-1"
      }`}
      style={{ background: colors.bg, color: colors.text, whiteSpace: "nowrap" }}
    >
      {line}
    </span>
  );
}
