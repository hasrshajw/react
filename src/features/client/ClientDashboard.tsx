import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CalendarDays, CheckCircle2, Check, Clock, Copy, ExternalLink, Eye, Mails, Pencil } from "../../components/Icons";
import { Loading, SkText } from "../../components/Skeleton";
import { ADMIN_EMAIL } from "../../lib/config";
import { dayDiff, fmt, fmtDate, fmtDateTime, timeAgo } from "../../lib/dashboardData";
import { has } from "../../lib/validate";
import type { MyInvitation } from "../../lib/api";
import { CLIENT_STATUS_LABEL, clientStatus, invitationToForm } from "./invitationToForm";
import { publicUrlOf, useClientData } from "./clientContext";

/* The client's home: how the invitation is doing (views, countdown, review state) and the shortcuts they need. */

const coupleOf = (i: MyInvitation) => [i.groomName, i.brideName].filter(Boolean).join(" & ") || "Your invitation";

function countdown(date: string | null): { value: string; sub: string } {
  const n = dayDiff(date);
  if (n === null) return { value: "—", sub: "Wedding date not set" };
  if (n === 0) return { value: "Today", sub: "It’s the big day" };
  if (n < 0) return { value: "Done", sub: `${Math.abs(n)} day${Math.abs(n) === 1 ? "" : "s"} ago` };
  return { value: fmt(n), sub: n === 1 ? "day to go" : "days to go" };
}

/* The checklist's labels are fixed text, so the placeholder shows them as they are (only which ones are ticked is data). */
const CHECK_LABELS = ["Wedding date & time", "Groom’s details", "Bride’s details", "Venue", "Events & schedule", "Share preview (SEO)"] as const;

/* The dashboard as it will look: the same header, four summary cards and two panels. Fixed text (headings, labels, button names) is shown as is;
   only what comes from the server (names, numbers, dates, the link, ticks) is a ghost. */
function Skeleton() {
  const stats: [typeof Eye, string][] = [[Eye, "Total views"], [CalendarDays, "Wedding countdown"], [CheckCircle2, "Status"], [Clock, "Last updated"]];
  return (
    <div className="cd" aria-busy="true">
      <Loading label="Loading your invitation" />
      <header className="cd-head" aria-hidden="true">
        <div>
          <h1><SkText w={20} /></h1>
          <p><SkText w={24} /></p>
        </div>
        <div className="cd-head-actions">
          <span className="cd-btn sk-bg"><ExternalLink size={16} /> View invitation</span>
          <span className="cd-btn primary sk-bg"><Pencil size={16} /> Edit</span>
        </div>
      </header>

      <section className="cd-stats" aria-hidden="true">
        {stats.map(([Icon, label], i) => (
          <div className="cd-stat" key={label}>
            <span className="cd-ico"><Icon size={19} /></span>
            <div>
              <small>{label}</small>
              <strong>{i === 2 ? <span className="cd-pill sk-bg">Published</span> : <SkText w={i === 3 ? 9 : 5} />}</strong>
              <em><SkText w={i === 0 ? 18 : 14} /></em>
            </div>
          </div>
        ))}
      </section>

      <div className="cd-cols" aria-hidden="true">
        <section className="cd-card">
          <h2>Your invitation link</h2>
          <p className="cd-note">Share this link with your guests.</p>
          <div className="cd-link">
            <input className="sk-bg" readOnly tabIndex={-1} value="" aria-label="Invitation link" />
            <span className="cd-btn sk-bg"><Copy size={16} /> Copy</span>
          </div>
          <dl className="cd-facts">
            {["Date", "Venue", "Events", "Created"].map((k) => <div key={k}><dt>{k}</dt><dd><SkText w={k === "Events" ? 3 : 12} /></dd></div>)}
          </dl>
        </section>

        <section className="cd-card">
          <h2>Changes &amp; review</h2>
          <p className="cd-note"><SkText w={44} /><br /><SkText w={30} /></p>
          <div className="cd-progress">
            <div className="cd-progress-top"><b>Details completed</b><span><SkText w={6} /></span></div>
            <div className="cd-bar"><i style={{ width: 0 }} /></div>
            <ul className="cd-checks">
              {CHECK_LABELS.map((label) => <li key={label}><span className="sk-bg" />{label}</li>)}
            </ul>
          </div>
          <span className="cd-btn primary wide sk-bg"><Pencil size={16} /> Open editor</span>
        </section>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const { list, loading, error, reload, selectedId, select } = useClientData();
  const inv = list?.find((i) => i.id === selectedId) ?? null;
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(t); }, []);
  useEffect(() => {
    if (!inv) return;
    const prev = document.title;
    document.title = `Dashboard · Schedy`;
    return () => { document.title = prev; };
  }, [inv]);

  const form = useMemo(() => (inv ? invitationToForm(inv) : null), [inv]);
  const checks = useMemo(() => {
    if (!form) return [];
    return [
      { label: CHECK_LABELS[0], done: has(form.weddingDate) },
      { label: CHECK_LABELS[1], done: has(form.groomEn) },
      { label: CHECK_LABELS[2], done: has(form.brideEn) },
      { label: CHECK_LABELS[3], done: has(form.venueEn) || has(form.venueAddress) },
      { label: CHECK_LABELS[4], done: form.events.length > 0 },
      { label: CHECK_LABELS[5], done: has(form.seoTitle) || has(form.seoDescription) || has(form.seoImage) },
    ];
  }, [form]);

  if (loading && !list) return <Skeleton />;
  if (error || !list) {
    return (
      <div className="cd-empty" role="alert">
        <AlertCircle size={28} />
        <h2>We couldn’t load your invitation</h2>
        <p>Check your connection and try again.</p>
        <button type="button" className="cd-btn primary" onClick={reload}>Try again</button>
      </div>
    );
  }
  if (!inv) {
    return (
      <div className="cd-empty">
        <Mails size={30} />
        <h2>No invitations to show</h2>
        <p>Please sign in with the email address your invitation was set up with.</p>
        {ADMIN_EMAIL && <a className="cd-btn" href={`mailto:${ADMIN_EMAIL}`}>Contact the admin</a>}
      </div>
    );
  }

  const st = clientStatus(inv);
  const url = publicUrlOf(inv);
  const left = countdown(inv.eventDate);
  const doneCount = checks.filter((c) => c.done).length;
  const pct = checks.length ? Math.round((doneCount / checks.length) * 100) : 0;
  const editTo = `/my/${encodeURIComponent(inv.id)}`;
  const req = inv.request;
  const copy = () => {
    void navigator.clipboard?.writeText(url).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }, () => {});
  };

  return (
    <div className="cd">
      <header className="cd-head">
        <div>
          <h1>{coupleOf(inv)}</h1>
          <p>{inv.eventDate ? `Wedding on ${fmtDate(inv.eventDate)}` : "Here’s how your invitation is doing."}</p>
        </div>
        <div className="cd-head-actions">
          {list.length > 1 && (
            <label className="cd-pick">
              <span className="cd-sr">Invitation</span>
              <select value={inv.id} onChange={(e) => select(e.target.value)}>
                {list.map((i) => <option key={i.id} value={i.id}>{coupleOf(i)}</option>)}
              </select>
            </label>
          )}
          <a className={`cd-btn${inv.published ? "" : " disabled"}`} href={inv.published ? url : undefined} target="_blank" rel="noreferrer" aria-disabled={!inv.published}>
            <ExternalLink size={16} /> View invitation
          </a>
          <Link className="cd-btn primary" to={editTo}><Pencil size={16} /> Edit</Link>
        </div>
      </header>

      <section className="cd-stats" aria-label="Summary">
        <div className="cd-stat">
          <span className="cd-ico"><Eye size={19} /></span>
          <div>
            <small>Total views</small>
            <strong>{inv.views == null ? "—" : fmt(inv.views)}</strong>
            <em>{inv.views == null ? "Not available yet" : inv.views === 0 ? "No one has opened it yet" : "times your page was opened"}</em>
          </div>
        </div>
        <div className="cd-stat">
          <span className="cd-ico"><CalendarDays size={19} /></span>
          <div><small>Wedding countdown</small><strong>{left.value}</strong><em>{left.sub}</em></div>
        </div>
        <div className="cd-stat">
          <span className="cd-ico"><CheckCircle2 size={19} /></span>
          <div>
            <small>Status</small>
            <strong><span className={`cd-pill ${st}`}>{CLIENT_STATUS_LABEL[st]}</span></strong>
            <em>{inv.published ? "Visible to your guests" : "Not visible to guests"}</em>
          </div>
        </div>
        <div className="cd-stat">
          <span className="cd-ico"><Clock size={19} /></span>
          <div><small>Last updated</small><strong>{timeAgo(inv.updatedAt, now) || "—"}</strong><em>{fmtDateTime(inv.updatedAt)}</em></div>
        </div>
      </section>

      <div className="cd-cols">
        <section className="cd-card">
          <h2>Your invitation link</h2>
          <p className="cd-note">Share this link with your guests.</p>
          <div className="cd-link">
            <input readOnly value={url} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="cd-btn" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}</button>
          </div>
          <dl className="cd-facts">
            <div><dt>Date</dt><dd>{inv.eventDate ? fmtDate(inv.eventDate) : "Not set"}</dd></div>
            <div><dt>Venue</dt><dd>{form?.venueEn || "Not set"}</dd></div>
            <div><dt>Events</dt><dd>{form?.events.length ?? 0}</dd></div>
            {inv.createdAt && <div><dt>Created</dt><dd>{fmtDate(inv.createdAt)}</dd></div>}
          </dl>
        </section>

        <section className="cd-card">
          <h2>Changes &amp; review</h2>
          {!req || req.status === "withdrawn" ? (
            <p className="cd-note">No changes are waiting. Edit your details any time. Updates go live after the admin approves them.</p>
          ) : req.status === "pending" ? (
            <div className="cd-banner wait"><Clock size={18} /><div><b>Waiting for admin review</b><span>Submitted {fmtDateTime(req.createdAt)}</span></div></div>
          ) : req.status === "rejected" && !req.acknowledgedAt ? (
            <div className="cd-banner bad"><AlertCircle size={18} /><div><b>Changes were rejected</b><span>{req.adminNote || "Open the editor to review and edit again."}</span></div></div>
          ) : req.status === "approved" && !req.acknowledgedAt ? (
            <div className="cd-banner ok"><CheckCircle2 size={18} /><div><b>Changes approved and live</b><span>Your invitation is up to date.</span></div></div>
          ) : req.status === "superseded" ? (
            <div className="cd-banner"><AlertCircle size={18} /><div><b>Your last request was cancelled</b><span>The invitation was changed by the admin.</span></div></div>
          ) : (
            <p className="cd-note">No changes are waiting.</p>
          )}

          <div className="cd-progress">
            <div className="cd-progress-top"><b>Details completed</b><span>{doneCount} of {checks.length}</span></div>
            <div className="cd-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
            <ul className="cd-checks">
              {checks.map((c) => (
                <li key={c.label} className={c.done ? "done" : ""}>
                  <span aria-hidden="true">{c.done ? <Check size={13} strokeWidth={2.6} /> : null}</span>{c.label}
                </li>
              ))}
            </ul>
          </div>
          <Link className="cd-btn primary wide" to={editTo}><Pencil size={16} /> Open editor</Link>
        </section>
      </div>
    </div>
  );
}
