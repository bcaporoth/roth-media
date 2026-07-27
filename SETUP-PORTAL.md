# Client Portal — one-time setup (~5 minutes)

The portal code is deployed but dormant: `/portal` shows "Almost ready"
until these steps are done. Nothing on the public site changes.

## 1. Create the Supabase project (free)

1. Go to [supabase.com](https://supabase.com) → sign in with GitHub.
2. **New project** → name it `roth-media`, pick the free plan, region
   `East US`. Set any database password (you won't need it day-to-day).

## 2. Run the schema

Dashboard → **SQL Editor** → **New query** → paste the entire contents of
`supabase-schema.sql` (in this repo) → **Run**.

## 3. Point auth at the live site

Dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://rothmediaco.com`
- **Redirect URLs:** add `https://rothmediaco.com/auth/callback` and
  `http://localhost:3000/auth/callback` (for local testing)

## 4. Add the env vars

Dashboard → **Project Settings → API**. Copy **Project URL** and the
**anon public** key. Then in Vercel → roth-media project → **Settings →
Environment Variables**, add both:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key |

Redeploy (Deployments → ⋯ → Redeploy). For local dev, put the same two
lines in `.env.local`.

## 5. Add your first client

Dashboard → **Table Editor**:
- `clients` → Insert row: their `email` (the one they'll sign in with) and `name`.
- `payments` → Insert row: pick the client_id, `amount_cents`
  (e.g. $1,200 → `120000`), `paid_on`, optional `note` ("Wedding deposit").
- `gallery_links` → Insert row: client_id, `title` ("Your wedding gallery"),
  `url` (Pixieset/Drive link for now), optional `note`.

That's it. They visit `rothmediaco.com/portal`, type their email, click
the emailed link, and see their galleries + payment history.

## Notes

- **Email limits:** Supabase's built-in email sender allows only a handful
  of magic-link emails per hour — fine for a client business, but if it
  ever pinches, plug in a free Resend/SMTP sender under Authentication →
  Emails.
- Clients can only *read* their own rows (enforced by row-level security);
  all editing happens through your Supabase dashboard.
- Phase 2 (album hosting on Cloudflare R2 + zip downloads) builds on this
  same schema with a `galleries`/`photos` table and signed URLs.
