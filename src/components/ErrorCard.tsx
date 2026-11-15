import { useEffect, useRef, type ReactNode } from "react";
import "../styles/error-page.css";

/* The shared look of every "something is wrong" screen: centred card, round icon, heading, text, buttons.
   Used by ErrorPage (a page crashed) and RoleGate (the account check failed). `children` goes under the buttons. */
export type Tone = "danger" | "primary" | "warning";

export default function ErrorCard({ tone, icon, title, body, actions, children }: {
  tone: Tone; icon: ReactNode; title: string; body: ReactNode; actions?: ReactNode; children?: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <main className="ep-wrap" role="alert" aria-live="assertive">
      <section className="ep-card">
        <div className={`ep-icon ep-icon-${tone}`}>{icon}</div>
        <h1 className="ep-title" tabIndex={-1} ref={heading}>{title}</h1>
        <p className="ep-body">{body}</p>
        {actions && <div className="ep-actions">{actions}</div>}
        {children}
      </section>
    </main>
  );
}

/* Shown while something is being checked (same background as the error card, so nothing jumps). */
export function CheckingScreen() {
  return (
    <div className="ep-wrap">
      <div className="ep-loading" role="status" aria-live="polite"><span className="ep-spinner" aria-hidden="true" />Loading…</div>
    </div>
  );
}
