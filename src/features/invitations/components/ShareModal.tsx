import { useEffect, useState } from "react";
import { Copy, Download, Globe, MessageCircle } from "../../../components/Icons";
import { coupleName, getInviteLink } from "../../../lib/dashboardData";
import { downloadBlob } from "../../../lib/download";
import { isReserved } from "../../../lib/reserved";
import { SLUG_MAX, SLUG_MIN, okSlug } from "../../../lib/validate";
import type { InvitationRow } from "../../../types/dashboard";
import { Modal } from "../../dashboard/components/Modal";

interface Props {
  row: InvitationRow;
  rows: InvitationRow[];
  live: boolean;
  onClose: () => void;
  onCopy: (x: InvitationRow) => void;
  onWhatsApp: (x: InvitationRow) => void;
  onSaveLink: (x: InvitationRow, slug: string) => void;
  onPublish: (x: InvitationRow) => void;
}

/** Share dialog: link, custom link ID, WhatsApp and QR download. */
export function ShareModal({ row, rows, live, onClose, onCopy, onWhatsApp, onSaveLink, onPublish }: Props) {
  const link = getInviteLink(row);
  const current = row.details?.customId || "";
  const [slug, setSlug] = useState(current);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const clean = slug.trim();
  const taken = !!clean && rows.some((r) => r.id !== row.id && String(r.details?.customId || r.id).toLowerCase() === clean.toLowerCase());
  const problem = clean && !okSlug(clean) ? `Use ${SLUG_MIN} to ${SLUG_MAX} letters, numbers, hyphens or underscores`
    : clean && isReserved(clean) ? "This link name is reserved"
    : taken ? "This link ID is already used by another invitation" : "";
  const dirty = clean !== current;
  const api = (size: number) => `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(link)}`;
  const fileName = `${coupleName(row).replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-qr.png`;

  useEffect(() => { setLoaded(false); setFailed(false); }, [link]);

  /* Fetch as a blob so the browser saves a file instead of opening the image in a new tab. */
  const download = async () => {
    setBusy(true);
    try {
      const blob = await (await fetch(api(720))).blob();
      downloadBlob(blob, fileName);
    } catch {
      window.open(api(720), "_blank", "noopener");
    }
    setBusy(false);
  };

  return (
    <Modal title="Share invitation" subtitle={coupleName(row)} width={440} onClose={onClose}>
      <div className="share">
        {!live && (
          <div className="share-note">
            <span>This invitation is a draft. Publish it to turn the link on.</span>
            <button type="button" className="act-btn solid" onClick={() => onPublish(row)}><Globe size={14} /> Publish</button>
          </div>
        )}

        <div className="share-link">
          <code title={link}>{link}</code>
          <button type="button" className="act-btn" disabled={!live} onClick={() => onCopy(row)}><Copy size={14} /> Copy</button>
        </div>

        <form
          className="share-custom"
          onSubmit={(e) => { e.preventDefault(); if (!problem && dirty) onSaveLink(row, clean); }}
        >
          <label htmlFor="share-slug">Custom link ID</label>
          <div className="share-row">
            <span className="share-prefix">{window.location.host}/</span>
            <input
              id="share-slug" value={slug} maxLength={SLUG_MAX} placeholder={String(row.id).slice(0, 8)} autoComplete="off" spellCheck="false"
              aria-invalid={!!problem} aria-describedby="share-hint"
              onChange={(e) => setSlug(e.target.value)}
            />
            <button type="submit" className="act-btn solid" disabled={!dirty || !!problem}>Save</button>
          </div>
          <small id="share-hint" className={problem ? "bad" : ""}>
            {problem || (dirty && current ? "Saving changes the link. The old link will stop working." : "Short, memorable links are easier to share on WhatsApp.")}
          </small>
        </form>

        <div className="share-qr">
          <div className="share-qr-img">
            {failed ? <span>Couldn’t load the QR code. Check your connection.</span> : (
              <>
                {!loaded && <i className="sk" />}
                <img
                  src={api(240)} alt={`QR code for ${coupleName(row)}`} width="150" height="150"
                  style={loaded && live ? undefined : { display: "none" }}
                  onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
                />
              </>
            )}
          </div>
          <div className="share-actions">
            <button type="button" className="act-btn wa wide" disabled={!live} onClick={() => onWhatsApp(row)}>
              <MessageCircle size={14} /> Share on WhatsApp
            </button>
            <button type="button" className="act-btn wide" disabled={!live || !loaded || busy} onClick={download}>
              <Download size={14} /> Download QR (PNG)
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
