import { NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, ADMIN_EMAIL } from "../../../../lib/supabase-admin";

// Is this email on the client roster? Lets the login screen say
// "that email isn't on file" instead of a dead-end generic error,
// and stops setup emails from minting empty accounts for typos.
export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@"))
      return NextResponse.json({ known: false });
    if (!adminConfigured) return NextResponse.json({ known: true });
    if (email === ADMIN_EMAIL) return NextResponse.json({ known: true });
    const { data } = await supabaseAdmin()
      .from("clients")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    return NextResponse.json({ known: Boolean(data) });
  } catch {
    // If the check itself breaks, never block a real client from trying.
    return NextResponse.json({ known: true });
  }
}
