import { useEffect } from "react";
import { Link } from "react-router-dom";
import schedyMark from "../assets/schedy-mark.svg";
import landingCss from "../features/landing/landing.css?inline";
import { getSession } from "../lib/session";
import { preloadAdmin, preloadLogin } from "../lib/preload";

const FEATURES = [
  { icon: "A", title: "English and తెలుగు", text: "Write your invitation in English or Telugu. Names and details are transliterated for you." },
  { icon: "↗", title: "Share as a simple link", text: "Every invitation gets its own short link. Send it by link, WhatsApp or QR code." },
  { icon: "◎", title: "Your own link preview", text: "Choose the title, text and picture guests see when the link is shared on WhatsApp or Instagram." },
  { icon: "✎", title: "Live preview", text: "See the invitation change as you type, then publish when it looks right." },
];

const STEPS = [
  { n: "1", title: "Pick a template", text: "Start from a ready-made wedding invitation design." },
  { n: "2", title: "Add your details", text: "Fill in the families, the couple, the venue and the events." },
  { n: "3", title: "Share the link", text: "Publish and send it to your guests in one tap." },
];

export default function Landing() {
  const session = getSession(); /* cached login only; the admin app re-checks it with the server */

  /* Signed-in owners almost always go to the dashboard next: fetch it quietly once the page is idle. */
  useEffect(() => {
    if (!session) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(preloadAdmin); else setTimeout(preloadAdmin, 2000);
  }, [session]);

  return (
    <div className="lp">
      <style>{landingCss}</style>

      <header className="lp-nav">
        <div className="lp-wrap">
          <Link to="/" className="lp-brand" aria-label="Schedy home">
            <span className="lp-mark"><img src={schedyMark} alt="" /></span>
            Schedy
          </Link>

          <nav className="lp-links" aria-label="Main">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
          </nav>

          {session
            ? <Link to="/dashboard" className="lp-login" onMouseEnter={preloadAdmin} onFocus={preloadAdmin} onTouchStart={preloadAdmin}>Dashboard</Link>
            : <Link to="/login" className="lp-login" onMouseEnter={preloadLogin} onFocus={preloadLogin} onTouchStart={preloadLogin}>Login</Link>}
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap">
            <span className="lp-pill">Digital wedding invitations</span>
            <h1>Beautiful wedding invitations, shared as a link</h1>
            <p>Create your invitation in minutes and send it to every guest by link, WhatsApp or QR code.</p>
            <Link to={session ? "/dashboard" : "/login"} className="lp-cta">
              {session ? "Go to dashboard" : "Get started"}
            </Link>
          </div>
        </section>

        <section className="lp-sec alt" id="features">
          <div className="lp-wrap">
            <h2>Everything you need for your invitation</h2>
            <p className="lp-sub">Simple to create, easy to share and made to look good on every phone.</p>
            <div className="lp-grid">
              {FEATURES.map((f) => (
                <div className="lp-card" key={f.title}>
                  <div className="lp-ic" aria-hidden="true">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec" id="how">
          <div className="lp-wrap">
            <h2>How it works</h2>
            <p className="lp-sub">From template to guests in three steps.</p>
            <div className="lp-grid">
              {STEPS.map((s) => (
                <div className="lp-card" key={s.n}>
                  <div className="lp-ic" aria-hidden="true">{s.n}</div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-end">
          <div className="lp-wrap">
            <h2>Ready to invite your guests?</h2>
            <p>Log in and create your first invitation.</p>
            <Link to={session ? "/dashboard" : "/login"} className="lp-cta">
              {session ? "Go to dashboard" : "Login"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="lp-foot">© {new Date().getFullYear()} Schedy</footer>
    </div>
  );
}
