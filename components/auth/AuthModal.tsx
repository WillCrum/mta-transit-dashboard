"use client";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  onClose: () => void;
}

export default function AuthModal({ onClose }: Props) {
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [sent, setSent]         = useState(false);
  const overlayRef              = useRef<HTMLDivElement>(null);
  const firstFocusRef           = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key
  useEffect(() => {
    firstFocusRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError("Google sign-in failed. Please try again."); setLoading(false); }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      // Supabase error code for email already registered with a different provider
      if (error.message.toLowerCase().includes("provider")) {
        setError("An account with this email already exists. Try signing in with Google.");
      } else {
        setError("Failed to send email. Please try again.");
      }
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-5">
        {/* Close */}
        <button
          ref={firstFocusRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#777D88] hover:text-[#1A1D23] hover:bg-[#F2F4F8] transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="pr-8">
          <h2 id="auth-modal-title" className="text-[20px] font-semibold text-[#1A1D23]">
            Sign up or sign in
          </h2>
          <p className="text-[13px] text-[#777D88] mt-1">
            Create a user account to access the same set of dashboards across all your devices. Delete your account at any time.
          </p>
        </div>

        {sent ? (
          /* Confirmation state */
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EEF2FA] flex items-center justify-center text-2xl">
              📬
            </div>
            <p className="text-[15px] font-semibold text-[#1A1D23]">Check your inbox</p>
            <p className="text-[13px] text-[#777D88]">
              We sent a magic link to <span className="font-medium text-[#1A1D23]">{email}</span>.
              Click it to sign in.
            </p>
            <button
              type="button"
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-[13px] text-[#003DA5] hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            {/* Google */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="flex items-center justify-center gap-3 w-full h-11 rounded-full border border-[#D2D5DA] bg-white hover:bg-[#F2F4F8] transition-colors text-[14px] font-medium text-[#1A1D23] disabled:opacity-50"
            >
              {/* Google G logo */}
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#ECEDF0]" />
              <span className="text-[12px] text-[#777D88]">or</span>
              <div className="flex-1 h-px bg-[#ECEDF0]" />
            </div>

            {/* Magic link form */}
            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="auth-email" className="text-[13px] font-medium text-[#1A1D23]">
                  Use email address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 px-3 rounded-xl border border-[#D2D5DA] text-[14px] text-[#1A1D23] placeholder:text-[#B0B4BC] outline-none focus:border-[#003DA5] transition-colors"
                />
              </div>

              {error && (
                <p className="text-[12px] text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-11 rounded-full bg-[#003DA5] hover:bg-[#002d7a] text-white text-[14px] font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>

            {/* Consent */}
            <p className="text-[11px] text-[#777D88] text-center">
              By continuing, you agree to our{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1A1D23]">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1A1D23]">
                Privacy Policy
              </a>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}
