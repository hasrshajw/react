import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "../../components/Icons";
import { useTemplates } from "../../hooks/useTemplates";
import {
  ChangeConflictError,
  fetchInvitation,
  reviewChangeRequest,
  type ReviewItem,
} from "../../lib/api";
import { compile } from "../../lib/compileInvitation";
import { coupleName, fmtDateTime } from "../../lib/dashboardData";
import type { InvitationRow } from "../../types/dashboard";
import { fieldLabel, formatDiffValue } from "./fieldLabels";

type Props = {
  item: ReviewItem;
  onClose: () => void;
  onDecided: () => void;
  notify: (msg: string, undo?: () => void) => void;
};

export function ReviewDetail({ item, onClose, onDecided, notify }: Props) {
  const { templates } = useTemplates();
  const [row, setRow] = useState<InvitationRow | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"approve" | "reject" | "force" | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setRow(null);
    setLoadError(false);
    setNote("");
    setConfirm(null);
    setConflictMsg(null);
    fetchInvitation(item.invitationId).then(
      (r) => { if (live) { setRow(r); if (!r) setLoadError(true); } },
      () => { if (live) setLoadError(true); },
    );
    return () => { live = false; };
  }, [item.id, item.invitationId]);

  const currentDetails = row?.details || {};
  const proposed = item.proposedDetails || {};

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

  return (
    <div className="review-detail" role="dialog" aria-modal="true" aria-label="Review change request">
      <div className="review-detail-head">
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Review request</h2>
          <p style={{ margin: "4px 0 0", color: "var(--gray)", fontSize: 13 }}>
            {item.clientEmail || "Unknown client"}
            {row ? ` · ${coupleName(row)}` : ""}
            {" · "}
            {fmtDateTime(item.createdAt)}
          </p>
        </div>
        <button type="button" className="act-btn" aria-label="Close review" onClick={onClose} disabled={busy}>
          <X size={16} />
        </button>
      </div>

      {loadError && (
        <p className="hint" style={{ color: "var(--danger-dark)" }}>
          Couldn’t load the current invitation. You can still reject; approving may fail.
        </p>
      )}

      {conflictMsg && (
        <div className="share-note" role="alert" style={{ marginBottom: 12 }}>
          <span>{conflictMsg}</span>
        </div>
      )}

      <div className="review-detail-grid">
        <section>
          <h3 style={{ fontSize: 14, margin: "0 0 10px" }}>Changes</h3>
          {keys.length === 0 ? (
            <p className="hint">No field list on this request.</p>
          ) : (
            <table className="diff-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Current</th>
                  <th>Proposed</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const cur = (currentDetails as Record<string, unknown>)[key];
                  const next = (proposed as Record<string, unknown>)[key];
                  return (
                    <tr key={key}>
                      <td><b>{fieldLabel(key)}</b></td>
                      <td className="diff-old">{formatDiffValue(cur)}</td>
                      <td className="diff-new">{formatDiffValue(next)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h3 style={{ fontSize: 14, margin: "0 0 10px" }}>Proposed preview</h3>
          <div className="review-preview-frame">
            {proposedPreview
              ? (
                <iframe
                  title="Proposed invitation preview"
                  srcDoc={proposedPreview}
                  sandbox="allow-scripts"
                />
              )
              : (
                <p className="hint" style={{ padding: 16 }}>Preview unavailable (template missing or not loaded).</p>
              )}
          </div>
          <p className="hint" style={{ marginTop: 8, fontSize: 12 }}>
            Sandboxed preview (no same-origin). Scripts from the template are not granted extra privileges.
          </p>
        </section>
      </div>

      {pending && (
        <div className="review-actions">
          <label className="f" style={{ flex: 1, minWidth: 200 }}>
            <span>Note {confirm === "reject" || note ? "(required to reject)" : "(optional on approve)"}</span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              placeholder="Explain the decision to the client…"
              style={{ width: "100%", resize: "vertical", font: "inherit", padding: 8, borderRadius: 8, border: "1px solid var(--gray-border)" }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <Link className="act-btn" to={`/create?edit=${encodeURIComponent(item.invitationId)}`}>
              Edit invitation
            </Link>
            {confirm === null && (
              <>
                <button type="button" className="act-btn danger" disabled={busy} onClick={() => setConfirm("reject")}>
                  Reject…
                </button>
                <button type="button" className="create-btn" disabled={busy} onClick={() => setConfirm("approve")} style={{ border: 0 }}>
                  Approve…
                </button>
              </>
            )}
            {confirm === "approve" && (
              <>
                <span className="hint">Apply the proposed changes to the live invitation?</span>
                <button type="button" className="act-btn" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
                <button type="button" className="create-btn" disabled={busy} onClick={() => void decide("approve")} style={{ border: 0 }}>
                  {busy ? "Saving…" : "Confirm approve"}
                </button>
              </>
            )}
            {confirm === "reject" && (
              <>
                <span className="hint">Reject and send your note to the client?</span>
                <button type="button" className="act-btn" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
                <button type="button" className="act-btn danger" disabled={busy || !note.trim()} onClick={() => void decide("reject")}>
                  {busy ? "Saving…" : "Confirm reject"}
                </button>
              </>
            )}
            {confirm === "force" && (
              <>
                <button type="button" className="act-btn" disabled={busy} onClick={() => { setConfirm(null); setConflictMsg(null); }}>
                  Cancel
                </button>
                <button type="button" className="create-btn" disabled={busy} onClick={() => void decide("approve", true)} style={{ border: 0 }}>
                  {busy ? "Saving…" : "Approve anyway"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {!pending && (
        <p className="hint" style={{ marginTop: 12 }}>
          This request is <b>{item.status}</b>. Decisions can only be made on pending requests.
        </p>
      )}
    </div>
  );
}
