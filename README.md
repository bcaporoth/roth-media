# Roth Media — rothmediaco.com

Video & photography for local businesses. Next.js site deployed on Vercel.

## Run locally

```bash
npm install
npm run dev
```

## Add portfolio photos

Drop `.jpg` / `.png` / `.webp` files into `public/photos/`. They show up
automatically in the "Selected Work" grid, sorted by filename
(`01-flower-shop.jpg`, `02-detail.jpg`, …). Until then the grid shows
styled placeholder tiles.

## Deploy (one-time setup)

1. Create a GitHub repo named `roth-media` and push this folder to it.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo — Vercel
   auto-detects Next.js. Deploy.
3. In the Vercel project: Settings → Domains → buy **rothmediaco.com** and
   attach it.

After that, every `git push` deploys automatically.

## Contact form

The form works out of the box by opening the visitor's email app,
pre-filled. To upgrade to real in-page submissions:

1. Create a free form at [formspree.io](https://formspree.io) pointing at
   your email.
2. In Vercel: Settings → Environment Variables, add
   `NEXT_PUBLIC_FORM_ENDPOINT` = `https://formspree.io/f/<your-id>`.
3. Redeploy.

## SEO loop (monthly)

Prompt for the monthly session with Claude:

> Review Google Search Console data for rothmediaco.com. Analyze which
> keywords we rank for and where we're stuck. Make on-site improvements
> (titles, copy, structured data, new sections) targeting top-3 rankings
> for "videographer near me", "product photography [city]", and related
> local-intent keywords. Repeat monthly.

Prerequisite: add the site to Google Search Console once it's live.
