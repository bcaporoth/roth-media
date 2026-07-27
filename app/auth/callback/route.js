import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

// Magic-link landing: exchange the emailed code for a session cookie,
// then send the client to their portal.
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (portalConfigured && code) {
    const supabase = await createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/portal", url.origin));
}
