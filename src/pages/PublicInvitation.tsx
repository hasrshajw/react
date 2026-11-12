import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicInvitation, recordInvitationView } from "../lib/publicInvitation";
import { compile } from "../lib/compileInvitation";

/* The page a customer sees at /<link-id> (and at the old /i/<link-id>). No login, no admin shell.
   The short-link route in App.tsx has no :slug param, so it passes the slug as a prop. */
export default function PublicInvitation({ slug: slugProp }: { slug?: string }) {
  const params = useParams();
  const slug = slugProp ?? params.slug ?? "";
  const [state, setState] = useState<{ status: "loading" } | { status: "missing" } | { status: "error" } | { status: "ready"; html: string; title: string }>({ status: "loading" });

  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    fetchPublicInvitation(slug).then(
      (res) => {
        if (!live) return;
        if (!res || !res.html) { setState({ status: "missing" }); return; }
        const d = { ...(res.invitation.details || {}) };
        const names = `${res.invitation.groom_name || ""} & ${res.invitation.bride_name || ""}`.trim();
        /* The preview title the owner typed wins; api/invite.js puts the same title in the HTML for crawlers. */
        const custom = typeof d.seoTitle === "string" ? d.seoTitle.trim() : "";
        const title = custom || (names !== "&" ? `${names} | Wedding invitation` : "");
        setState({ status: "ready", html: compile(res.html, d), title });
        /* Counted only after the page has loaded, and never for a missing or unpublished link (task H-4). */
        void recordInvitationView(slug);
      },
      () => { if (live) setState({ status: "error" }); },
    );
    return () => { live = false; };
  }, [slug]);

  useEffect(() => {
    if (state.status === "ready" && state.title) document.title = state.title;
  }, [state]);

  if (state.status === "ready") {
    return <iframe title="Invitation" srcDoc={state.html} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0, background: "#fff" }} />;
  }
  const text = state.status === "loading" ? "Loading invitation…"
    : state.status === "missing" ? "This invitation isn’t available. It may have been unpublished or the link is wrong."
    : "Couldn’t load the invitation. Check your connection and refresh.";
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif", color: "#44372d", background: "#fffaf2" }}>
      <p style={{ maxWidth: 360, lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}
