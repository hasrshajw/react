import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  Check, Search, X, MessageCircle, ChevronDown, Phone, Mail, PhoneCall, Clock, Ban, Download, Copy,
} from "../../../components/Icons";
import { Loading, SkText } from "../../../components/Skeleton";
import { ENQ_LABEL, copyText, exportCsv, fmtDateTime, followDue, timeAgo, waLink } from "../../../lib/dashboardData";
import { fetchEnquiries, type EnquirySummary } from "../../../lib/api";
import { useEscape } from "../../../hooks/useEscape";
import type { Enquiry, EnquiryStatus, EnquiryTab, Notify } from "../../../types/dashboard";

interface Props {
  slot: HTMLElement | null;
  /** The rows read so far for this tab and search (10 at a time). */
  enquiries: Enquiry[];
  /** Counts for the tabs and the title, from the database summary. */
  counts: EnquirySummary;
  loading: boolean;
  hasMore: boolean;
  moreBusy: boolean;
  onMore: () => void;
  search: string;
  onSearch: (value: string) => void;
  now: number;
  tab: EnquiryTab;
  onTab: (tab: EnquiryTab) => void;
  onClose: () => void;
  onSetStatus: (id: string, status: EnquiryStatus) => void;
  onSaveNote: (id: string, value: string) => void;
  onSetFollowDate: (id: string, date: string) => void;
  notify: Notify;
}

/** Placeholder for one enquiry card while the list loads. The New tab shows its cards fully open, the other tabs show them collapsed
 *  (name, status, chevron), exactly like the real ones. Only the person's data is ghosted; labels and buttons are shown as they are. */
function EnquirySkeleton({ open }: { open: boolean }) {
  return (
    <div className={`dx-enq${open ? " open" : ""}`} aria-hidden="true">
      <div className="dx-enq-top static">
        <div className="row-avatar sk-bg">AB</div>
        <b className="dx-enq-name"><SkText w={14} /></b>
        <span className="chip sk-bg">New</span>
        {!open && <ChevronDown size={18} className="dx-chev" />}
      </div>
      {open && (
        <div className="dx-enq-collapse">
          <div>
            <div className="dx-enq-body">
              <small className="dx-enq-time"><Clock size={11} /> <SkText w={8} /></small>
              <p className="dx-enq-msg"><SkText w={36} /><br /><SkText w={22} /></p>
              <div className="dx-enq-meta">
                <span className="dx-meta-row"><span className="dx-meta-text"><Phone size={13} /> <SkText w={12} /></span></span>
                <span className="dx-meta-text"><Mail size={13} /> <SkText w={20} /></span>
              </div>
              <div className="dx-enq-actions">
                <span className="act-btn sk-bg"><Phone size={14} /> Call</span>
                <span className="act-btn sk-bg"><MessageCircle size={14} /> WhatsApp</span>
              </div>
              <label className="dx-field">
                <span>Internal note</span>
                <textarea className="sk-bg" rows={2} disabled tabIndex={-1} />
              </label>
              <div className="dx-enq-actions">
                <span className="act-btn solid sk-bg"><PhoneCall size={14} /> Mark called</span>
                <span className="act-btn sk-bg"><Clock size={14} /> Need follow-up</span>
                <span className="act-btn sk-bg"><Ban size={14} /> Cancelled</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function EnquiriesPanel({ slot, enquiries, counts, loading, hasMore, moreBusy, onMore, search, onSearch, now, tab, onTab, onClose, onSetStatus, onSaveNote, onSetFollowDate, notify }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEscape(true, onClose);
  useEffect(() => { asideRef.current?.focus({ preventScroll: true }); }, []);
  if (!slot) return null;

  const newCount = counts.new;
  const tabs: { key: EnquiryTab; label: string; count: number }[] = [
    { key: "new", label: "New", count: counts.new },
    { key: "followup", label: "Follow-up", count: counts.followup },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled },
    { key: "all", label: "All", count: counts.total },
  ];
  const idx = Math.max(0, tabs.findIndex((t) => t.key === tab));
  const term = search.trim().toLowerCase();
  /* The database already applied the tab and the search; the tab filter here only takes a row off the screen at once when its status is changed. */
  const list = enquiries.filter((e) => tab === "all" || e.status === tab);
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
          <small><span className="red">{newCount} new</span> of {counts.total} enquiries</small>
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
        <input type="search" placeholder="Search name, phone or email" aria-label="Search enquiries" value={search} onChange={(e) => onSearch(e.target.value)} />
      </label>

      <div className="dx-req-list" role="tabpanel" id="enq-tabpanel" aria-labelledby={`enq-tab-${tab}`}>
        {loading && list.length === 0 && (
          <>
            <Loading label="Loading enquiries" />
            {Array.from({ length: tab === "new" ? 2 : 4 }, (_, i) => <EnquirySkeleton key={i} open={tab === "new"} />)}
          </>
        )}
        {!loading && list.length === 0 && (
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

      {hasMore && (
        <div className="dx-drawer-foot">
          <button type="button" className="act-btn" disabled={moreBusy} onClick={onMore}>{moreBusy ? "Loading…" : "More"}</button>
        </div>
      )}

      <div className="dx-drawer-foot">
        <button
          type="button" className="act-btn" disabled={exporting}
          onClick={() => {
            /* The CSV holds every enquiry, so they are read now, once, and only for this click. */
            setExporting(true);
            fetchEnquiries().then((rows) => exportCsv(rows, notify), () => notify("Couldn’t export enquiries. Try again.")).finally(() => setExporting(false));
          }}
        ><Download size={14} /> {exporting ? "Exporting…" : "Export CSV"}</button>
      </div>
    </aside>,
    slot
  );
}
