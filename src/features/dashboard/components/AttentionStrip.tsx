import { ChevronRight } from "../../../components/Icons";

export interface AttentionItem {
  key: string;
  tone: "danger" | "warn" | "info";
  count: number;
  label: string;
  run: () => void;
}

const SAMPLE_LABELS = ["1 new enquiry waiting over 24h", "2 follow-ups due or overdue", "1 published with no views", "1 draft invitation with an event in 7 days"];

/** `expected` is how many items the last visit had. The strip only exists when something needs attention,
 *  so a placeholder is drawn only if it was there last time (otherwise nothing would be shown, and nothing jumps). */
export function AttentionStrip({ items, loading = false, expected = 0 }: { items: AttentionItem[]; loading?: boolean; expected?: number }) {
  if (loading) {
    if (!expected) return null;
    return (
      <section className="attn" aria-hidden="true">
        <b>Needs attention</b>
        <div className="attn-list">
          {SAMPLE_LABELS.slice(0, Math.min(expected, 3)).map((l) => (
            <span key={l} className="attn-item sk-bg"><span className="attn-n">1</span>{l}<ChevronRight size={14} /></span>
          ))}
        </div>
      </section>
    );
  }
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
