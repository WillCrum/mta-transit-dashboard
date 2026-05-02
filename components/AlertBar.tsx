"use client";
import { useState, useRef, useEffect } from "react";
import { ArrowUpDown } from "lucide-react";
import type { Alert } from "@/lib/types";

interface Props {
  alerts: Alert[];
}

const ALERT_STYLES: Record<
  Alert["type"],
  { bg: string; border: string; textColor: string }
> = {
  SERVICE:  {
    bg: "bg-[#FFF6EB]",
    border: "border-l-[3px] border-[#FF6319]",
    textColor: "#9A3B00",
  },
  ELEVATOR: {
    bg: "bg-[#FFFDE2]",
    border: "border-l-[3px] border-[#FCCC0A]",
    textColor: "#6B4E00",
  },
};

function AlertIcon({ type, textColor }: { type: Alert["type"]; textColor: string }) {
  if (type === "ELEVATOR") {
    return <ArrowUpDown size={16} className="flex-shrink-0 mt-0.5" style={{ color: textColor }} />;
  }
  // Inline SVG: solid filled triangle with exclamation, CSS-colorable
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      className="flex-shrink-0 mt-0.5"
      aria-label="Warning"
      role="img"
    >
      <path d="M8 1 L15.5 14.5 L0.5 14.5 Z" fill="#CC6600" />
      <rect x="7.2" y="5.5" width="1.6" height="4.5" rx="0.8" fill="white" />
      <circle cx="8" cy="12.5" r="0.9" fill="white" />
    </svg>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const [expanded, setExpanded]   = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef                   = useRef<HTMLParagraphElement>(null);
  const styles                    = ALERT_STYLES[alert.type];

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [alert.summary]);

  return (
    <div className={`px-4 py-2.5 ${styles.bg} ${styles.border}`}>
      <div className="flex items-start gap-2">
        <AlertIcon type={alert.type} textColor={styles.textColor} />
        <div className="min-w-0">
          <p
            ref={textRef}
            className={`text-[13px] leading-5 ${!expanded ? "line-clamp-2" : ""}`}
            style={{ color: styles.textColor }}
          >
            {alert.summary}
          </p>
          {overflows && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-[12px] underline underline-offset-2"
              style={{ color: styles.textColor }}
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertBar({ alerts }: Props) {
  const elevatorAlerts = alerts.filter((a) => a.type === "ELEVATOR");
  const serviceAlerts  = alerts.filter((a) => a.type === "SERVICE");
  const orderedAlerts  = [...elevatorAlerts, ...serviceAlerts];

  if (orderedAlerts.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F6FCF7]">
        <span className="w-2 h-2 rounded-full bg-[#00933C] flex-shrink-0" />
        <span className="text-[13px] text-[#00933C]">No active service alerts</span>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#ECEDF0]">
      {orderedAlerts.map((a) => (
        <AlertItem key={a.id} alert={a} />
      ))}
    </div>
  );
}
