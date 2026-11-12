import { useState } from "react";
import {
  Link2, Download,
} from "../../../components/Icons";
import { coupleName, getInviteLink } from "../../../lib/dashboardData";
import { useQr } from "../../../hooks/useQr";
import { downloadBlob } from "../../../lib/download";
import { qrPngBlob } from "../../../lib/qr";
import type { InvitationRow } from "../../../types/dashboard";
import { Modal } from "./Modal";

interface Props {
  row: InvitationRow;
  onClose: () => void;
  onCopy: (x: InvitationRow) => void;
}

export function QrModal({ row, onClose, onCopy }: Props) {
  const link = getInviteLink(row);
  const { url, failed } = useQr(link, 240);
  const loaded = !!url;
  const [busy, setBusy] = useState(false);
  const fileName = `${coupleName(row).replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-qr.png`;

  /* Drawn in the browser (M-3) and saved as a file, so nothing is sent to another site. */
  const download = async () => {
    setBusy(true);
    try { downloadBlob(await qrPngBlob(link), fileName); } catch { /* the button just becomes usable again */ }
    setBusy(false);
  };

  return (
    <Modal title="QR code" subtitle={coupleName(row)} width={360} onClose={onClose}>
      <div className="dx-qr">
        <div className="dx-qr-ph">
          {failed ? (
            "Couldn't create the QR code."
          ) : (
            <>
              {!loaded && <i className="sk" />}
              {url && <img src={url} alt={`QR code for ${coupleName(row)}`} width="220" height="220" />}
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
