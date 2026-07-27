import fs from "fs";
import path from "path";
import Image from "next/image";
import ContactForm from "../components/ContactForm";

const PLACEHOLDER_LABELS = [
  "Short-Form Video",
  "Product — Studio",
  "Brand — On Location",
  "Behind the Scenes",
  "Product — Detail",
  "Events & People",
];

function getPhotos() {
  const photosDir = path.join(process.cwd(), "public", "photos");
  try {
    return fs
      .readdirSync(photosDir)
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort()
      .map((f) => `/photos/${f}`);
  } catch {
    return [];
  }
}

function FilmIcon() {
  return (
    <svg className="service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C3.001 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

export default function Home() {
  const photos = getPhotos();

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <a href="#top" className="nav-logo">Roth Media</a>
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#work">Work</a>
            <a href="#services">Services</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero container">
          <p className="hero-kicker">Video &amp; Photo for Local Businesses</p>
          <h1>Content people actually stop and watch.</h1>
          <p>
            Short-form video and photography for local businesses — made to
            stop the scroll, show off what you do, and bring customers
            through the door.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#contact">Start a project</a>
            <a className="btn btn-ghost" href="#work">See the work</a>
          </div>
        </section>

        <section id="work" className="section">
          <div className="container">
            <div className="section-heading">
              <h2>Selected Work</h2>
              <span>Portfolio</span>
            </div>
            <div className="work-grid">
              {photos.length > 0
                ? photos.map((src, i) => (
                    <div className="work-item" key={src}>
                      <Image
                        src={src}
                        alt={`Roth Media portfolio image ${i + 1}`}
                        width={800}
                        height={1000}
                        sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw"
                        loading={i < 3 ? "eager" : "lazy"}
                      />
                    </div>
                  ))
                : PLACEHOLDER_LABELS.map((label, i) => (
                    <div className="work-item" key={label}>
                      <div className={`work-placeholder wp-${i + 1}`}>
                        {label}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        <section id="services" className="section section-alt">
          <div className="container">
            <div className="section-heading">
              <h2>What I Make</h2>
              <span>Services</span>
            </div>
            <div className="services-grid">
              <div className="service-card">
                <FilmIcon />
                <h3>Short-Form Video</h3>
                <p>
                  Reels, TikToks, and Shorts built for how people actually
                  watch — the single most in-demand format for local
                  businesses right now.
                </p>
              </div>
              <div className="service-card">
                <CameraIcon />
                <h3>Product Photography</h3>
                <p>
                  Lighting, composition, and detail work that makes your
                  product the hero — for listings, menus, ads, and social.
                </p>
              </div>
              <div className="service-card">
                <UsersIcon />
                <h3>Brand &amp; Business</h3>
                <p>
                  The people and personality behind your business — your
                  team, your space, and the moments customers connect with.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="section">
          <div className="container">
            <div className="section-heading">
              <h2>About</h2>
              <span>Behind the Camera</span>
            </div>
            <div className="about-grid">
              <div>
                <p>
                  I&apos;m Brandon. I started behind a camera shooting
                  weddings — the kind of work where you get one chance to
                  catch the moment. Now I bring that same eye to local
                  businesses.
                </p>
                <p>
                  My favorite way to start working with someone: I&apos;ll buy
                  your product, shoot it, and send you the photos. No pitch,
                  no strings. If you love them, we talk.
                </p>
              </div>
              <div>
                <p>
                  Every business has something worth looking at. Most just
                  haven&apos;t had it filmed properly yet.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="contact">
          <div className="container contact-grid">
            <div>
              <h2>Let&apos;s make something people stop for.</h2>
              <p>
                Tell me what you sell or what you do. I&apos;ll come back
                with ideas for how to shoot it.
              </p>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>© {new Date().getFullYear()} Roth Media</span>
          <span>rothmediaco.com</span>
        </div>
      </footer>
    </>
  );
}
