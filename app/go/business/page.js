import "../../theme/business.css";
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
    <main className="cx-page cx-page--hero bz-page bz-go">
      <div className="bz-go-grid">
        <div className="bz-go-pitch">
          <p className="cx-kick bz-go-brand">Roth Media · local business content</p>
          <h1 className="cx-h1 cx-h1--long">One shoot. <br />A month of posts.</h1>
          <p className="cx-lede">A promo video, vertical reels, and photos shot at your place, for shops, gyms, restaurants, and builders across the Twin Tiers.</p>
          <a href="#plan" className="cx-btn cx-btn--light cx-btn--lg cx-btn--block bz-go-jump">Get my content plan</a>
          <video className="bz-go-video" src={videoUrl("/reels/nicole-golden-zumba-promo.mp4")} poster="/reels/nicole-golden-zumba-promo-poster.jpg" autoPlay muted loop playsInline />
          <ul className="cx-rows bz-go-prices">
            <li className="cx-row"><span className="cx-row-name">{day.name}</span><span className="cx-row-note">promo + 8 reels + 15–30 photos</span><strong className="cx-row-price"><DealPrice price={day.price} /></strong></li>
            <li className="cx-row"><span className="cx-row-name">{mini.name}</span><span className="cx-row-note">8 reels + 10–20 photos</span><strong className="cx-row-price"><DealPrice price={mini.price} /></strong></li>
          </ul>
          <p className="cx-fine bz-go-proof">★★★★★ 5.0 on Google · delivered within 2 weeks, ready to post</p>
        </div>
        <div className="bz-go-form cx-panel" id="plan">
          <p className="cx-kick">Start here</p>
          <AdLeadForm category="business" label="business" cta="Get my content plan" extra={{ label: "Business name", placeholder: "Your shop, gym, or restaurant" }} />
        </div>
      </div>
    </main>
  );
}
