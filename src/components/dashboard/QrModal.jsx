import React, { useState } from "react";
import {
  Link2, Check, Download, Copy,
} from "../../components/Icons";
import { coupleName, getInviteLink } from "../../lib/dashboardData";
import { Modal } from "../../components/dashboard/Modal";

export function QrModal({ row, onClose, onCopy }) {
  const link = getInviteLink(row);
  const api = (size) => `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(link)}`;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileName = `${coupleName(row).replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-qr.png`;

  /* Fetch as a blob so the browser saves a file instead of opening the image in a new tab. */
  const download = async () => {
    setBusy(true);
    try {
      const blob = await (await fetch(api(720))).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.open(api(720), "_blank", "noopener");
    }
    setBusy(false);
  };

  return (
    <Modal title="QR code" subtitle={coupleName(row)} width={360} onClose={onClose}>
      <div className="dx-qr">
        <div className="dx-qr-ph">
          {failed ? (
            "Couldn't load the QR code. Check your connection."
          ) : (
            <>
              {!loaded && <i className="sk" />}
              <img
                src={api(240)} alt={`QR code for ${coupleName(row)}`} width="220" height="220"
                style={loaded ? undefined : { display: "none" }}
                onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
              />
            </>
          )}
        </div>
        <code>{link}</code>
        <div className="dx-qr-actions">
          <button type="button" className="act-btn wide" onClick={() => onCopy(row)}><Link2 size={14} /> Copy link</button>
          <button type="button" className="act-btn wide solid" disabled={!loaded || busy} onClick={download}>
            <Download size={14} /> Download PNG
          </button>
        </div>
      </div>
    </Modal>
  );
}
