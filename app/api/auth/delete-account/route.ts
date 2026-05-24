import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken } = await req.json();
    if (!userId || !accessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the access token — getUser(token) validates it server-side
    const { data: { user }, error: authErr } = await adminClient.auth.getUser(accessToken);
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error("Account deletion error:", deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete account route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
