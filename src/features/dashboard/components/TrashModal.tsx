import {
  Trash2, RotateCcw,
} from "../../../components/Icons";
import { DAY, TRASH_DAYS, coupleName, fmtDate, initials } from "../../../lib/dashboardData";
import type { TrashItem } from "../../../types/dashboard";
import { Modal } from "./Modal";

interface Props {
  items: TrashItem[];
  onRestore: (id: string) => void;
  onClose: () => void;
}

export function TrashModal({ items, onRestore, onClose }: Props) {
  return (
    <Modal title="Trash" subtitle={`Deleted invitations are kept for ${TRASH_DAYS} days`} width={440} onClose={onClose}>
      <div className="dx-trash">
        {items.length === 0 ? (
          <div className="dx-empty-mini"><Trash2 size={22} /><b>Trash is empty</b><span>Deleted invitations show up here.</span></div>
        ) : items.map(({ row, at }) => (
          <div className="dx-trash-row" key={row.id}>
            <div className="row-avatar">{initials(row)}</div>
            <div className="dx-req-main">
              <b>{coupleName(row)}</b>
              <small>Deleted {fmtDate(at)} · removed for good {fmtDate(at + TRASH_DAYS * DAY)}</small>
            </div>
            <button type="button" className="act-btn" onClick={() => onRestore(row.id)}><RotateCcw size={14} /> Restore</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
