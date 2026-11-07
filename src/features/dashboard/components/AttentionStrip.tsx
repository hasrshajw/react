import { ChevronRight } from "../../../components/Icons";

export interface AttentionItem {
  key: string;
  tone: "danger" | "warn" | "info";
  count: number;
  label: string;
  run: () => void;
}

export function AttentionStrip({ items }: { items: AttentionItem[] }) {
  if (!items.length) return null;
  return (
    <section className="attn" aria-label="Needs attention">
      <b>Needs attention</b>
      <div className="attn-list">
        {items.map((a) => (
          <button key={a.key} type="button" className={`attn-item ${a.tone}`} onClick={a.run}>
            <span className="attn-n">{a.count}</span>
            {a.label}
            <ChevronRight size={14} />
          </button>
        ))}
      </div>
    </section>
  );
}
