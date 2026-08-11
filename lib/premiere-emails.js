// Premiere email HTML + the manual follow-up templates shown in Studio Admin.

const ET = "America/New_York";

export function formatReveal(revealAt) {
  if (!revealAt) return "";
  const d = new Date(revealAt);
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: ET,
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: ET,
  }).format(d);
  return `${day} at ${time} ET`;
}

function shell(inner, footerNote) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4efe6;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="background:#221f1a;border-radius:16px;padding:40px 32px;color:#faf6ee;">
    ${inner}
  </div>
  <p style="color:#8a8378;font-size:12px;line-height:1.6;text-align:center;margin-top:16px;">
    ${footerNote} Reply STOP any time and I'll take you off the list.<br/>
    Roth Media &middot; Waverly, NY &middot; <a href="https://rothmediaco.com" style="color:#8a8378;">rothmediaco.com</a>
  </p>
</div>
</body></html>`;
}

function brandHeader() {
  return `<div style="font-size:12px;letter-spacing:4px;color:#d9c7a7;margin-bottom:24px;">ROTH&nbsp;MEDIA</div>`;
}

function button(href, label) {
  return `<a href="${href}" style="display:inline-block;background:#b06a4f;color:#faf6ee;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px;margin-top:24px;">${label}</a>`;
}

// Email 1 — instantly on signup, before the reveal.
export function welcomeEmail({ firstName, galleryTitle, revealAt, watchUrl }) {
  const when = formatReveal(revealAt);
  const hi = firstName ? `${firstName}, you're` : "You're";
  return {
    subject: `You're in — ${galleryTitle} premieres ${when}`,
    html: shell(
      `${brandHeader()}
      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:#faf6ee;">${hi} on the list.</h1>
      <p style="margin:0;font-size:16px;line-height:1.6;color:#d8d2c6;">
        <strong style="color:#faf6ee;">${galleryTitle}</strong> premieres
        <strong style="color:#faf6ee;">${when}</strong>. The moment it goes live,
        the film lands right here in your inbox.
      </p>
      ${button(watchUrl, "See the countdown")}`,
      `You signed up at the premiere of ${galleryTitle}.`
    ),
  };
}

// Email 2 — at reveal time (scheduled), or instantly for post-reveal signups.
export function revealEmail({ firstName, galleryTitle, watchUrl }) {
  const hi = firstName ? `${firstName} — it's` : "It's";
  return {
    subject: `It's live — watch ${galleryTitle}`,
    html: shell(
      `${brandHeader()}
      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:#faf6ee;">${hi} live.</h1>
      <p style="margin:0;font-size:16px;line-height:1.6;color:#d8d2c6;">
        <strong style="color:#faf6ee;">${galleryTitle}</strong> just premiered.
        Grab a seat — it's worth watching on the biggest screen you've got.
      </p>
      ${button(watchUrl, "▶ Watch the film")}
      <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#8a8378;">
        Loved it? I film weddings, engagements, brands, and seniors across the
        Twin Tiers — <a href="https://rothmediaco.com/quote" style="color:#d9c7a7;">get an instant quote</a>.
      </p>`,
      `You signed up at the premiere of ${galleryTitle}.`
    ),
  };
}

// Emails 3–5 — manual templates surfaced in Studio Admin (copy, personalize, send).
export const FOLLOWUP_TEMPLATES = [
  {
    id: "behind-the-scenes",
    when: "Day 3 after the premiere",
    subject: "What you didn't see from the back of the room",
    body: `Hi {{first name}},

Quick one — while everyone was watching {{couple}}'s vows, I was tucked in the back corner with a long lens, and there's one frame from that moment I can't stop thinking about. I attached it here.

That's the part of this job I love: catching the seconds people don't know happened.

More of the day is coming to the full gallery soon. Talk soon,
Brandon
Roth Media · rothmediaco.com`,
  },
  {
    id: "referral-ask",
    when: "Day 10–14",
    subject: "Know someone getting engaged?",
    body: `Hi {{first name}},

You watched {{couple}}'s film — so you know exactly what I'd make for someone you love.

If a friend or family member is engaged (or you are!), I hold a couple of weekend dates each month for referrals from past weddings. Anyone who books through you gets a free engagement session, and you get my endless gratitude.

Two minutes gets an instant quote: rothmediaco.com/quote

Brandon
Roth Media · 845-549-4425`,
  },
  {
    id: "quarterly-reel",
    when: "Every ~3 months",
    subject: "3 favorite films from this season",
    body: `Hi {{first name}},

No ask here — just three favorite films I made this season, in case you want something beautiful with your coffee:

1. {{link one}}
2. {{link two}}
3. {{link three}}

When your moment comes — a proposal, a graduation, a business launch — you know where I am.

Brandon
Roth Media · rothmediaco.com`,
  },
];
