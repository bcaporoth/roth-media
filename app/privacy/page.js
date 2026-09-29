import LegalPage from "../../components/LegalPage";

export const metadata = {
  title: "Privacy Policy",
  description: "What Roth Media collects when you ask for a quote, enter a giveaway, or use a client gallery — and what we do with it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage kick="Privacy" title="What we collect, and what we do with it." updated="September 30, 2026">
      <h2>Who this covers</h2>
      <p>Roth Media is the video and photography business of Roth Ventures NY LLC, based in Waverly, New York. This policy covers rothmediaco.com, the client portal, shared galleries, and the emails and texts we send.</p>

      <h2>What we collect</h2>
      <p><strong>Quote requests.</strong> Your name, email, phone, event date and location, and the package you built. We use it to reply to you and to follow up about the job you asked about.</p>
      <p><strong>Giveaway entries.</strong> Your business name, your name, town, phone, email, social handle, and what you wrote. We use it to run the draw, contact the winner, and send entrants an offer related to the giveaway.</p>
      <p><strong>Same-night premiere sign-ups.</strong> When you scan a QR code at a wedding to watch the film, we collect your name and email so we can send you the link when it&apos;s ready, plus a few follow-up emails from Roth Media. Every one has a way to opt out.</p>
      <p><strong>Guest photo uploads.</strong> When you scan a QR code at a wedding to share your photos, we collect the name you enter and the photos, videos, or video messages you choose to upload. They go to the couple&apos;s private gallery and to Roth Media. We don&apos;t create an account for you or contact you afterward.</p>
      <p><strong>Client portal.</strong> Your email, a password you choose (or a temporary one we set and text you), and, on our side, your phone number and any notes that help us serve you. If someone adds you to their album, your email goes on our roster so you can log in and see it.</p>
      <p><strong>Site analytics.</strong> We use Vercel Web Analytics and our own simple visit counter. Both count page views and a handful of events (like &quot;quote sent&quot;) without cookies. Our counter records the page, the site that linked you here, your device and browser type, and your approximate city (from your internet connection). It does not store your IP address; instead it keeps a one-way code that changes every day, so we can tell visits apart without knowing who you are. If you send a form, that day&apos;s visit is linked to it so we can see which pages you looked at first.</p>
      <p><strong>Client galleries.</strong> When you open a gallery or download from it, we note that it happened (and which file), so we know your photos arrived.</p>

      <h2>How we use it</h2>
      <p>To answer you, deliver your work, and tell you about Roth Media offers you asked to hear about. We do not sell your information, and we do not share it with anyone except the services that run the site: Vercel (hosting), Supabase (database and login), Cloudflare (file storage), Resend (email), and FormSubmit (form delivery).</p>

      <h2>Texts and email</h2>
      <p>If you give us your number or email on a form, you&apos;re okay with Roth Media contacting you about that request by text and email. Reply STOP to any text, or use the opt-out line in any email, and we&apos;ll stop.</p>

      <h2>Photos and video of you</h2>
      <p>Wedding and event photos and footage are delivered to the client who hired us under a personal license (Roth Media keeps the copyright, as the terms explain) and shared through private galleries. We only use a client&apos;s footage in our own marketing with their permission (it&apos;s in the contract).</p>

      <h2>Keeping it and deleting it</h2>
      <p>We keep quote and giveaway details for up to two years, and client galleries and guest uploads for twelve months after delivery — sooner if you ask. Email <a href="mailto:brandon@rothventures.co">brandon@rothventures.co</a> to see, correct, or delete what we have about you, and we&apos;ll do it within 30 days.</p>

      <h2>Changes</h2>
      <p>If this policy changes, the date at the top changes with it.</p>
    </LegalPage>
  );
}
