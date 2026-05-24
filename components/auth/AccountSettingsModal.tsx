"use client";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  onClose: () => void;
}

const CONFIRM_WORD = "DELETE";

export default function AccountSettingsModal({ onClose }: Props) {
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [deleted, setDeleted]           = useState(false);
  const overlayRef                      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDelete() {
    if (confirmInput !== CONFIRM_WORD) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not signed in."); setLoading(false); return; }

    const res = await fetch("/api/auth/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.user.id, accessToken: session.access_token }),
    });

    if (!res.ok) {
      setError("Deletion failed. Please try again or contact support.");
      setLoading(false);
      return;
    }

    // Sign out client-side
    await supabase.auth.signOut();
    setDeleted(true);
    setLoading(false);
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="settings-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#777D88] hover:text-[#1A1D23] hover:bg-[#F2F4F8] transition-colors"
        >
          <X size={16} />
        </button>

        <h2 id="settings-modal-title" className="text-[20px] font-semibold text-[#1A1D23] pr-8">
          Account settings
        </h2>

        {deleted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-[15px] font-semibold text-[#1A1D23]">Account deleted</p>
            <p className="text-[13px] text-[#777D88]">
              Your account and all saved dashboards have been permanently removed.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-5 py-2 rounded-full bg-[#F2F4F8] text-[14px] font-medium text-[#1A1D23] hover:bg-[#ECEDF0] transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Divider */}
            <div className="h-px bg-[#ECEDF0]" />

            {/* Danger zone */}
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[15px] font-semibold text-red-600">Delete account</p>
                <p className="text-[13px] text-[#777D88] mt-0.5">
                  Permanently deletes your account and all saved dashboards. This cannot be undone.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirm-delete" className="text-[13px] font-medium text-[#1A1D23]">
                  Type <span className="font-mono font-bold">{CONFIRM_WORD}</span> to confirm
                </label>
                <input
                  id="confirm-delete"
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={CONFIRM_WORD}
                  className="w-full h-10 px-3 rounded-xl border border-[#D2D5DA] text-[14px] font-mono text-[#1A1D23] outline-none focus:border-red-400 transition-colors"
                />
              </div>

              {error && <p className="text-[12px] text-red-600">{error}</p>}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-[#D2D5DA] text-[13px] font-medium text-[#1A1D23] hover:bg-[#F2F4F8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={confirmInput !== CONFIRM_WORD || loading}
                  className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Deleting…" : "Delete my account"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
