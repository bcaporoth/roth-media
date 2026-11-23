// Monthly social media management (Brandon, 2026-11-23). Three tiers, each
// with everything in the one before plus more. Intro prices for the first
// five businesses; after that, new clients pay `later`. Single projects and
// events stay a custom quote (lib/quotes.js). `all` spells out everything in
// a tier for the plan agreement (lib/agreements.js); billing is a Stripe
// subscription started from /sign (app/api/sign).
//
// The time budget behind these prices (Claude's stress test): about 6, 13 and
// 18 hours a month, which only works if a reel edits in ~40 minutes.

export const PLANS = [
  {
    id: "t1",
    name: "Tier 1",
    price: 300,
    later: 450,
    shoot: "A 1½-hour shoot each month",
    short: "4 reels + 10 photos, posted for you",
    get: ["4 reels and 10 photos", "8 posts a month (2 a week), with captions", "Posted for you on Instagram and Facebook"],
    all: ["A 1½-hour shoot each month", "4 reels and 10 photos", "8 posts a month (2 a week), with captions", "Posted for you on Instagram and Facebook"],
  },
  {
    id: "t2",
    name: "Tier 2",
    price: 600,
    later: 850,
    popular: true,
    shoot: "A 3-hour shoot each month",
    short: "8 reels + 20 photos, posted for you",
    get: ["Everything in Tier 1, plus:", "8 reels and 20 photos", "12 posts a month (3 a week)", "A short check-in each month: what worked, what's next"],
    all: ["A 3-hour shoot each month", "8 reels and 20 photos", "12 posts a month (3 a week), with captions", "Posted for you on Instagram and Facebook", "A short check-in each month: what worked, what's next"],
  },
  {
    id: "t3",
    name: "Tier 3",
    price: 900,
    later: 1400,
    shoot: "A half-day shoot (4 hours) each month",
    short: "12 reels + 30 photos, posted for you",
    get: ["Everything in Tier 2, plus:", "12 reels and 30 photos", "16 posts a month (4 a week)"],
    all: ["A half-day shoot (4 hours) each month", "12 reels and 30 photos", "16 posts a month (4 a week), with captions", "Posted for you on Instagram and Facebook", "A short check-in each month: what worked, what's next"],
  },
];

// Ads are an add-on, not part of any tier (Brandon, 2026-11-23: "if they
// cannot push ads they'll see it as paying for extra"). No price is set here
// yet: it is worked out with each business until Brandon gives one.
export const PLAN_ADS = {
  name: "Facebook and Instagram ads, run for you",
  say: "Ads are an add-on you can put on any tier, only if you want them. No plan makes you pay for ads you won't use.",
};

export const planById = (id) => PLANS.find((p) => p.id === id) || null;

// The rules, said plainly wherever the plans are shown.
export const PLAN_RULES = [
  "Intro prices for the first 5 businesses. After that, new clients pay $450, $850 and $1,400.",
  "3-month minimum, then month to month.",
  "Your card is charged automatically each month, starting the day you sign.",
  "One round of changes on each reel.",
  "Unused reels don't carry over to the next month.",
  "Replying to comments and messages isn't included.",
  "Ads are optional. Add them to any tier, or leave them off.",
  "If you add ads, you pay Facebook for the ad budget directly, on your own card.",
];
