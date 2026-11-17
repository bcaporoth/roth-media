// The call step (2026-11-17). After any inquiry form the person picks a call
// time on Calendly. When they do, the inquiry row remembers it:
//   submissions.utm.call = { bookedAt, event, invitee, at }
// `at` (the call's start time) is only filled in when CALENDLY_TOKEN is set.
// The thank-you email links to /call?i=<inquiry id>, which shows the same
// picker with their name filled in, so a booking from the email is caught too.
// Pure — safe to import in the browser.

export const callLink = (id, site = "https://rothmediaco.com") => `${site}/call?i=${id}`;

export const callOf = (sub) => (sub?.utm && typeof sub.utm === "object" && sub.utm.call && sub.utm.call.bookedAt ? sub.utm.call : null);

const TZ = "America/New_York";
export function callWhen(call) {
  if (!call?.at) return "";
  const d = new Date(call.at);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ });
}

// "Call booked · Thu, Nov 19, 2:00 PM" — or just "Call booked" when the time isn't known.
export function callLabel(call) {
  if (!call) return "";
  const w = callWhen(call);
  return w ? `Call booked · ${w}` : "Call booked";
}

// "What it's like to work with me": the business welcome (email + the screen
// after the business form). Plain facts about how the work runs. One list so
// the wording lives in one place.
export const WORK_TITLE = "What it's like to work with me";
export const WORK_STEPS = [
  ["We talk.", "A quick call about your business and what you want the videos to do."],
  ["You get a quote.", "Three options on one page. You pick one, sign and pay right there."],
  ["We plan the day together.", "I write the scripts and the flow of the day. You see all of it on your own page and can change anything."],
  ["I confirm the day before.", "An email with the time, the place and the plan."],
  ["I film and edit.", "Your finished videos land in your own gallery, ready to post."],
];

// The business name off an inquiry's answers, when they gave one.
export function businessOf(sub) {
  const row = (Array.isArray(sub?.fields) ? sub.fields : []).find((r) => Array.isArray(r) && /^business( name)?$/i.test(String(r[0] || "").trim()));
  return String(row?.[1] || "").trim();
}
