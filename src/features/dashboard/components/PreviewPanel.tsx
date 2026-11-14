import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Pencil, Smartphone, X,
} from "../../../components/Icons";
import { useTemplates } from "../../../hooks/useTemplates";
import { fetchInvitation } from "../../../lib/api";
import { compile } from "../../../lib/compileInvitation";
import { coupleName } from "../../../lib/dashboardData";
import { useEscape } from "../../../hooks/useEscape";
import type { InvitationRow, TemplateRecord } from "../../../types/dashboard";

interface Props {
  slot: HTMLElement | null;
  row: InvitationRow;
  published: boolean;
  onClose: () => void;
}

export function PreviewPanel({ slot, row: listRow, published, onClose }: Props) {
  /* The list row holds only the link ID. The full invitation is read for the one being previewed. */
  const [full, setFull] = useState<InvitationRow | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFull(null);
    setFailed(false);
    if (!listRow.listOnly) return;
    let live = true;
    fetchInvitation(listRow.id).then((r) => { if (live) { if (r) setFull(r); else setFailed(true); } }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [listRow]);
  const ready = !listRow.listOnly || full !== null;
  const row = listRow.listOnly && full ? full : listRow;
  const asideRef = useRef<HTMLElement>(null);
  useEscape(true, onClose);
  const { templates, loading: tplLoading } = useTemplates();
  useEffect(() => { asideRef.current?.focus({ preventScroll: true }); }, []);
  const html = useMemo(() => {
    if (!ready) return "";
    try {
      const tpl: TemplateRecord | undefined = templates.find((t) => String(t.id) === String(row.template_id ?? row.details?.templateId));
      const source = tpl?.html_code || "";
      const data = {
        events: [], groomContacts: [], brideContacts: [],
        ...(row.details || {}),
        brideEn: row.bride_name || row.details?.brideEn || "",
        groomEn: row.groom_name || row.details?.groomEn || "",
        weddingDate: row.event_date || row.details?.weddingDate || "",
      };
      return compile(source, data);
    } catch { return ""; }
  }, [row, templates, ready]);

  if (!slot) return null;
  return createPortal(
    <aside className="dash-side-panel" aria-label="Invitation preview" ref={asideRef} tabIndex={-1}>
      <div className="dp-head">
        <div className="dp-title">
          <b><span className="live-dot" />{coupleName(row)}</b>
          <small>{published ? "Published" : "Draft"} · mobile preview</small>
        </div>
        <div className="dp-actions">
          <Link to={`/create?edit=${row.id}`} className="act-btn"><Pencil size={14} /> Edit</Link>
          <button type="button" className="icon-btn" aria-label="Close preview" onClick={onClose}><X size={16} /></button>
        </div>
      </div>
      <div className="dp-body">
        {html ? (
          /* No allow-same-origin: invitation code must not reach the app's storage or cookies. */
          <iframe key={row.id} title="Invitation preview" srcDoc={html} sandbox="allow-scripts allow-forms allow-popups" />
        ) : failed ? (
          <div className="dx-empty-mini"><Smartphone size={22} /><b>Couldn’t load the preview</b><span>Check your connection and open it again.</span></div>
        ) : tplLoading || !ready ? (
          <div className="dx-empty-mini"><Smartphone size={22} /><b>Loading preview…</b></div>
        ) : (
          <div className="dx-empty-mini"><Smartphone size={22} /><b>No preview available</b><span>This invitation has no template yet.</span></div>
        )}
      </div>
    </aside>,
    slot
  );
}
