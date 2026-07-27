import { createClient } from "@supabase/supabase-js";

// Service-role client — server code only. Bypasses RLS; used for the
// public share-link viewer and the admin upload API.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const adminConfigured = Boolean(url && serviceKey);

export const ADMIN_EMAIL = "b.caporoth@gmail.com";

let client;
export function supabaseAdmin() {
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}
