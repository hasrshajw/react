import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicInvitation } from "../lib/api";
import { compile } from "../lib/compileInvitation";

/* The page a customer sees at /i/<link-id>. No login, no admin shell. */
export default function PublicInvitation() {
  const { slug = "" } = useParams();
  const [state, setState] = useState<{ status: "loading" } | { status: "missing" } | { status: "error" } | { status: "ready"; html: string; title: string }>({ status: "loading" });

  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    fetchPublicInvitation(slug).then(
      (res) => {
        if (!live) return;
        if (!res || !res.html) { setState({ status: "missing" }); return; }
        const d = { ...(res.invitation.details || {}) };
        const title = `${res.invitation.groom_name || ""} & ${res.invitation.bride_name || ""}`.trim();
        setState({ status: "ready", html: compile(res.html, d), title });
      },
      () => { if (live) setState({ status: "error" }); },
    );
    return () => { live = false; };
  }, [slug]);

  useEffect(() => {
    if (state.status === "ready" && state.title !== "&") document.title = `${state.title} | Wedding invitation`;
  }, [state]);

  if (state.status === "ready") {
    return <iframe title="Invitation" srcDoc={state.html} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0, background: "#fff" }} />;
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
