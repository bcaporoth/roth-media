import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// True once the Supabase env vars are set (locally in .env.local, in prod on
// Vercel). Until then the portal renders a "coming soon" state instead of
// crashing, so deploys stay safe before setup is finished.
export const portalConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore; the callback
          // route handles session persistence.
        }
      },
    },
  });
}
