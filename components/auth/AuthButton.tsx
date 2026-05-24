"use client";
import { useState, useRef } from "react";
import { User } from "lucide-react";
import { ChevronDown } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import AccountDropdown from "./AccountDropdown";
import AccountSettingsModal from "./AccountSettingsModal";

interface Props {
  user: SupabaseUser | null;
  onSignInClick: () => void;
}

export default function AuthButton({ user, onSignInClick }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const email = user?.email ?? "";
  // Truncate long emails for display
  const displayEmail = email.length > 22 ? email.slice(0, 20) + "…" : email;

  if (!user) {
    return (
      <button
        type="button"
        onClick={onSignInClick}
        className="flex items-center gap-1.5 px-3 h-8 rounded-full border border-white/40 text-white text-[13px] font-medium hover:bg-white/10 transition-colors flex-shrink-0"
      >
        <User size={14} className="flex-shrink-0" />
        <span className="hidden sm:inline">Sign up / Sign in</span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 h-8 rounded-full border border-white/40 text-white text-[13px] font-medium hover:bg-white/10 transition-colors max-w-[220px]"
      >
        <User size={14} className="flex-shrink-0" />
        <span className="truncate hidden sm:inline">{displayEmail}</span>
        <ChevronDown
          size={12}
          className={`flex-shrink-0 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
        />
      </button>

      {dropdownOpen && (
        <AccountDropdown
          email={email}
          onClose={() => setDropdownOpen(false)}
          onSettingsClick={() => setSettingsOpen(true)}
        />
      )}
      {settingsOpen && (
        <AccountSettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
