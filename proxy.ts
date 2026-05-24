import { type NextRequest, NextResponse } from "next/server";

// Session refresh is handled client-side by @supabase/supabase-js (localStorage).
// This proxy is a no-op pass-through kept only so the matcher still runs.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
