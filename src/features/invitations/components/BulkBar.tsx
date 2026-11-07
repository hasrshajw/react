import { Download, EyeOff, Globe, Trash2, X } from "../../../components/Icons";
import { fmt } from "../../../lib/dashboardData";

interface Props {
  selected: number;
  total: number;
  onSelectAll: () => void;
  onPublish: (live: boolean) => void;
  onExport: () => void;
  onTrash: () => void;
  onClear: () => void;
}

export function BulkBar({ selected, total, onSelectAll, onPublish, onExport, onTrash, onClear }: Props) {
  return (
    <div className="bulk-bar" role="region" aria-label="Bulk actions">
      <b>{selected} selected</b>
      {selected < total && (
        <button type="button" className="link-btn" onClick={onSelectAll}>Select all {fmt(total)}</button>
      )}
      <span className="bulk-spacer" />
      <button type="button" className="act-btn" onClick={() => onPublish(true)}><Globe size={14} /> Publish</button>
      <button type="button" className="act-btn" onClick={() => onPublish(false)}><EyeOff size={14} /> Move to draft</button>
      <button type="button" className="act-btn" onClick={onExport}><Download size={14} /> Export CSV</button>
      <button type="button" className="act-btn danger" onClick={onTrash}><Trash2 size={14} /> Move to trash</button>
      <button type="button" className="icon-btn" aria-label="Clear selection" onClick={onClear}><X size={16} /></button>
    </div>
  );
}
