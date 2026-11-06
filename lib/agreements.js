// Agreements Brandon sends one client at a time — Studio → Payments → "Send
// an agreement" makes a private /sign/<token> link; the client reads, types
// their name, and pays by Stripe on the same page. The exact text is stored
// on the row when they sign, so editing these later never changes what
// anyone already agreed to. TEMPLATES, not legal advice: have a NY/PA
// attorney read them once, then bump TEXT_VERSION.

export const TEXT_VERSION = "2026-11-05";

// Proposals (Content Day + website upkeep) are good for 10 days from when the
// link is made. Unsigned after that, the price and date come off the table:
// the sign page says so, the API refuses, Studio shows "Expired". Signed,
// paid, voided, and plain invoices (already-agreed work) never expire.
export const OFFER_DAYS = 10;
export function offerExpiry(row) {
  if (!row || row.kind === "invoice" || row.status !== "sent" || !row.created_at) return null;
  return new Date(new Date(row.created_at).getTime() + OFFER_DAYS * 86400000);
}
export const offerExpired = (row, now = Date.now()) => { const d = offerExpiry(row); return !!d && d.getTime() < now; };
export const offerDaysLeft = (row, now = Date.now()) => { const d = offerExpiry(row); return d ? Math.max(0, Math.ceil((d.getTime() - now) / 86400000)) : null; };
export const offerDate = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });
export const COMPANY = "Roth Ventures NY LLC";
export const BRAND = "Roth Media";

export const AGREEMENT_KINDS = {
  upkeep: {
    label: "Website upkeep",
    title: "Website Upkeep Agreement",
    short: "Two update sessions a month, clear requests in writing, custom monthly amount.",
    button: "Sign and pay",
  },
  shoot: {
    label: "Content Day",
    title: "Content Day Agreement",
    short: "One shoot at their place — what they get, when it's due, how they can use it (licensed), and the release. Sign and pay the package on one page.",
    button: "Sign and pay",
  },
  invoice: {
    label: "Custom invoice",
    title: "Invoice",
    short: "A one-off amount for work you already agreed on — no new terms, just pay.",
    button: "Pay",
  },
};

export const money = (cents) => `$${(Number(cents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: Number(cents) % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

// Plain text with "## " headings and "- " bullets; AgreementText renders it.
export function agreementText(kind, v = {}) {
  const client = v.business ? `${v.business}${v.client_name ? ` (${v.client_name})` : ""}` : v.client_name || "the client named on this page";
  const site = v.site_url ? ` at ${v.site_url}` : "";
  const amt = money(v.amount_cents);
  const period = v.period ? ` for ${v.period}` : "";
  if (kind === "shoot") {
    const when = v.period ? v.period : "a date we set together";
    const where = v.business ? `at ${v.business}` : "at your place of business";
    const pkg = v.note ? v.note : "the package you picked on the call — the promo, reels and photos listed in your quote";
    return `## Who this is between
This agreement is between ${COMPANY}, doing business as ${BRAND} ("Roth Media", "I", "me"), and ${client} ("you"). It covers one Content Day shoot ${where} on ${when}, and starts the day you sign it. This proposal — the price and the date — is good for ${OFFER_DAYS} days from when I sent it; unsigned after that, it's off the table and we start fresh. Plain English on purpose — if anything is unclear, just ask.

## What you get
- ${pkg}
- The Pinned Three, always: the first three posts on your Instagram, made to stay pinned at the top — (1) who you are, what you do, where you are and why; (2) why people trust you; (3) how someone takes the next step — book, order, call or walk in. Every business I shoot gets these; they're the front door to everything else you post.
- Everything is sized for Instagram, Facebook, TikTok and your website, delivered to your own client account at rothmediaco.com — a year of access, unlimited downloads.
- Delivery within two (2) weeks of the shoot. One (1) round of revisions is included; after that, extra rounds are quoted.
- Raw, unedited footage and photos are not included unless you added them to your package.

## The shoot day
- Before the day, we'll agree on what to push (products, offers, events), who's on camera, and a rough shot list. Have the people and the space ready at the start time and the day runs smooth.
- If weather or an emergency on either side forces a move, we reschedule to the next open date at no charge. You can reschedule once for any reason with at least seven (7) days' notice; inside seven days, or a second move, is a $150 rebooking fee.
- If you cancel outright with fewer than seven (7) days' notice, half the package amount is owed for the held date.

## Paying
- The package amount is ${amt}. Pay online by card, Apple Pay or Google Pay through Stripe on this page; you get a receipt by email. Payment is due before the shoot, and the date isn't locked until it's paid.
- Add-ons we agree on after this (more reels, more photos, a second promo, headshots, an extra hour) are invoiced separately before delivery.

## Who owns what, and how you can use it
- I own the copyright in everything I shoot and edit — that's standard for photographers and videographers, and it's what lets me keep the work in my portfolio.
- Once paid in full, I grant you a perpetual, worldwide, non-exclusive, royalty-free license to use the delivered photos and videos to promote your business: your social media, website, paid ads, email, print, signage, menus, listings, and the like. No expiration, no per-use fees.
- The license covers your business and the people who run it (including an agency or employee posting on your behalf). It doesn't cover selling the files, licensing them to someone else, entering them in contests as your own work, or using them for a business other than the one named here — ask first and the answer is usually yes.
- You can crop, trim and add captions or your logo. Please don't re-edit the work in a way that misrepresents what happened, and don't strip my credit from a file's metadata. A tag or credit when you post is appreciated but not required.
- Anything you give me to use (your logo, menus, music you've licensed, product shots) stays yours; you confirm you have the right to use it.

## Appearances and release
- You give me permission to film and photograph your business — the name, the storefront, the inside, the products and the work — and to use what I make in my own portfolio, website, social media and advertising. If you'd rather I didn't show a particular piece, tell me in writing and I'll pull it.
- You're responsible for making sure anyone you put on camera (you, staff, friends, customers) is okay being filmed and used this way. I'll bring a one-line release for anyone who wants to sign it; for anyone under 18, a parent or guardian signs.
- Music in your reels is licensed for social-platform use through the platforms themselves. If you want a reel for broadcast or paid placement outside those platforms, I'll swap in a track licensed for that — usually a small fee.

## The fine print
- I'll back everything up, and keep your files available for at least twelve (12) months after delivery. Please download them — after that, storage isn't guaranteed.
- Cameras, cards and drives can fail. If something is lost before delivery through no fault of yours, I'll reshoot at no charge or refund the affected part; that's the limit of what I can owe, and my total liability under this agreement is capped at the amount you paid.
- New York law applies, and in the unlikely event something can't be worked out between us, it goes to the courts of Tioga County, New York. The standard terms at rothmediaco.com/terms apply where this agreement is silent.
- Typing your name below and checking the box counts as your signature, just like ink. Thank you for trusting me with your business.`;
  }
  if (kind === "invoice") {
    return `## What this is
This is an invoice from ${COMPANY}, doing business as ${BRAND}, to ${client}${period}: ${amt}.
${v.note ? `\n## For\n${v.note}\n` : ""}
## Paying
- Pay online by card, Apple Pay or Google Pay through Stripe. You get a receipt by email.
- Payment is due on receipt. Balances unpaid after 14 days carry a 1% per month late fee, per the standard terms at rothmediaco.com/terms.
- Questions about the amount? Text Brandon before paying and it gets sorted.`;
  }
  return `## Who this is between
This agreement is between ${COMPANY}, doing business as ${BRAND} ("Roth Media", "I", "me"), and ${client} ("you"). It covers your website${site} and starts the day you sign it. This proposal is good for ${OFFER_DAYS} days from when I sent it; unsigned after that, it's off the table and we start fresh. It's written in plain English on purpose — if anything is unclear, just ask.

## What I do each month
- Up to two (2) update sessions per calendar month. A session is one batch of changes you send me, done together.
- In a session I will: change text, hours, prices, menus and other information on existing pages; add photos or videos you send me or that I shot for you; build one new landing page a month (a single page in your site's existing design, for a promotion, event, service or campaign) or change an existing one; and fix anything that isn't working.
- Also included, no session needed: keeping the site's platform, plugins and forms up to date, checking that pages load and links work, and checking with you before renewing or purchasing anything on your behalf.
- Turnaround is five (5) business days from the moment I have everything I need for a request. If something is time-sensitive, just say so and I'll let you know right away whether I can move faster.

## How to send me changes
- The easiest way is one message (text or email) per batch with what to change, which page it's on, and the final words, photos or videos to use. The more complete it is, the faster and more exactly I can match what you have in mind.
- Specific requests get the best results — "swap the hero photo for the attached one and change Friday hours to 9–3" gives me everything I need. If something's unclear, I'll check with you, and the five-day clock starts once I have what I need.
- Since I can only build what's been described, anything not mentioned in a request won't be part of that session — just send it along with the next batch and it'll get done.
- Gathering your changes into one list before sending helps make the most of your two sessions each month. Unused sessions don't carry over, so it's worth using them.
- If I spot something small that needs fixing while I'm in there, I'll handle it and let you know.

## What's not included
- A redesign or rebuild of the site, new sections that change the site's structure, or more than one new landing page a month.
- New features and systems: online stores, booking or membership systems, customer logins, integrations with other software, custom code.
- Writing new copy from scratch, logo or brand design, SEO or ad campaigns, running your social media, filming or photography.
- Hosting, domain, email, plugin, font, stock or other third-party fees — those stay in your name and on your card.
- Emergency, same-day or after-hours work.
I'm happy to do any of these — I'll just quote them separately in writing before any work starts, so there are never surprises.

## Paying
- This month's amount is ${amt}${period}. Each month I send a link with that month's amount; you pay online by card, Apple Pay or Google Pay through Stripe and get a receipt by email.
- Payment is due on receipt. If a month is still unpaid after 7 days, I'll pause work until it's settled; balances unpaid after 14 days carry a 1% per month late fee. If something comes up, just reach out — we'll work it out.
- I'll tell you in writing at least 30 days before the monthly amount changes.

## How long, and how to stop
- Month to month, no long-term commitment. Either of us can end it with 14 days' written notice (a text counts). The current month is still owed, and a month already started isn't refunded.
- If and when it ends, your site, domain, content and logins are yours — I'll hand back anything I hold and remove my access, no hard feelings.

## Access, ownership and credit
- You'll share the logins I need (site builder, hosting, domain, any connected accounts) and let me know if they change. I keep them private, use them only for your site, and never share them.
- You own your website, your content and your domain. Photos and videos I shot for you are licensed to you for your business as our shoot agreement says. I may show the work in my own portfolio and marketing unless you tell me in writing not to.
- Please only send me material you have the right to use (text, photos, logos, music, other people's likenesses) — what the site says is yours to stand behind, and I'll flag anything that looks like it could be a problem.

## The fine print
- Some things are outside my control — outages, data loss or changes caused by your hosting company, site builder, domain registrar, plugins, or anyone else with access to the site. I can't be responsible for those, but I'll always help get things back on track; depending on the size of the fix, that may use a session or be quoted separately.
- To keep this fair for both of us, my total liability under this agreement is capped at the amount you paid me in the month the problem came up.
- New York law applies, and in the unlikely event something can't be worked out between us, it goes to the courts of Tioga County, New York. The standard terms at rothmediaco.com/terms apply where this agreement is silent.
- Typing your name below and checking the box counts as your signature, just like ink. Thank you for trusting me with your site.`;
}

// Fill-in-the-blanks for the email / text Brandon sends with the link.
export function sendCopy(row, url) {
  const first = String(row.client_name || "").split(/\s+/)[0] || "there";
  const k = AGREEMENT_KINDS[row.kind] || AGREEMENT_KINDS.upkeep;
  const amt = money(row.amount_cents);
  const period = row.period ? ` for ${row.period}` : "";
  const exp = offerExpiry(row);
  const good = exp ? `\n\nOne thing: this proposal is good for ${OFFER_DAYS} days — through ${offerDate(exp)}. After that the price and the date come off the table.` : "";
  const goodSms = exp ? ` Good through ${offerDate(exp).replace(/^\w+, /, "")}.` : "";
  const body = row.kind === "shoot"
    ? `Hi ${first} — here's the Content Day agreement for ${row.business || "your shoot"}${period ? ` (${row.period})` : ""}. It spells out what you get, how you can use it (you're licensed to use everything for your business, forever), and the shoot-day basics. Read it, type your name to sign, and pay the ${amt} on the same page — that locks the date: ${url}${good}\n\nThanks!\nBrandon`
    : row.kind === "invoice"
    ? `Hi ${first} — here's the invoice${period}: ${amt}${row.note ? ` (${row.note})` : ""}. You can pay right here: ${url}\n\nThanks!\nBrandon`
    : `Hi ${first} — here's the website upkeep agreement we talked about. It covers what I do each month (two update sessions), how to send me changes, and this month's amount (${amt}${period}). Read it, type your name to sign, and pay on the same page — takes about three minutes: ${url}${good}\n\nThanks!\nBrandon`;
  const subject = row.kind === "shoot" ? `Content Day agreement — ${row.business || row.client_name}` : row.kind === "invoice" ? `Invoice${period} — ${amt}` : `Website upkeep agreement — ${row.business || row.client_name}`;
  const sms = row.kind === "shoot"
    ? `Hey ${first}! Content Day agreement — read, sign and pay the ${amt} on one page and your date's locked: ${url}${goodSms}`
    : row.kind === "invoice"
    ? `Hey ${first}! Invoice${period} (${amt}) — pay here: ${url}`
    : `Hey ${first}! Here's the website upkeep agreement — read, sign and pay this month's ${amt} on one page: ${url}${goodSms}`;
  return { subject, body, sms, title: k.title };
}
