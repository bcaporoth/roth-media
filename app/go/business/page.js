import AdLeadForm from "../../../components/AdLeadForm";
import DealPrice from "../../../components/DealPrice";
import { PACKAGES } from "../../../lib/packages";
import { videoUrl } from "../../../lib/media";

export const metadata = { title: { absolute: "Content for your business — Roth Media" }, description: "One shoot, a month of posts: a promo video, reels, and photos for Twin Tiers businesses.", robots: { index: false } };
export const revalidate = 3600;

// Where business ads land: one video, real prices, one short form.
export default function BusinessAdPage() {
  const day = PACKAGES.business.find((p) => p.id === "day");
  const mini = PACKAGES.business.find((p) => p.id === "mini");
  return (
    <main className="golead">
      <div className="golead-inner">
        <div className="golead-brand">Roth Media · local business content</div>
        <h1>One shoot. A month of posts.</h1>
        <p className="golead-sub">A promo video, vertical reels, and photos shot at your place, for shops, gyms, restaurants, and builders across the Twin Tiers.</p>
        <video className="golead-video" src={videoUrl("/reels/nicole-golden-zumba-promo.mp4")} poster="/reels/nicole-golden-zumba-promo-poster.jpg" autoPlay muted loop playsInline />
        <div className="golead-prices">
          <div><span>{day.name}<small>promo + 8 reels + 15–30 photos</small></span><strong><DealPrice price={day.price} /></strong></div>
          <div><span>{mini.name}<small>8 reels + 10–20 photos</small></span><strong><DealPrice price={mini.price} /></strong></div>
        </div>
        <p className="golead-proof">★★★★★ 5.0 on Google · delivered within 2 weeks, ready to post</p>
        <AdLeadForm category="business" label="business" cta="Get my content plan" extra={{ label: "Business name", placeholder: "Your shop, gym, or restaurant" }} />
      </div>
    </main>
  );
}
