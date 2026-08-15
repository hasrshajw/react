import React, { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Analytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("invitations")
      .select("id, bride_name, groom_name, event_date, created_at")
      .order("created_at", { ascending: false });

    if (queryError) setError(queryError.message);
    else setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const total = rows.length;
  const upcoming = rows.filter((row) => row.event_date && new Date(row.event_date) >= new Date()).length;
  const dated = rows.filter((row) => row.event_date).length;

  return (
    <div className="analytics-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">SCHEDY</div>
          <h1>Analytics</h1>
          <p>Live statistics from your invitation data.</p>
        </div>
        <button className="refresh" onClick={load} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="stats">
        <div className="card"><span>Total invitations</span><strong>{loading ? "—" : total}</strong></div>
        <div className="card"><span>Upcoming events</span><strong>{loading ? "—" : upcoming}</strong></div>
        <div className="card"><span>With event date</span><strong>{loading ? "—" : dated}</strong></div>
      </div>

      <div className="table-card">
        <div className="table-title"><BarChart3 size={19} /><strong>Recent invitations</strong></div>
        {loading ? (
          <div className="empty">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="empty">No invitations yet. Create your first invitation to see live analytics.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Couple</th><th>Event date</th><th>Created</th></tr></thead>
              <tbody>
                {rows.slice(0, 20).map((row) => (
                  <tr key={row.id}>
                    <td>{row.groom_name || "—"} & {row.bride_name || "—"}</td>
                    <td>{row.event_date ? new Date(row.event_date).toLocaleDateString("en-IN") : "—"}</td>
                    <td>{row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .analytics-page{max-width:1400px;margin:0 auto;font-family:"DM Sans",Inter,sans-serif}.page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:24px}.eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;color:#673de6;margin-bottom:6px}h1{margin:0;font-size:28px}.page-head p{margin:7px 0 0;color:#71717a;font-size:14px}.refresh{height:38px;border:1px solid #e4e4e7;background:#fff;border-radius:9px;padding:0 13px;display:flex;align-items:center;gap:7px;color:#3f3f46;cursor:pointer}.refresh:disabled{opacity:.55}.error-box{padding:12px 14px;background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;color:#be123c;font-size:13px;margin-bottom:16px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card,.table-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:22px}.card span{font-size:13px;color:#71717a}.card strong{display:block;font-size:30px;margin-top:8px}.table-card{margin-top:16px;padding:0;overflow:hidden}.table-title{height:58px;padding:0 18px;display:flex;align-items:center;gap:9px;color:#673de6;border-bottom:1px solid #e5e7eb}.table-title strong{color:#18181a;font-size:14px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:13px 18px;border-bottom:1px solid #f0f0f2}th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#a1a1aa}td{color:#3f3f46}.empty{padding:42px 20px;text-align:center;color:#a1a1aa;font-size:13px}@media(max-width:700px){.page-head{align-items:flex-start;flex-direction:column}.stats{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
