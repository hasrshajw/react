import React, { useEffect, useState } from "react";
import { FilePlus2, LayoutTemplate, RefreshCw, CalendarDays, ArrowUpRight, Users, Inbox, Eye, Pencil, Link2, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { getDemoInvitations } from "../lib/demoData";

/* Demo traffic numbers. Replace with real values from your analytics source. */
const DEMO_TRAFFIC = { visitors: 1284, requestsPending: 1, requestsTotal: 30 };

/* Demo view count: uses x.views when it exists, otherwise a stable fake number per invitation. */
const getViews = (x) => {
  if (typeof x.views === "number") return x.views;
  const s = String(x.id ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return 40 + h;
};

/* Public link of an invitation. Change this if your live route is different. */
const getInviteLink = (x) =>
  `${window.location.origin}/${x.details?.customId || x.id}`;

const initials = (x) =>
  `${(x.groom_name || "G").trim().charAt(0)}${(x.bride_name || "B").trim().charAt(0)}`.toUpperCase();

export default function Dashboard() {
  const [rows, setRows] = useState([]);
  const load = () => setRows(getDemoInvitations());
  useEffect(() => { load(); }, []);

  const [copiedId, setCopiedId] = useState(null);
  const copyLink = async (x) => {
    const link = getInviteLink(x);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copy invitation link", link);
    }
    setCopiedId(x.id);
    setTimeout(() => setCopiedId((id) => (id === x.id ? null : id)), 1600);
  };

  return (
    <div className="dashboard-page">
      {/* ---------- page header ---------- */}
      <div className="page-head">
        <div>
          <div className="eyebrow">SCHEDY · DEMO WORKSPACE</div>
          <h1>Dashboard</h1>
          <p>Manage and preview invitations using sample templates.</p>
        </div>
        <button className="refresh" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="demo-note">
        <span className="demo-dot" />
        Demo mode is active. No database or account connection is required.
      </div>

      {/* ---------- KPI row ---------- */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon"><FilePlus2 size={19} /></div>
          <div className="stat-body">
            <span>Total invitations</span>
            <strong>{rows.length}</strong>
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-icon"><Users size={19} /></div>
          <div className="stat-body">
            <span>Total site visitors</span>
            <strong>{DEMO_TRAFFIC.visitors.toLocaleString()}</strong>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon"><Inbox size={19} /></div>
          <div className="stat-body">
            <span>Site requests</span>
            <strong
              className="req-count"
              title={`${DEMO_TRAFFIC.requestsPending} pending of ${DEMO_TRAFFIC.requestsTotal} requests`}
            >
              <span className={DEMO_TRAFFIC.requestsPending > 0 ? "pending" : "clear"}>
                {DEMO_TRAFFIC.requestsPending}
              </span>
              <span className="total">/{DEMO_TRAFFIC.requestsTotal}</span>
            </strong>
          </div>
          <Link to="/analytics" className="round-btn" aria-label="View site requests">
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="action-card">
          <div className="action-icon"><LayoutTemplate size={20} /></div>
          <div className="action-text">
            <strong>Create an invitation</strong>
          </div>
          <Link to="/create" className="action-btn">Open builder <ArrowUpRight size={15} /></Link>
        </div>
      </div>

      {/* ---------- recent invitations (table) ---------- */}
      <div className="recent-card">
        <div className="recent-head">
          <div className="recent-title">
            <strong>Recent invitations</strong>
            {rows.length > 0 && <em>{rows.length}</em>}
          </div>
          <Link to="/analytics" className="head-link">View analytics <ArrowUpRight size={14} /></Link>
        </div>

        {rows.length ? (
          <div className="table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Couple</th>
                  <th>Event date</th>
                  <th>Invitation views</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((x) => (
                  <tr key={x.id}>
                    <td>
                      <div className="cell-couple">
                        <div className="row-avatar">{initials(x)}</div>
                        <b>{x.groom_name || "Groom"} &amp; {x.bride_name || "Bride"}</b>
                      </div>
                    </td>
                    <td>
                      <div className="cell-date">
                        <CalendarDays size={14} /> {x.event_date || "Date not set"}
                      </div>
                    </td>
                    <td>
                      <span className="views"><Eye size={15} /> {getViews(x).toLocaleString()}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/create?edit=${x.id}`} className="act-btn">
                          <Pencil size={14} /> Edit
                        </Link>
                        <button
                          type="button"
                          className={`act-btn ${copiedId === x.id ? "done" : ""}`}
                          onClick={() => copyLink(x)}
                        >
                          {copiedId === x.id ? <Check size={14} /> : <Link2 size={14} />}
                          {copiedId === x.id ? "Copied" : "Link"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><FilePlus2 size={22} /></div>
            <b>No invitations yet</b>
            <span>Create your first invitation to see it here.</span>
            <Link to="/create">Create invitation</Link>
          </div>
        )}
      </div>

      <style>{`
        .dashboard-page { max-width: 1400px; margin: auto; font-family: "DM Sans", Inter, sans-serif; color: var(--dark); }
        .dashboard-page * { box-sizing: border-box; }

        /* ---------- header ---------- */
        .page-head { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 16px; }
        .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .12em; color: var(--primary); }
        .dashboard-page h1 { margin: 5px 0 3px; font-size: 26px; line-height: 1.15; font-weight: 700; color: var(--dark); }
        .page-head p { margin: 0; color: var(--gray); font-size: 14px; }
        .refresh { height: 40px; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--gray-border); border-radius: 14px; background: var(--white); color: var(--gray-dark); font-size: 14px; font-weight: 600; cursor: pointer; transition: background .2s, border-color .2s; }
        .refresh:hover { background: var(--gray-light); border-color: var(--periwinkle); }
        .refresh svg { transition: transform .35s ease; }
        .refresh:active svg { transform: rotate(180deg); }

        .demo-note { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 16px; border-radius: 14px; background: var(--primary-light); color: var(--primary-dark); font-size: 13px; font-weight: 500; line-height: 1.4; }
        .demo-dot { width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; background: var(--primary); box-shadow: 0 0 0 4px rgba(103, 61, 230, .16); }

        /* ---------- KPI row ---------- */
        .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1.25fr; gap: 14px; }
        .stat-card, .action-card { position: relative; min-height: 76px; display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 20px; min-width: 0; }

        .stat-card { background: var(--white); border: 1px solid var(--gray-border); transition: border-color .2s, box-shadow .2s; }
        .stat-card:hover { border-color: var(--periwinkle); box-shadow: 0 6px 18px rgba(54, 52, 77, .06); }
        .stat-icon { width: 42px; height: 42px; flex-shrink: 0; display: grid; place-items: center; border-radius: 13px; background: var(--primary-light); color: var(--primary); }
        .stat-card.blue .stat-icon { background: var(--info-light); color: #0b86a8; }
        .stat-card.green .stat-icon { background: var(--success-light); color: var(--success-dark); }
        .stat-body { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .stat-body > span { font-size: 13px; font-weight: 600; color: var(--gray); white-space: nowrap; }
        .req-count .pending { color: var(--danger-dark); }
        .req-count .clear { color: var(--success-dark); }
        .req-count .total { margin-left: 1px; font-size: 20px; font-weight: 600; color: var(--gray); letter-spacing: 0; }
        .stat-body strong { font-size: 28px; line-height: 1.1; font-weight: 700; letter-spacing: -.02em; color: var(--dark); }

        /* circular arrow button, top-right corner of the card */
        .round-btn { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--gray-border); background: var(--white); color: var(--gray-dark); text-decoration: none; transition: background .2s, color .2s, border-color .2s, transform .2s; }
        .round-btn:hover { background: var(--primary); border-color: var(--primary); color: #fff; }

        .action-card { overflow: hidden; justify-content: space-between; color: #fff; background: linear-gradient(120deg, #351775 0%, #673de6 100%); }
        .action-card::before { content: ""; position: absolute; width: 150px; height: 150px; right: -40px; top: -70px; border-radius: 50%; background: rgba(255, 255, 255, .09); pointer-events: none; }
        .action-icon { position: relative; width: 42px; height: 42px; flex-shrink: 0; display: grid; place-items: center; border-radius: 13px; background: rgba(255, 255, 255, .18); color: #fff; }
        .action-text { position: relative; min-width: 0; flex: 1; }
        .action-text strong { display: block; font-size: 15px; line-height: 1.25; font-weight: 700; color: #fff; }
        .action-btn { position: relative; flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 13px; border-radius: 12px; background: #fff; color: var(--primary-dark); font-size: 13px; font-weight: 700; text-decoration: none; white-space: nowrap; transition: transform .2s, box-shadow .2s; }
        .action-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0, 0, 0, .22); }

        /* ---------- recent invitations table ---------- */
        .recent-card { margin-top: 14px; overflow: hidden; background: var(--white); border: 1px solid var(--gray-border); border-radius: 22px; }
        .recent-head { height: 60px; padding: 0 22px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--gray-border); }
        .recent-title { display: flex; align-items: center; gap: 10px; }
        .recent-title strong { font-size: 15px; font-weight: 700; }
        .recent-title em { min-width: 22px; height: 22px; padding: 0 7px; display: grid; place-items: center; border-radius: 999px; background: var(--primary-light); color: var(--primary); font-size: 12px; font-style: normal; font-weight: 700; }
        .head-link { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 13px; border-radius: 999px; background: var(--primary-lightest); color: var(--primary); font-size: 13px; font-weight: 700; text-decoration: none; transition: background .2s; }
        .head-link:hover { background: var(--primary-light); }

        .table-scroll { overflow-x: auto; }
        .inv-table { width: 100%; min-width: 640px; border-collapse: collapse; }
        .inv-table thead th { padding: 12px 22px; text-align: left; background: var(--ghost-white); border-bottom: 1px solid var(--gray-border); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--gray); white-space: nowrap; }
        .inv-table tbody td { padding: 14px 22px; border-bottom: 1px solid var(--gray-border); vertical-align: middle; }
        .inv-table tbody tr:last-child td { border-bottom: 0; }
        .inv-table tbody tr { transition: background .15s; }
        .inv-table tbody tr:hover { background: var(--ghost-white); }

        .cell-couple { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .cell-couple b { font-size: 14px; font-weight: 700; white-space: nowrap; }
        .row-avatar { width: 38px; height: 38px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; background: var(--primary-light); color: var(--primary); font-size: 12px; font-weight: 700; letter-spacing: .02em; }
        .cell-date { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--gray-dark); white-space: nowrap; }
        .cell-date svg { color: var(--gray); flex-shrink: 0; }
        .views { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--dark); }
        .views svg { color: var(--gray); }

        .inv-table .th-actions { text-align: right; }
        .row-actions { display: flex; justify-content: flex-end; gap: 8px; }
        .act-btn { height: 34px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--gray-border); border-radius: 12px; background: var(--white); color: var(--gray-dark); font: inherit; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; white-space: nowrap; transition: background .2s, border-color .2s, color .2s; }
        .act-btn:hover { background: var(--primary-lightest); border-color: var(--primary); color: var(--primary); }
        .act-btn.done { background: var(--success-light); border-color: var(--success-light); color: var(--success-dark); }

        .empty-state { padding: 40px 24px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; color: var(--gray); font-size: 13px; }
        .empty-icon { width: 52px; height: 52px; margin-bottom: 6px; display: grid; place-items: center; border-radius: 50%; background: var(--primary-light); color: var(--primary); }
        .empty-state b { font-size: 15px; color: var(--dark); }
        .empty-state a { margin-top: 10px; height: 40px; padding: 0 18px; display: inline-flex; align-items: center; border-radius: 14px; background: var(--primary); color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 4px 12px rgba(103, 61, 230, .25); transition: background .2s; }
        .empty-state a:hover { background: var(--primary-dark); }

        /* ---------- responsive ---------- */
        @media (max-width: 1280px) { .dashboard-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 700px) {
          .page-head { align-items: flex-start; flex-direction: column; }
          .dashboard-grid { grid-template-columns: 1fr; }
          .inv-table thead th, .inv-table tbody td { padding-left: 16px; padding-right: 16px; }
        }
      `}</style>
    </div>
  );
}
