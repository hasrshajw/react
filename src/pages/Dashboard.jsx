import React, { useEffect, useState } from "react";
import { FilePlus2, LayoutTemplate, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const { count: invitationCount, error: queryError } = await supabase
      .from("invitations")
      .select("id", { count: "exact", head: true });

    if (queryError) setError(queryError.message);
    else setCount(invitationCount ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="dashboard-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">SCHEDY</div>
          <h1>Dashboard</h1>
          <p>Manage your invitation workspace.</p>
        </div>
        <button className="refresh" onClick={load} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon"><FilePlus2 size={20} /></div>
          <span>Invitations</span>
          <strong>{loading ? "—" : count}</strong>
          <small>Saved in your Supabase project</small>
        </div>

        <div className="action-card">
          <LayoutTemplate size={22} />
          <div>
            <strong>Create an invitation</strong>
            <p>Choose a template and start editing.</p>
          </div>
          <a href="/create">Open Create</a>
        </div>
      </div>

      <style>{`
        .dashboard-page{max-width:1400px;margin:0 auto;font-family:"DM Sans",Inter,sans-serif;color:var(--dark)}
        .page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:24px}
        .eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--primary);margin-bottom:6px}
        h1{margin:0;font-size:28px;line-height:1.2;font-weight:700;color:var(--dark)}
        .page-head p{margin:7px 0 0;color:var(--gray);font-size:14px}
        .refresh{height:38px;border:1px solid var(--gray-border);background:var(--white);border-radius:9px;padding:0 13px;display:flex;align-items:center;gap:7px;color:var(--gray-dark);cursor:pointer;transition:background .2s}
        .refresh:hover:not(:disabled){background:var(--gray-light)}
        .refresh:disabled{opacity:.55}
        .error-box{padding:12px 14px;background:var(--danger-light);border:1px solid var(--danger);border-radius:10px;color:var(--danger-dark);font-size:13px;margin-bottom:16px}
        .dashboard-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        .stat-card,.action-card{background:var(--white);border:1px solid var(--gray-border);border-radius:14px;padding:22px}
        .stat-icon{width:40px;height:40px;border-radius:10px;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;margin-bottom:18px}
        .stat-card span{display:block;font-size:13px;color:var(--gray)}.stat-card strong{display:block;font-size:32px;margin:6px 0;color:var(--dark)}.stat-card small{color:var(--gray);font-size:12px}
        .action-card{display:flex;align-items:center;gap:14px;color:var(--primary)}.action-card strong{color:var(--dark);font-size:15px}.action-card p{margin:4px 0;color:var(--gray);font-size:12px}.action-card a{margin-left:auto;color:var(--primary);text-decoration:none;font-size:13px;font-weight:700;white-space:nowrap;transition:color .2s}.action-card a:hover{color:var(--primary-dark)}
        @media(max-width:700px){.page-head{align-items:flex-start;flex-direction:column}.dashboard-grid{grid-template-columns:1fr}.action-card{align-items:flex-start;flex-wrap:wrap}.action-card a{margin-left:36px}}
      `}</style>
    </div>
  );
}
