import { useEffect, useRef, useState } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import "../styles/error-page.css";

/* The screen people see when a page crashes (used as `errorElement` on the root route in App.tsx).
   It replaces React Router's built-in "Hey developer" page. Three situations get their own wording, because the fix differs:
   - "stale":   a code chunk could not be loaded (usually a new version was deployed while the tab was open) -> reload
   - "network": the browser could not reach the server -> check the connection, try again
   - "generic": anything else
   Plain-language text for everyone; the technical message sits behind "Technical details" so it can be copied to support. */

export type ErrorKind = "notfound" | "stale" | "network" | "generic";

const STALE = /dynamically imported module|importing a module script failed|chunkloaderror|loading chunk|loading css chunk/i;
const NETWORK = /failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected/i;

export function describeError(error: unknown): { message: string; stack: string } {
  if (isRouteErrorResponse(error)) return { message: `${error.status} ${error.statusText || ""}`.trim(), stack: "" };
  if (error instanceof Error) return { message: error.message || error.name, stack: error.stack ?? "" };
  if (typeof error === "string") return { message: error, stack: "" };
  try { return { message: JSON.stringify(error) ?? String(error), stack: "" }; } catch { return { message: String(error), stack: "" }; }
}

export function classifyError(error: unknown): ErrorKind {
  if (isRouteErrorResponse(error) && error.status === 404) return "notfound";
  const { message } = describeError(error);
  if (STALE.test(message)) return "stale";
  if (NETWORK.test(message) || (typeof navigator !== "undefined" && navigator.onLine === false)) return "network";
  return "generic";
}

const COPY: Record<ErrorKind, { title: string; body: string; primary: string }> = {
  notfound: { title: "We can't find that page", body: "The link may be wrong or the page may have moved.", primary: "Go to home" },
  stale: { title: "Please reload to continue", body: "A newer version of the app is available, or part of the page did not load. Reloading fixes it, and nothing you saved is lost.", primary: "Reload page" },
  network: { title: "Can't reach the server", body: "Check your internet connection and try again.", primary: "Try again" },
  generic: { title: "Something went wrong", body: "This page hit an unexpected problem. Reloading usually fixes it. If it keeps happening, send us the technical details below.", primary: "Reload page" },
};

function Icon({ kind }: { kind: ErrorKind }) {
  const common = { width: 34, height: 34, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kind === "network") return <svg {...common}><path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" /><path d="M12 20h.01" /><path d="M3 3l18 18" /></svg>;
  if (kind === "notfound") return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M8.5 8.5l5 5M13.5 8.5l-5 5" /></svg>;
  if (kind === "stale") return <svg {...common}><path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.6L20 15.5M20 20v-4.5h-4.5" /></svg>;
  return <svg {...common}><path d="M12 3.5l9.5 16.5h-19z" /><path d="M12 10v4.5M12 17.2h.01" /></svg>;
}

export default function ErrorPage() {
  const error = useRouteError();
  const kind = classifyError(error);
  const { message, stack } = describeError(error);
  const copy = COPY[kind];
  const heading = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("[ErrorPage]", error);
    heading.current?.focus();
  }, [error]);

  /* Everything a person can paste into a message: what happened, where and when. */
  const details = [
    `Error: ${message}`,
    `Page: ${typeof location !== "undefined" ? location.href : ""}`,
    `Time: ${new Date().toISOString()}`,
    import.meta.env.DEV && stack ? `\n${stack}` : "",
  ].filter(Boolean).join("\n");

  async function copyDetails() {
    try { await navigator.clipboard.writeText(details); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: the text is still selectable */ }
  }

  const primary = () => { if (kind === "notfound") location.assign("/"); else location.reload(); };

  return (
    <main className="ep-wrap" role="alert" aria-live="assertive">
      <section className="ep-card">
        <div className={`ep-icon ep-icon-${kind}`}><Icon kind={kind} /></div>
        <h1 className="ep-title" tabIndex={-1} ref={heading}>{copy.title}</h1>
        <p className="ep-body">{copy.body}</p>
        <div className="ep-actions">
          <button type="button" className="ep-btn ep-btn-primary" onClick={primary}>{copy.primary}</button>
          {kind !== "notfound" && <a className="ep-btn ep-btn-ghost" href="/">Go to home</a>}
        </div>
        {kind !== "notfound" && (
          <details className="ep-details">
            <summary>Technical details</summary>
            <pre className="ep-pre">{details}</pre>
            <button type="button" className="ep-copy" onClick={copyDetails}>{copied ? "Copied" : "Copy details"}</button>
          </details>
        )}
      </section>
    </main>
  );
}
