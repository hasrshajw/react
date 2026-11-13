import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, FileText, Pencil, Smartphone, X } from "../../components/Icons";
import { useEscape } from "../../hooks/useEscape";
import { useTemplates } from "../../hooks/useTemplates";
import {
  ChangeConflictError,
  fetchInvitation,
  reviewChangeRequest,
  type ReviewItem,
} from "../../lib/api";
import { compile } from "../../lib/compileInvitation";
import { coupleName, fmtDateTime, timeAgo } from "../../lib/dashboardData";
import type { InvitationRow } from "../../types/dashboard";
import { diffKind, diffLines, fieldLabel, type DiffKind } from "./fieldLabels";
import { STATUS_CHIP, STATUS_LABEL } from "./status";

type Props = {
  /** The #preview-slot element beside the page; the panel is portalled into it like the Dashboard preview. */
  slot: HTMLElement | null;
  item: ReviewItem;
  onClose: () => void;
  onDecided: () => void;
  notify: (msg: string, undo?: () => void) => void;
};

const KIND_LABEL: Record<DiffKind, string> = { added: "Added", changed: "Changed", removed: "Removed" };

function Lines({ lines }: { lines: string[] }) {
  if (lines.length === 0) return <span className="rv-empty">Empty</span>;
  return <>{lines.map((l, i) => <span className="rv-line" key={i}>{l}</span>)}</>;
}

export function ReviewDetail({ slot, item, onClose, onDecided, notify }: Props) {
  const asideRef = useRef<HTMLElement>(null);
  const { templates, loading: tplLoading } = useTemplates();
  const [row, setRow] = useState<InvitationRow | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"approve" | "reject" | "force" | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<"changes" | "preview">("changes");

  useEscape(!busy, onClose);
  useEffect(() => { asideRef.current?.focus({ preventScroll: true }); }, [item.id]);

  useEffect(() => {
    let live = true;
    setRow(null);
    setLoadError(false);
    setNote("");
    setConfirm(null);
    setConflictMsg(null);
    setTab("changes");
    fetchInvitation(item.invitationId).then(
      (r) => { if (live) { setRow(r); if (!r) setLoadError(true); } },
      () => { if (live) setLoadError(true); },
    );
    return () => { live = false; };
  }, [item.id, item.invitationId]);

  const currentDetails = useMemo(() => row?.details || {}, [row]);
  const proposed = useMemo(() => item.proposedDetails || {}, [item.proposedDetails]);

  const proposedPreview = useMemo(() => {
    try {
      const tpl = templates.find((t) => String(t.id) === String(row?.template_id ?? currentDetails.templateId ?? proposed.templateId));
      const source = tpl?.html_code || "";
      if (!source) return "";
      const data = {
        events: [], groomContacts: [], brideContacts: [],
        ...currentDetails,
        ...proposed,
        brideEn: (proposed.brideEn as string) || row?.bride_name || (currentDetails.brideEn as string) || "",
        groomEn: (proposed.groomEn as string) || row?.groom_name || (currentDetails.groomEn as string) || "",
        weddingDate: (proposed.weddingDate as string) || row?.event_date || (currentDetails.weddingDate as string) || "",
      };
      return compile(source, data);
    } catch {
      return "";
    }
  }, [templates, row, currentDetails, proposed]);

  const keys = item.changedKeys.length
    ? item.changedKeys
    : Object.keys(proposed);

  const decide = async (decision: "approve" | "reject", force = false) => {
    if (decision === "reject" && !note.trim()) {
      notify("Add a note explaining the rejection.");
      return;
    }
    setBusy(true);
    setConflictMsg(null);
    try {
      await reviewChangeRequest(item.id, decision, note, force);
      notify(decision === "approve" ? "Changes approved and applied." : "Request rejected.");
      setConfirm(null);
      onDecided();
    } catch (e) {
      if (e instanceof ChangeConflictError) {
        setConflictMsg(e.message || "The invitation changed after the client submitted. Approve anyway to overwrite, or cancel.");
        setConfirm("force");
      } else {
        notify(e instanceof Error ? e.message : "Couldn’t save the decision.");
      }
    } finally {
      setBusy(false);
    }
  };

  const pending = item.status === "pending";
  const couple = row ? coupleName(row) : "";
  const who = couple || item.clientEmail || "Change request";
  const now = Date.now();

  if (!slot) return null;
  return createPortal(
    <aside className="dash-side-panel rv-panel" aria-label="Review change request" ref={asideRef} tabIndex={-1}>
      <header className="rv-head">
        <span className="rv-avatar" aria-hidden="true">{who.trim().charAt(0).toUpperCase() || "?"}</span>
        <div className="rv-who">
          <b title={who}>{who}</b>
          <small title={fmtDateTime(item.createdAt)}>
            {item.clientEmail || "Unknown client"} · {timeAgo(item.createdAt, now) || fmtDateTime(item.createdAt)}
          </small>
        </div>
        <span className={`chip ${STATUS_CHIP[item.status]}`}>{STATUS_LABEL[item.status]}</span>
        <button type="button" className="icon-btn" aria-label="Close review" onClick={onClose} disabled={busy}>
          <X size={16} />
        </button>
      </header>

      <div className="rv-tabs" role="tablist" aria-label="Review sections">
        <button type="button" role="tab" id="rv-tab-changes" aria-selected={tab === "changes"} aria-controls="rv-pane"
          className={tab === "changes" ? "on" : ""} onClick={() => setTab("changes")}>
          <FileText size={15} /> Changes <em>{keys.length}</em>
        </button>
        <button type="button" role="tab" id="rv-tab-preview" aria-selected={tab === "preview"} aria-controls="rv-pane"
          className={tab === "preview" ? "on" : ""} onClick={() => setTab("preview")}>
          <Smartphone size={15} /> Preview
        </button>
      </div>

      <div className="rv-body" id="rv-pane" role="tabpanel" aria-labelledby={`rv-tab-${tab}`}>
        {loadError && (
          <div className="rv-alert bad" role="status">
            <AlertTriangle size={16} />
            <span>Couldn’t load the current invitation, so “Before” values may be missing. You can still reject; approving may fail.</span>
          </div>
        )}
        {conflictMsg && (
          <div className="rv-alert warn" role="alert">
            <AlertTriangle size={16} />
            <span>{conflictMsg}</span>
          </div>
        )}

        {tab === "changes" ? (
          keys.length === 0 ? (
            <div className="rv-none">No field list on this request.</div>
          ) : (
            <>
              <p className="rv-summary">
                <b>{keys.length}</b> {keys.length === 1 ? "field" : "fields"} changed by the client
              </p>
              <ul className="rv-changes">
                {keys.map((key) => {
                  const cur = (currentDetails as Record<string, unknown>)[key];
                  const next = (proposed as Record<string, unknown>)[key];
                  const kind = diffKind(cur, next);
                  return (
                    <li key={key} className="rv-change">
                      <div className="rv-change-top">
                        <span className="rv-field">{fieldLabel(key)}</span>
                        <span className={`rv-kind ${kind}`}>{KIND_LABEL[kind]}</span>
                      </div>
                      <div className="rv-diff">
                        <div className="rv-side old">
                          <small>Before</small>
                          <div className="rv-val"><Lines lines={diffLines(cur)} /></div>
                        </div>
                        <span className="rv-arrow" aria-hidden="true"><ArrowRight size={14} /></span>
                        <div className="rv-side new">
                          <small>After</small>
                          <div className="rv-val"><Lines lines={diffLines(next)} /></div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )
        ) : proposedPreview ? (
          <div className="rv-preview">
            {/* No allow-same-origin: template code must not reach the app's storage or cookies. */}
            <iframe key={item.id} title="Proposed invitation preview" srcDoc={proposedPreview} sandbox="allow-scripts" />
          </div>
        ) : (
          <div className="rv-none">
            <Smartphone size={22} />
            <b>{tplLoading ? "Loading preview…" : "Preview unavailable"}</b>
            {!tplLoading && <span>The template is missing or not loaded.</span>}
          </div>
        )}
      </div>

      <footer className="rv-foot">
        {pending ? (
          <>
            <label className="rv-note">
              <span>Note {confirm === "reject" || note ? "(required to reject)" : "(optional on approve)"}</span>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
                placeholder="Explain the decision to the client…"
              />
            </label>
            {confirm === "approve" && <p className="rv-ask">Apply the proposed changes to the live invitation?</p>}
            {confirm === "reject" && <p className="rv-ask">Reject and send your note to the client?</p>}
            <div className="rv-actions">
              <Link className="act-btn" to={`/create?edit=${encodeURIComponent(item.invitationId)}`}>
                <Pencil size={14} /> Edit
              </Link>
              <span className="rv-spacer" />
              {confirm === null && (
                <>
                  <button type="button" className="act-btn danger" disabled={busy} onClick={() => setConfirm("reject")}>
                    Reject…
                  </button>
                  <button type="button" className="rv-approve" disabled={busy} onClick={() => setConfirm("approve")}>
                    <Check size={15} /> Approve…
                  </button>
                </>
              )}
              {confirm === "approve" && (
                <>
                  <button type="button" className="act-btn" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
                  <button type="button" className="rv-approve" disabled={busy} onClick={() => void decide("approve")}>
                    {busy ? "Saving…" : "Confirm approve"}
                  </button>
                </>
              )}
              {confirm === "reject" && (
                <>
                  <button type="button" className="act-btn" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
                  <button type="button" className="act-btn danger solid-danger" disabled={busy || !note.trim()} onClick={() => void decide("reject")}>
                    {busy ? "Saving…" : "Confirm reject"}
                  </button>
                </>
              )}
              {confirm === "force" && (
                <>
                  <button type="button" className="act-btn" disabled={busy} onClick={() => { setConfirm(null); setConflictMsg(null); }}>
                    Cancel
                  </button>
                  <button type="button" className="rv-approve" disabled={busy} onClick={() => void decide("approve", true)}>
                    {busy ? "Saving…" : "Approve anyway"}
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="rv-actions">
            <p className="rv-ask">
              This request is <b>{item.status}</b>. Decisions can only be made on pending requests.
            </p>
            <span className="rv-spacer" />
            <Link className="act-btn" to={`/create?edit=${encodeURIComponent(item.invitationId)}`}>
              <Pencil size={14} /> Open invitation
            </Link>
          </div>
        )}
      </footer>
    </aside>,
    slot,
  );
}
