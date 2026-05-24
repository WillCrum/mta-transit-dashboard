"use client";
import { useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email: string;
  onClose: () => void;
  onSettingsClick: () => void;
}

export default function AccountDropdown({ email, onClose, onSettingsClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-lg border border-[#ECEDF0] overflow-hidden z-50 min-w-[220px]"
    >
      {/* Email display */}
      <div className="px-4 py-3 border-b border-[#ECEDF0]">
        <p className="text-[12px] text-[#777D88] truncate">{email}</p>
      </div>

      {/* Actions */}
      <div className="py-1">
        <button
          type="button"
          onClick={() => { onSettingsClick(); onClose(); }}
          className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-[#1A1D23] hover:bg-[#F2F4F8] transition-colors"
        >
          Account settings
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-[#1A1D23] hover:bg-[#F2F4F8] transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
