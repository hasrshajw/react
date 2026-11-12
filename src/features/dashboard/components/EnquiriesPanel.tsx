import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  Check, Search, X, MessageCircle, ChevronDown, Phone, Mail, PhoneCall, Clock, Ban, Download, Copy,
} from "../../../components/Icons";
import { ENQ_LABEL, copyText, exportCsv, fmtDateTime, followDue, timeAgo, waLink } from "../../../lib/dashboardData";
import { useEscape } from "../../../hooks/useEscape";
import type { Enquiry, EnquiryStatus, EnquiryTab, Notify } from "../../../types/dashboard";

interface Props {
  slot: HTMLElement | null;
  enquiries: Enquiry[];
  now: number;
  tab: EnquiryTab;
  onTab: (tab: EnquiryTab) => void;
  onClose: () => void;
  onSetStatus: (id: string, status: EnquiryStatus) => void;
  onSaveNote: (id: string, value: string) => void;
  onSetFollowDate: (id: string, date: string) => void;
  notify: Notify;
}

export function EnquiriesPanel({ slot, enquiries, now, tab, onTab, onClose, onSetStatus, onSaveNote, onSetFollowDate, notify }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const asideRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEscape(true, onClose);
  useEffect(() => { asideRef.current?.focus({ preventScroll: true }); }, []);
  if (!slot) return null;

  const count = (s: EnquiryStatus) => enquiries.filter((e) => e.status === s).length;
  const newCount = count("new");
  const tabs: { key: EnquiryTab; label: string; count: number }[] = [
    { key: "new", label: "New", count: newCount },
    { key: "followup", label: "Follow-up", count: count("followup") },
    { key: "cancelled", label: "Cancelled", count: count("cancelled") },
    { key: "all", label: "All", count: enquiries.length },
  ];
  const idx = Math.max(0, tabs.findIndex((t) => t.key === tab));
  const term = search.trim().toLowerCase();
  const list = enquiries.filter(
    (e) =>
      (tab === "all" || e.status === tab) &&
      (!term || [e.name, e.phone, e.email, e.message, e.note || ""].some((s) => s.toLowerCase().includes(term)))
  );
  const emptyByTab: Record<EnquiryTab, string[]> = {
    new: ["All caught up", "No new enquiries."],
    followup: ["Nothing pending", "No enquiries need a follow-up."],
    called: ["No called enquiries", "Enquiries you have called will appear here."],
    cancelled: ["No cancelled enquiries", "Cancelled enquiries will appear here."],
    all: ["No enquiries yet", "Website enquiries will show up here."],
  };
  const empty: string[] = term ? ["No matches", "Try a different name, phone or email."] : emptyByTab[tab];

  const onTabKey = (ev: KeyboardEvent) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(ev.key)) return;
    ev.preventDefault();
    let n: number;
    if (ev.key === "ArrowRight") n = (idx + 1) % tabs.length;
    else if (ev.key === "ArrowLeft") n = (idx - 1 + tabs.length) % tabs.length;
    else if (ev.key === "Home") n = 0;
    else n = tabs.length - 1;
    onTab(tabs[n].key);
    tabRefs.current[n]?.focus();
  };

  return createPortal(
    <aside className="dash-side-panel" aria-label="Site enquiries" ref={asideRef} tabIndex={-1}>
      <div className="dp-head">
        <div className="dp-title">
          <b><span className="live-dot red" />Site enquiries</b>
          <small><span className="red">{newCount} new</span> of {enquiries.length} enquiries</small>
        </div>
        <div className="dp-actions">
          <button type="button" className="icon-btn" aria-label="Close enquiries" onClick={onClose}><X size={16} /></button>
        </div>
      </div>

      <div className="dx-seg" role="tablist" aria-label="Filter enquiries" style={{ "--i": idx, "--n": tabs.length }} onKeyDown={onTabKey}>
        <span className="dx-seg-thumb" aria-hidden="true" />
        {tabs.map((t, i) => (
          <button
            key={t.key} type="button" role="tab" id={`enq-tab-${t.key}`} aria-selected={tab === t.key} aria-controls="enq-tabpanel"
            tabIndex={tab === t.key ? 0 : -1} ref={(el) => { tabRefs.current[i] = el; }}
            className={`t-${t.key}${tab === t.key ? " on" : ""}`} onClick={() => onTab(t.key)}
          >
            {t.label} <em>{t.count}</em>
          </button>
        ))}
      </div>

      <label className="dx-enq-search">
        <Search size={15} />
        <input type="search" placeholder="Search name, phone or email" aria-label="Search enquiries" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>

      <div className="dx-req-list" role="tabpanel" id="enq-tabpanel" aria-labelledby={`enq-tab-${tab}`}>
        {list.length === 0 && (
          <div className="dx-empty-mini"><Check size={22} /><b>{empty[0]}</b><span>{empty[1]}</span></div>
        )}
        {list.map((e) => {
          /* On the New tab, new enquiries are always fully shown. Everywhere else (All, search) they collapse like the rest. */
          const pinned = e.status === "new" && tab === "new";
          const open = pinned || openId === e.id;
          const avatar = e.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
          const due = followDue(e);
          const chips = (
            <>
              {(due === "overdue" || due === "today") && (
                <span className={`chip enq-due ${due}`}>{due === "overdue" ? "Overdue" : "Due today"}</span>
              )}
              <span className={`chip enq-${e.status}`}>{ENQ_LABEL[e.status]}</span>
            </>
          );
          return (
            <div className={`dx-enq ${e.status}${open ? " open" : ""}`} key={e.id}>
              {pinned ? (
                <div className="dx-enq-top static">
                  <div className="row-avatar">{avatar}</div>
                  <b className="dx-enq-name">{e.name}</b>
                  {chips}
                </div>
              ) : (
                <button
                  type="button" className="dx-enq-top" aria-expanded={open} aria-controls={`enq-body-${e.id}`}
                  onClick={() => setOpenId(open ? null : e.id)}
                >
                  <div className="row-avatar">{avatar}</div>
                  <b className="dx-enq-name">{e.name}</b>
                  {chips}
                  <ChevronDown size={18} className="dx-chev" />
                </button>
              )}

              <div className="dx-enq-collapse" id={`enq-body-${e.id}`}>
                <div>
                  <div className="dx-enq-body">
                    <small className="dx-enq-time" title={fmtDateTime(e.createdAt)}><Clock size={11} /> {timeAgo(e.createdAt, now)}</small>
                    <p className="dx-enq-msg">{e.message}</p>

                    <div className="dx-enq-meta">
                      <span className="dx-meta-row">
                        <span className="dx-meta-text"><Phone size={13} /> {e.phone}</span>
                        <button type="button" className="mini-btn" aria-label={`Copy ${e.name}'s phone number`} title="Copy phone" onClick={() => copyText(e.phone, "Phone copied", notify)}>
                          <Copy size={13} />
                        </button>
                      </span>
                      <a href={`mailto:${e.email}`}><Mail size={13} /> {e.email}</a>
                    </div>

                    <div className="dx-enq-actions">
                      <a className="act-btn" href={`tel:${e.phone.replace(/\s/g, "")}`}><Phone size={14} /> Call</a>
                      <a className="act-btn wa" href={waLink(e)} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> WhatsApp</a>
                    </div>

                    {e.status === "followup" && (
                      <label className="dx-field">
                        <span>Follow up on</span>
                        <input type="date" value={e.followUpDate || ""} onChange={(ev) => onSetFollowDate(e.id, ev.target.value)} />
                      </label>
                    )}

                    <label className="dx-field">
                      <span>Internal note</span>
                      <textarea
                        key={`${e.id}-${e.note || ""}`} rows={2} defaultValue={e.note || ""} placeholder="Only visible to you"
                        onBlur={(ev) => onSaveNote(e.id, ev.target.value)}
                      />
                    </label>

                    {e.history?.length > 0 && (
                      <ul className="dx-hist" aria-label="Activity">
                        {[...e.history].reverse().map((h, i) => (
                          <li key={i}><span className={`dot ${h.status}`} /> {ENQ_LABEL[h.status]} · {fmtDateTime(h.at)}</li>
                        ))}
                      </ul>
                    )}

                    <div className="dx-enq-actions">
                      {e.status !== "called" && (
                        <button type="button" className="act-btn solid" onClick={() => onSetStatus(e.id, "called")}>
                          <PhoneCall size={14} /> Mark called
                        </button>
                      )}
                      {e.status !== "followup" && (
                        <button type="button" className="act-btn" onClick={() => onSetStatus(e.id, "followup")}>
                          <Clock size={14} /> Need follow-up
                        </button>
                      )}
                      {e.status !== "cancelled" && (
                        <button type="button" className="act-btn cancel" onClick={() => onSetStatus(e.id, "cancelled")}>
                          <Ban size={14} /> Cancelled
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dx-drawer-foot">
        <button type="button" className="act-btn" onClick={() => exportCsv(enquiries, notify)}><Download size={14} /> Export CSV</button>
      </div>
    </aside>,
    slot
  );
}
