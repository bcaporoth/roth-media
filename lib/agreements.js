// Agreements Brandon sends one client at a time — Studio → Payments → "Send
// an agreement" makes a private /sign/<token> link; the client reads, types
// their name, and pays by Stripe on the same page. The exact text is stored
// on the row when they sign, so editing these later never changes what
// anyone already agreed to. TEMPLATES, not legal advice: have a NY/PA
// attorney read them once, then bump TEXT_VERSION.

export const TEXT_VERSION = "2026-10-31";
export const COMPANY = "Roth Ventures NY LLC";
export const BRAND = "Roth Media";

export const AGREEMENT_KINDS = {
  upkeep: {
    label: "Website upkeep",
    title: "Website Upkeep Agreement",
    short: "Two update sessions a month, clear requests in writing, custom monthly amount.",
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
This agreement is between ${COMPANY}, doing business as ${BRAND} ("Roth Media", "I", "me"), and ${client} ("you"). It covers your website${site} and starts the day you sign it.

## What I do each month
- Up to two (2) update sessions per calendar month. A session is one batch of changes you send me, done together.
- In a session I will: change text, hours, prices, menus and other information on existing pages; add photos or videos you send me or that I shot for you; build one new landing page a month (a single page in your site's existing design, for a promotion, event, service or campaign) or change an existing one; and fix anything that broke.
- Also included, no session needed: keeping the site's platform, plugins and forms up to date, checking that pages load and links work, and renewing nothing on your behalf without asking first.
- Turnaround is five (5) business days from the moment I have everything I need for a request. Say it's urgent and I'll tell you honestly whether I can move faster.

## How to send me changes
- Send each request in writing (text or email) in one message: what to change, which page, and the final words, photos or videos to use. "Make it pop" isn't a request; "swap the hero photo for the attached one and change Friday hours to 9–3" is.
- If a request isn't clear enough to act on, I'll ask once. The five-day clock starts when I have what I need. I can only build what you tell me — if something isn't stated, it isn't included.
- Two sessions a month means two batches. Send me a list, not a drip. Unused sessions don't roll over.
- Anything I do without a written request is my call and my risk — I'll keep it small and tell you about it.

## What's not included
- A redesign or rebuild of the site, new sections that change the site's structure, or more than one new landing page a month.
- New features and systems: online stores, booking or membership systems, customer logins, integrations with other software, custom code.
- Writing new copy from scratch, logo or brand design, SEO or ad campaigns, running your social media, filming or photography.
- Hosting, domain, email, plugin, font, stock or other third-party fees — those stay in your name and on your card.
- Emergency, same-day or after-hours work.
Any of these can happen; they're quoted separately in writing before any work starts.

## Paying
- This month's amount is ${amt}${period}. Each month I send a link with that month's amount; you pay online by card, Apple Pay or Google Pay through Stripe and get a receipt by email.
- Payment is due on receipt. If a month goes unpaid for 7 days, work pauses until it's paid. Balances unpaid after 14 days carry a 1% per month late fee.
- I'll tell you in writing at least 30 days before the monthly amount changes.

## How long, and how to stop
- Month to month. Either of us can end it with 14 days' written notice (a text counts). The current month is still owed; nothing is refunded for a month already started.
- When it ends, your site, domain, content and logins are yours — I hand back anything I hold and remove my access.

## Access, ownership and credit
- You give me the logins I need (site builder, hosting, domain, any connected accounts) and keep them current. I keep them private, use them only for your site, and don't share them.
- You own your website, your content and your domain. Photos and videos I shot for you are licensed to you for your business as our shoot agreement says. I may show the work in my own portfolio and marketing unless you tell me in writing not to.
- You confirm you have the right to use everything you send me (text, photos, logos, music, other people's likenesses) and you're responsible for what it says.

## The fine print
- I'm not responsible for outages, data loss or changes caused by your hosting company, site builder, domain registrar, plugins or other third parties, or by anyone else with access to the site. I'll help fix it; that help may count as a session or be quoted separately.
- My total liability for anything under this agreement is capped at the amount you paid me in the month the problem arose.
- New York law applies; anything that can't be sorted between us goes to the courts of Tioga County, New York. The standard terms at rothmediaco.com/terms apply where this agreement is silent.
- Typing your name below and checking the box is your signature, and it's as binding as ink.`;
}

// Fill-in-the-blanks for the email / text Brandon sends with the link.
export function sendCopy(row, url) {
  const first = String(row.client_name || "").split(/\s+/)[0] || "there";
  const k = AGREEMENT_KINDS[row.kind] || AGREEMENT_KINDS.upkeep;
  const amt = money(row.amount_cents);
  const period = row.period ? ` for ${row.period}` : "";
  const body = row.kind === "invoice"
    ? `Hi ${first} — here's the invoice${period}: ${amt}${row.note ? ` (${row.note})` : ""}. You can pay right here: ${url}\n\nThanks!\nBrandon`
    : `Hi ${first} — here's the website upkeep agreement we talked about. It covers what I do each month (two update sessions), how to send me changes, and this month's amount (${amt}${period}). Read it, type your name to sign, and pay on the same page — takes about three minutes: ${url}\n\nThanks!\nBrandon`;
  const subject = row.kind === "invoice" ? `Invoice${period} — ${amt}` : `Website upkeep agreement — ${row.business || row.client_name}`;
  const sms = row.kind === "invoice"
    ? `Hey ${first}! Invoice${period} (${amt}) — pay here: ${url}`
    : `Hey ${first}! Here's the website upkeep agreement — read, sign and pay this month's ${amt} on one page: ${url}`;
  return { subject, body, sms, title: k.title };
}
