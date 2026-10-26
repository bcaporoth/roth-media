# Roth Media — close-out after the Oct 4, 2026 ship

State: `main` = 45c10aa, live on rothmediaco.com (Vercel deploys on push).
Today's commits, oldest first:
- 7c330e3 Cinema look on every public + client page, "you can rely on a good time" copy
- 93ece8c Studio > Clients: email optional when adding a client (lib/no-email.js stand-in address)
- 342307f Studio upgrades (Today, seven tabs, Inbox actions, delivery clock, gallery manage/delete, Stats fixes)
- 45c10aa Studio dark look by default (localStorage key `rm-admin-look-2`)

All four passed `next build`. Pages were looked at; almost nothing was *clicked* on live data. That is the gap this file closes.

## Part 1 — Brandon only (about 30 minutes)

### 1. Run three SQL files once (Supabase > SQL editor), in this order
1. `supabase/playbook.sql`
2. `supabase/guest.sql`
3. `supabase/studio-2.sql`
Then reload Studio > Today: the "run supabase/studio-2.sql" hint should be gone.

### 2. Click-tests on the live site (nothing below has been pressed yet)
Public
- [ ] /quote: build a wedding quote and send it to yourself. It should land in Studio > Inbox with the right total.
- [ ] /intake and /card: send one test each. Both should land in Inbox.
- [ ] Open one real shared album link on your phone. Play the film, download one photo.
- [ ] Log in to /portal as a client (or a test client) and open a gallery.
- [ ] Guest upload page: scan a QR sign, upload one photo from your phone.

Studio
- [ ] Clients > Add client with a name only. Row should say "no email yet".
- [ ] Type a real email on that row. Email / login buttons should switch on.
- [ ] Galleries > New gallery called "TEST DELETE ME" with 3 small files.
- [ ] On it: Manage > add 2 more files; remove 1 (type "remove"); then delete the gallery (type its title).
- [ ] Only after that works: trust delete on real albums. Delete is permanent.
- [ ] Shoots: tick a few checklist items fast, reload, confirm they stuck.
- [ ] Inbox: on a lead, try Text and Email (they open your own apps with a draft; nothing sends by itself), Open profile, Plan shoot.
- [ ] Open Studio on your phone: seven tabs fit, nothing scrolls sideways.

If any box fails: note the page + what you clicked, hand it to Claude with this file.

### 3. Content only you have
- [ ] Real open wedding dates for /weddings/open-dates
- [ ] 2–3 real client quotes (with permission) — the site has no testimonials on purpose until these exist

### 4. Housekeeping (optional)
- `_to_delete/` in the project folder holds today's patch files and tool bundle. Safe to delete in Finder.
- `.git/stale-locks/` holds leftover lock files. Safe to delete.
- Close the leftover "Push Site.command" Terminal windows.

## Part 2 — Hand to Claude Code (run it in this folder on the Mac)

Why Claude Code: on the Mac it has your git login and `.env.local`, so it can run the site locally against real services and push by itself. The cloud session could do neither.

Paste this:

```
Read CLOSE-OUT.md in this repo first. main = 45c10aa is live. Do not redesign anything.

Rules: work in this one chat, no parallel agents. Never read app/globals.css whole (6,000 lines) — grep it.
Never touch app/layout.js or package.json. Real copy, real prices (lib/packages.js, lib/deals.js), real photos only.
Commit as small separate commits. Ask before any push. Ask before anything that deletes real data.

1. Run `npm run dev` with .env.local and log in as admin. Using a throwaway client and a throwaway gallery only,
   exercise every write path added today and fix what breaks:
   add client without email -> add email (submissions/shoots follow) ; upload -> add files -> remove item -> delete gallery
   (confirm only keys under galleries/<that id>/ are deleted) ; guest upload + moderation ; shoot checklist ticks ;
   Inbox scripts / Open profile / Plan shoot ; a /quote, /intake and /card submission reaching Inbox.
2. Check Studio at 390px wide (all seven tabs + sub-tabs, light and dark look) and the public pages at 390 / 820 / 1440.
   Fix overflow or unreadable contrast only.
3. Code-review the three Studio lanes that were only build-tested: components/InboxBoard.js + app/api/admin/inbox,
   components/ShootsBoard.js + app/api/admin/shoots + lib/delivery.js, components/StatsBoard.js + lib/stats-math.js.
   Look for: lost updates, missing admin guard, anything that breaks before supabase/studio-2.sql has run.
4. Then, in order, the leftovers from the Studio review: one idempotent supabase/00-all.sql ; dead-code cleanup
   (components/PromoPill.js, components/ReelCard.js, guideItems() in lib/shoot-guides.js, duplicate KIND_LABEL / timing()) ;
   source -> leads -> booked -> dollars table on Stats ; multipart video upload.
5. Finish with: what you tested, what you changed, what is still untested.
```

## Known and accepted
- 7c330e3 shows "Unverified" on GitHub (author is Brandon, unsigned). Cosmetic. Fixing it means rewriting live history; not worth it.
- A client added without an email is stored as `<name>-<rand>@no-email.rothmediaco.invalid`. Nothing is ever emailed to those; group emails skip them.
- /classic (old homepage) and /v2 still exist, noindex.
