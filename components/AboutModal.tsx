"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function AboutModal({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
      aria-modal="true"
      role="dialog"
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#777D88] hover:text-[#1A1D23] hover:bg-[#F2F4F8] transition-colors"
        >
          <X size={16} />
        </button>

        <h2 className="text-[15px] font-semibold text-[#1A1D23] pr-8">About this project</h2>

        <div className="flex flex-col gap-3 text-[13px] text-[#777D88] leading-relaxed">
          <p>
            <em>My Transit Dashboard</em> was developed by{" "}
            <a href="https://willcrum.com/" target="_blank" rel="noopener noreferrer" className="text-[#003DA5] hover:underline">
              Will Crum
            </a>{" "}
            using Claude Code, Supabase, and Vercel. It is unaffiliated with
            New York City&apos;s MTA.
          </p>
          <p>
            For questions or feedback, get in touch at{" "}
            <a href="mailto:willacrum@gmail.com" className="text-[#003DA5] hover:underline">
              willacrum@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
