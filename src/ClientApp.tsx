import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, Route, Routes, useBlocker, useNavigate, useParams } from "react-router-dom";
import { RoleGate } from "./components/RoleGate";
import { Loading, Sk } from "./components/Skeleton";
import { Mails, CalendarDays, Clock, AlertCircle, CheckCircle2, ChevronLeft, Eye, Loader2, LogOut, Save } from "./components/Icons";
import {
  CLIENT_STATUS_LABEL,
  clientStatus,
  invitationToForm,
} from "./features/client/invitationToForm";
import { CreateForm } from "./features/create/CreateForm";
import { LivePreview, type FocusRequest } from "./features/create/components/LivePreview";
import { SectionNav } from "./features/create/components/SectionNav";
import { EN_TO_TE, PROGRESS_IDS, SECTIONS, uid } from "./features/create/constants";
import { scrollToSection } from "./features/create/scroll";
import { useTransliteration } from "./features/create/hooks/useTransliteration";
import { formReducer, initialFormState, snapshot } from "./features/create/formReducer";
import { useToast } from "./features/create/hooks/useToast";
import { useBeforeUnload } from "./features/create/hooks/useUnsavedWarnings";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { useEscape, useFocusTrap } from "./hooks/useEscape";
import { useAsync } from "./hooks/useAsync";
import {
  acknowledgeRejection,
  ApiError,
  fetchClientTemplateHtml,
  fetchMyInvitations,
  submitChangeRequest,
  withdrawChangeRequest,
  type MyInvitation,
} from "./lib/api";
import { compile } from "./lib/compileInvitation";
import { ADMIN_EMAIL } from "./lib/config";
import { readJSON, removeKey, writeJSON } from "./lib/storage";
import { LS_CLIENT_DRAFT } from "./lib/storageKeys";
import { fmtDate, fmtDateTime } from "./lib/dashboardData";
import { has, validateInvitation } from "./lib/validate";
import type { ContactItem, EventItem, InvitationData, ListField, SectionId } from "./types/invitation";
import createCss from "./features/create/create.css?inline";
import clientWsCss from "./features/client/clientWorkspace.css?inline";
import schedyMark from "./assets/schedy-mark.svg";

/* Track B (B4 shell + B6 client editor). Separate chunk so clients never download admin code. */

/* Mobile-first: comfortable padding and min 44px touch targets on small screens. */
const page: React.CSSProperties = {
  maxWidth: 720, margin: "0 auto", padding: "16px 12px 96px",
  fontFamily: '"DM Sans", "Noto Sans Telugu", Inter, system-ui, sans-serif', color: "var(--dark)",
  boxSizing: "border-box", width: "100%",
};

function Frame({ children, title = "Your invitations" }: { children: React.ReactNode; title?: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · Schedy`;
    return () => { document.title = prev; };
  }, [title]);
  return (
    <main className="client-frame-main" style={page}>
      <style>{`
        @media (min-width: 480px) {
          .client-frame-main { padding: 32px 24px 96px !important; }
        }
        .client-header { flex-wrap: wrap; }
        .client-touch { min-height: 44px; transition: all 0.15s ease; }
        .client-link { display: inline-flex; align-items: center; min-height: 44px; color: var(--primary); font-weight: 600; text-decoration: none; }
        .client-link:hover { text-decoration: underline; }
        .client-frame-main :focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .client-touch, .premium-card { transition: none; transform: none !important; } }
        .client-touch:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .premium-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
        }
        .premium-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.06);
          transform: translateY(-2px);
        }
      `}</style>
      <div className="client-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.25 }}>{title}</h1>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "#6b7280" }}>Manage your wedding invitation details and submit updates.</p>
        </div>
        <button
          type="button"
          className="client-touch"
          style={{ ...btnGhost, padding: "8px 14px", fontSize: 14 }}
          onClick={() => navigate("/login", { replace: true, state: { loggedOut: true } })}
        >
          Log out
        </button>
      </div>
      {children}
    </main>
  );
}

const btnGhost: React.CSSProperties = {
  border: "1px solid #d1d5db", background: "#fff", borderRadius: 8, padding: "10px 14px", cursor: "pointer", font: "inherit",
};
const btnPrimary: React.CSSProperties = {
  border: 0, background: "var(--btn)", color: "#fff", borderRadius: 10, padding: "12px 18px", cursor: "pointer", font: "inherit", fontWeight: 600,
};
const btnDanger: React.CSSProperties = {
  ...btnGhost, color: "#b91c1c", borderColor: "#fca5a5",
};
const banner: React.CSSProperties = {
  padding: "12px 14px", borderRadius: 12, marginBottom: 16, fontSize: 14, lineHeight: 1.45,
};

function Landing() {
  const { session } = useAuth();
  const { data, loading, error } = useAsync(fetchMyInvitations);
  if (loading) {
    return (
      <Frame>
        <Loading label="Loading invitations" />
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
              <Sk h={16} w="40%" r={6} style={{ marginBottom: 8 }} />
              <Sk h={12} w="24%" r={6} />
            </li>
          ))}
        </ul>
      </Frame>
    );
  }
  if (error || !data) {
    return (
      <Frame>
        <p role="alert">We couldn’t load your invitations. Check your connection and try again.</p>
        <button type="button" className="client-touch" style={btnPrimary} onClick={() => window.location.reload()}>Try again</button>
      </Frame>
    );
  }
    if (data.length === 0) {
    /* B7: Premium empty state for no invitations (78th/79th/80th update). Email confirmation disabled per owner decision. */
    return (
      <Frame>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "40px 20px", marginTop: "20px",
          background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)"
        }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%", background: "#f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px"
          }}>
            <Mails size={32} color="#9ca3af" />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 600, color: "#111827" }}>
            No invitations to show
          </h2>
          {session?.email ? (
            <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: "14px", lineHeight: 1.5, maxWidth: "400px" }}>
              You are signed in as <b style={{ color: "#374151" }}>{session.email}</b>.<br />
              Please ensure you are using the email address your invitation was sent to.
            </p>
          ) : (
            <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: "14px", lineHeight: 1.5, maxWidth: "400px" }}>
              Please sign in with the email address your invitation was set up with.
            </p>
          )}
          {ADMIN_EMAIL && (
            <a
              href={`mailto:${ADMIN_EMAIL}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", borderRadius: "8px", background: "#f9fafb",
                border: "1px solid #e5e7eb", color: "#374151", fontSize: "14px",
                fontWeight: 500, textDecoration: "none", transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.borderColor = "#d1d5db"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
            >
              Contact the admin
            </a>
          )}
        </div>
      </Frame>
    );
  }
  if (data.length === 1) return <Navigate to={`/my/${encodeURIComponent(data[0].id)}`} replace />;
  return (
    <Frame>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 }}>
        {data.map((i) => {
          const st = clientStatus(i);
          const label = [i.groomName, i.brideName].filter(Boolean).join(" & ") || "Your invitation";
          return (
            <li key={i.id}>
              <Link
                to={`/my/${encodeURIComponent(i.id)}`}
                className="client-touch premium-card"
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                  padding: "20px", textDecoration: "none", color: "inherit",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{label}</span>
                  {i.eventDate && (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#6b7280" }}>
                      <CalendarDays size={16} color="#6b7280" /> {fmtDate(i.eventDate)}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: 12, whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 999, fontWeight: 600,
                  background: st === "pending" ? "#fffbeb" : st === "rejected" ? "#fef2f2" : st === "live" ? "#ecfdf5" : "#f9fafb",
                  color: st === "pending" ? "#92400e" : st === "rejected" ? "#991b1b" : st === "live" ? "#166534" : "#4b5563",
                  border: `1px solid ${st === "pending" ? "#fcd34d" : st === "rejected" ? "#fecaca" : st === "live" ? "#a7f3d0" : "#e5e7eb"}`,
                }}>
                  {CLIENT_STATUS_LABEL[st]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {/* M-5 / B7: my_invitations is capped at 500 so we never hit the PostgREST 1,000-row default. */}
      {data.length >= 500 && (
        <p style={{ marginTop: 14, fontSize: 13, color: "#6b7280" }} role="status">
          Showing the first 500 invitations linked to this email. Contact the admin if you need an older one.
        </p>
      )}
    </Frame>
  );
}

type ClientDraft = { data: InvitationData; at: number };

/* Modal shown when someone tries to leave with unsaved edits: traps focus, closes on Esc, keeps a local draft if they leave. */
function LeavePrompt({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(true, onStay);
  useFocusTrap(ref);
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 16, background: "rgba(16,16,17,.5)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onStay(); }}
    >
      <div
        ref={ref} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="client-leave-title" aria-describedby="client-leave-desc"
        style={{ width: "100%", maxWidth: 420, boxSizing: "border-box", padding: 24, borderRadius: 16, background: "#fff", boxShadow: "0 16px 40px rgba(24,28,45,.25)", fontFamily: '"DM Sans", "Noto Sans Telugu", Inter, system-ui, sans-serif', color: "var(--dark)" }}
      >
        <h2 id="client-leave-title" style={{ margin: "0 0 8px", fontSize: 18 }}>Leave without submitting?</h2>
        <p id="client-leave-desc" style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.5, color: "var(--gray-dark)" }}>
          You have unsaved changes. If you leave, a draft is kept on this device until you submit or sign out.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="client-touch" style={{ ...btnPrimary, flex: 1 }} onClick={onStay}>Keep editing</button>
          <button type="button" className="client-touch" style={{ ...btnGhost, flex: 1 }} onClick={onLeave}>Leave</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* The client sees the same sections as the admin form, minus the ones the admin owns (template, client access). */
const CLIENT_SECTIONS = SECTIONS.filter((x) => x.id !== "template" && x.id !== "client");
const CLIENT_PROGRESS = PROGRESS_IDS.filter((x) => x !== "template");

/* "Submit for review?" dialog. Same look as the admin dialogs (cx-modal); traps focus and closes on Esc. */
function SubmitConfirm({ busy, onConfirm, onCancel }: { busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(!busy, onCancel);
  useFocusTrap(ref);
  return createPortal(
    <div className="cx-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div className="cx-modal lv" ref={ref} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="sc-title" aria-describedby="sc-desc">
        <div className="cx-ok"><Save size={28} /></div>
        <h3 id="sc-title">Submit for review?</h3>
        <p id="sc-desc">Your changes go live only after the admin approves them. You can withdraw the request until then.</p>
        <div className="cx-grid lv-actions">
          <button type="button" className="primary" disabled={busy} onClick={onConfirm}>
            {busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {busy ? "Submitting…" : "Submit for review"}
          </button>
          <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ClientEditor() {
  const { id = "" } = useParams();
  const { session } = useAuth();
  const [list, setList] = useState<MyInvitation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadList = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchMyInvitations().then(
      (d) => { setList(d); setLoading(false); },
      () => { setError(true); setLoading(false); },
    );
  }, []);
  useEffect(() => { loadList(); }, [loadList]);
  const reload = loadList;
  const { toast, notify } = useToast();
  const [state, dispatch] = useReducer(formReducer, null, () => initialFormState(id));
  const { data, snap, touched, submitted } = state;
  const [templateHtml, setTemplateHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [ready, setReady] = useState(false);
  const [draftOffer, setDraftOffer] = useState<ClientDraft | null>(null);
  const [tplLoading, setTplLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const headBtnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const schedule = useTransliteration();
  /* "Edit Again" on a rejected request keeps the proposed edits in the form; "Dismiss" goes back to the live version. */
  const keepRef = useRef<InvitationData | null>(null);
  const emailKey = (session?.email || "anon").trim().toLowerCase();
  const draftKey = `${LS_CLIENT_DRAFT}${emailKey}:${id}`;

  const inv = useMemo(() => list?.find((i) => i.id === id) ?? null, [list, id]);
  const pending = inv?.request?.status === "pending";
  const rejectedOpen = inv?.request?.status === "rejected" && !inv.request.acknowledgedAt;
  const approvedOpen = inv?.request?.status === "approved" && !inv.request.acknowledgedAt;
  /* B7: invitation was trashed / client email changed / unpublished while a request was open. */
  const superseded = inv?.request?.status === "superseded";

  useEffect(() => {
    if (!inv) return;
    const preferProposed = inv.request?.status === "pending"
      || (inv.request?.status === "rejected" && !inv.request.acknowledgedAt);
    const form = invitationToForm(inv, !!preferProposed);
    dispatch({ type: "load", data: form });
    setReady(true);
    if (keepRef.current) {
      dispatch({ type: "replaceData", data: keepRef.current });
      keepRef.current = null;
      setDraftOffer(null);
    } else if (!preferProposed) {
      const draft = readJSON<ClientDraft | null>(draftKey, null);
      if (draft?.data && snapshot({ ...form, ...draft.data }) !== snapshot(form)) {
        setDraftOffer(draft);
      } else {
        setDraftOffer(null);
      }
    } else {
      setDraftOffer(null);
    }
    let live = true;
    setTplLoading(true);
    fetchClientTemplateHtml(inv.id).then(
      (html) => { if (live) { setTemplateHtml(html || ""); setTplLoading(false); } },
      () => { if (live) { setTemplateHtml(""); setTplLoading(false); } },
    );
    return () => { live = false; };
  }, [inv]);

  const dirty = useMemo(() => snapshot(data) !== snap, [data, snap]);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty && !pending;

  useBeforeUnload(dirty && !pending);

  const blocker = useBlocker(
    useCallback(({ currentLocation, nextLocation }: { currentLocation: { key: string }; nextLocation: { key: string } }) =>
      dirtyRef.current && currentLocation.key !== nextLocation.key, []),
  );

  /* Autosave local draft (scoped per signed-in email + invitation). Cleared on sign-out via M-1. */
  useEffect(() => {
    if (!ready || draftOffer || pending) return;
    if (!dirty) { removeKey(draftKey); return; }
    const t = window.setTimeout(() => writeJSON(draftKey, { data, at: Date.now() }), 800);
    return () => window.clearTimeout(t);
  }, [data, dirty, ready, draftOffer, draftKey, pending]);

  const errors = useMemo(() => validateInvitation(data), [data]);
  const vis = useCallback(
    (key: string) => ((submitted || touched[key]) ? errors[key]?.msg : undefined),
    [submitted, touched, errors],
  );
  /* English typing fills the Telugu fields, exactly like the admin form. */
  const set = useCallback(<K extends keyof InvitationData>(key: K, value: InvitationData[K]) => {
    dispatch({ type: "field", key, value });
    const target = EN_TO_TE[key as keyof typeof EN_TO_TE];
    if (target && typeof value === "string") schedule(`${key}:${target}`, value, (te) => dispatch({ type: "field", key: target, value: te }));
  }, [schedule]);
  const add = useCallback((field: ListField, make: () => EventItem | ContactItem) => {
    dispatch({ type: "addItem", field, item: make() });
  }, []);
  const patch = useCallback((field: ListField, id: string, p: Partial<EventItem & ContactItem>) => {
    dispatch({ type: "patchItem", field, id, patch: p });
    if (field === "events") {
      if (p.name !== undefined) schedule(`event-${id}-name`, p.name, (te) => dispatch({ type: "patchItem", field, id, patch: { nameTe: te } }));
      if (p.venue !== undefined) schedule(`event-${id}-venue`, p.venue, (te) => dispatch({ type: "patchItem", field, id, patch: { venueTe: te } }));
    }
  }, [schedule]);
  const remove = useCallback((field: ListField, id: string) => {
    dispatch({ type: "removeItem", field, id });
  }, []);
  const touch = useCallback((key: string) => dispatch({ type: "touch", key }), []);
  const focus = useCallback((field: string) => setFocusRequest({ field, id: uid() }), []);
  const sectionLoading = useMemo<Record<SectionId, boolean>>(
    () => ({
      template: !ready, family: !ready, groom: !ready, bride: !ready,
      venue: !ready, seo: !ready, events: !ready, client: !ready,
    }),
    [ready],
  );
  const issues = useMemo(() => {
    const n: Record<string, number> = {};
    Object.entries(errors).forEach(([k, v]) => { if (submitted || touched[k]) n[v.section] = (n[v.section] || 0) + 1; });
    return n;
  }, [errors, touched, submitted]);
  const done = useMemo<Record<string, boolean>>(() => ({
    family: has(data.weddingDate),
    groom: has(data.groomEn),
    bride: has(data.brideEn),
    venue: has(data.venueEn) || has(data.venueAddress),
    seo: has(data.seoTitle) || has(data.seoDescription) || has(data.seoImage),
    events: data.events.length > 0,
  }), [data.weddingDate, data.groomEn, data.brideEn, data.venueEn, data.venueAddress, data.events.length, data.seoTitle, data.seoDescription, data.seoImage]);
  const doneCount = CLIENT_PROGRESS.filter((x) => done[x]).length;
  const tagFor = useCallback((sec: SectionId): { tone: string; text: string; loading?: boolean } => {
    const def = SECTIONS.find((x) => x.id === sec)!;
    if (!ready) return { tone: "", text: "Required", loading: true };
    if (issues[sec]) return { tone: "bad", text: `${issues[sec]} to fix` };
    if (done[sec]) return { tone: "ok", text: "Done" };
    return { tone: "", text: def.hint === "required" ? "Required" : def.hint === "recommended" ? "Recommended" : "Optional" };
  }, [ready, issues, done]);

  const compiled = useMemo(() => {
    try { return templateHtml ? compile(templateHtml, data) : ""; }
    catch { return ""; }
  }, [templateHtml, data]);

  const selectedInfo = useMemo(() => (templateHtml && inv ? { id: inv.id, name: "Your invitation" } : undefined), [templateHtml, inv]);
  const title = [inv?.groomName, inv?.brideName].filter(Boolean).join(" & ") || "Your invitation";
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · Schedy`;
    return () => { document.title = prev; };
  }, [title]);

  /* Opens the confirm dialog only when the form is valid; otherwise jumps to the first field that needs attention. */
  const requestSubmit = () => {
    if (!inv || pending || busy) return;
    dispatch({ type: "submit" });
    const keys = Object.keys(errors);
    if (keys.length) {
      notify(`Fix ${keys.length} ${keys.length === 1 ? "field" : "fields"} before submitting`, "error");
      const [key, { section }] = Object.entries(errors)[0];
      scrollToSection(section);
      window.setTimeout(() => document.getElementById(`f-${key}`)?.focus({ preventScroll: true }), 450);
      return;
    }
    if (!dirty) { notify("No changes to submit"); return; }
    setConfirmSubmit(true);
  };

  const doSubmit = async () => {
    if (!inv || pending || busy) return;
    dispatch({ type: "submit" });
    if (Object.keys(errors).length) {
      notify("Fix the highlighted fields before submitting", "error");
      return;
    }
    if (!dirty) {
      notify("No changes to submit");
      return;
    }
    setBusy(true);
    try {
      const details = { ...data } as Record<string, unknown>;
      delete details.clientEmail;
      await submitChangeRequest(inv.id, details as MyInvitation["details"], inv.updatedAt);
      notify("Submitted for review");
      setConfirmSubmit(false);
      removeKey(draftKey);
      setDraftOffer(null);
      dispatch({ type: "load", data });
      reload();
    } catch (e) {
      /* B7 double-submit / two tabs: unique index or exists check returns a readable message; reload so the pending banner appears. */
      notify(e instanceof ApiError ? e.message : "Couldn’t submit changes", "error");
      setConfirmSubmit(false);
      reload();
    } finally {
      setBusy(false);
    }
  };

  const onWithdraw = async () => {
    if (!inv?.request || busy) return;
    setBusy(true);
    try {
      await withdrawChangeRequest(inv.request.id);
      notify("Request withdrawn");
      reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Couldn’t withdraw", "error");
    } finally {
      setBusy(false);
    }
  };

  const onAck = async () => {
    if (!inv?.request || busy) return;
    setBusy(true);
    try {
      await acknowledgeRejection(inv.request.id);
      reload();
    } catch (e) {
      keepRef.current = null;
      notify(e instanceof Error ? e.message : "Couldn’t update this request", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !list) {
    return (
      <Frame>
        <Loading label="Loading invitation" />
        <div style={{ display: "grid", gap: 12 }} aria-hidden="true">
          <Sk h={48} w="100%" r={12} />
          <Sk h={120} w="100%" r={16} />
          <Sk h={120} w="100%" r={16} />
        </div>
      </Frame>
    );
  }
  if (error || !list) {
    return (
      <Frame>
        <p role="alert">We couldn’t load your invitation. Check your connection and try again.</p>
        <button type="button" className="client-touch" style={btnPrimary} onClick={reload}>Try again</button>
      </Frame>
    );
  }
  if (!inv) {
    return (
      <Frame>
        <p>This invitation isn’t linked to your account.</p>
        <Link to="/my" className="client-link">← Back to your invitations</Link>
      </Frame>
    );
  }

  const submitDisabled = busy || !!pending || !dirty;
  const subtitle = pending
    ? "Your changes are waiting for admin review."
    : dirty
      ? "Review your changes, then submit them for approval."
      : "Update your details, then submit for review. Changes go live after admin approval.";

  return (
    <div className="client-ws">
      <style>{clientWsCss}</style>
      {/* Same strip as the admin shell: the violet glow is drawn by .client-ws behind it. */}
      <header className="client-promo">
        <div className="promo-brand">
          <span className="promo-mark" aria-hidden="true"><img src={schedyMark} alt="" /></span>
          <span className="promo-name">Schedy</span>
        </div>
        <div className="promo-right">
          {list.length > 1 && (
            <Link to="/my" className="promo-link"><ChevronLeft size={15} /> All invitations</Link>
          )}
          {session?.email && <span className="promo-email" title={session.email}>{session.email}</span>}
          <button type="button" className="promo-link" onClick={() => navigate("/login", { replace: true, state: { loggedOut: true } })}>
            <LogOut size={14} /> Log out
          </button>
        </div>
      </header>

      <div className="client-ws-body">
        <div className="client-app">
          <main className="main-content" id="main" tabIndex={-1}>
            <div className="create" aria-busy={!ready}>
              <header>
                <div>
                  <div className="title-row">
                    <h1>{title}</h1>
                    <span aria-live="polite">
                      {dirty && !pending ? <span className="save-state dirty" title="Changes are also kept as a local draft"><i /> Unsaved changes</span> : null}
                    </span>
                  </div>
                  <p>{subtitle}</p>
                </div>
                <div className="actions">
                  <button ref={headBtnRef} className="primary" type="submit" form="create-form" disabled={submitDisabled}>
                    {busy ? <Loader2 className="spin" size={17} /> : <Save size={17} />} {busy ? "Submitting…" : "Submit for review"}
                  </button>
                </div>
              </header>

            {pending && inv.request && (
              <div style={{ ...banner, background: "var(--white-blue)", border: "1px solid var(--periwinkle)", borderRadius: 12, padding: 16, marginBottom: 20 }} role="status">
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ marginTop: 2, flexShrink: 0 }}><Clock size={20} color="#673de6" /></div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "var(--meteorite-dark)", display: "block", marginBottom: 4, fontSize: 15 }}>Awaiting Admin Review</strong>
                    <span style={{ color: "var(--gray-dark)", fontSize: 14, lineHeight: 1.5 }}>Your changes were submitted on {fmtDateTime(inv.request.createdAt)} and are waiting for approval.</span>
                    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" className="client-touch" style={{ ...btnDanger, padding: "8px 14px", fontSize: 14 }} disabled={busy} onClick={() => void onWithdraw()}>
                        Withdraw Request
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {superseded && inv.request && (
              <div style={{ ...banner, background: "#f3f4f6", border: "1px solid #d1d5db" }} role="status">
                <b>Your pending changes were cancelled.</b> The invitation was updated or removed by the admin, so this request is no longer active. You can submit new changes if the invitation is still linked to you.
              </div>
            )}

            {rejectedOpen && inv.request && (
              <div style={{ ...banner, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 16, marginBottom: 20 }} role="status">
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ marginTop: 2, flexShrink: 0 }}><AlertCircle size={20} color="#dc2626" /></div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#991b1b", display: "block", marginBottom: 4, fontSize: 15 }}>Changes Were Rejected</strong>
                    {inv.request.adminNote && <p style={{ margin: "0 0 12px", color: "#7f1d1d", fontSize: 14, lineHeight: 1.5, background: "#fef2f2", padding: 10, borderRadius: 8, border: "1px dashed #fecaca" }}>{inv.request.adminNote}</p>}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" className="client-touch" style={{ ...btnPrimary, padding: "8px 16px", fontSize: 14 }} disabled={busy} onClick={() => { keepRef.current = data; void onAck(); }}>
                        Edit Again
                      </button>
                      <button type="button" className="client-touch" style={{ ...btnGhost, padding: "8px 16px", fontSize: 14 }} disabled={busy} onClick={() => void onAck()}>
                        Discard my edits
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {approvedOpen && inv.request && (
              <div style={{ ...banner, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 12, padding: 16, marginBottom: 20 }} role="status">
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <CheckCircle2 size={20} color="#166534" />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#166534", display: "block", fontSize: 15 }}>Changes Approved & Live</strong>
                    <span style={{ color: "#15803d", fontSize: 14 }}>Your invitation has been updated and is now visible to your guests.</span>
                  </div>
                  <button type="button" className="client-touch" style={{ ...btnGhost, padding: "8px 14px", fontSize: 14 }} disabled={busy} onClick={() => void onAck()}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {draftOffer && !pending && (
              <div style={{ ...banner, background: "#fffbeb", border: "1px solid #fcd34d" }} role="status">
                <span>You have unsaved changes from {new Date(draftOffer.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}. Restore them?</span>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={btnPrimary} onClick={() => {
                    dispatch({ type: "replaceData", data: draftOffer.data });
                    setDraftOffer(null);
                  }}>Restore</button>
                  <button type="button" style={btnGhost} onClick={() => { removeKey(draftKey); setDraftOffer(null); }}>Discard</button>
                </div>
              </div>
            )}

            {blocker.state === "blocked" && (
              <LeavePrompt
                onStay={() => blocker.reset?.()}
                onLeave={() => { writeJSON(draftKey, { data, at: Date.now() }); blocker.proceed?.(); }}
              />
            )}

              <div className="create-builder-layout">
                <SectionNav
                  sections={CLIENT_SECTIONS} issues={issues} done={done} doneCount={doneCount} total={CLIENT_PROGRESS.length}
                  saving={busy} saveDisabled={submitDisabled} saveLabel="Submit for review" headBtnRef={headBtnRef}
                  loading={!ready} topOffset={0}
                />
                <CreateForm
                  mode="client"
                  readOnly={!!pending}
                  data={data}
                  categories={[]}
                  templates={[]}
                  categoryId="ALL"
                  onCategory={() => {}}
                  sectionLoading={sectionLoading}
                  templatesLoading={false}
                  expectTemplate={false}
                  set={set}
                  add={add}
                  patch={patch}
                  remove={remove}
                  focus={focus}
                  vis={vis}
                  touch={touch}
                  tagFor={tagFor}
                  onSubmit={(e) => { e.preventDefault(); requestSubmit(); }}
                  notify={notify}
                  invitationId={inv.id}
                />
              </div>

              {/* mobile action bar */}
              <div className="mbar">
                <button className="secondary" type="button" onClick={() => setPreviewOpen(true)}><Eye size={17} /> Preview</button>
                <button className="primary" type="submit" form="create-form" disabled={submitDisabled}>
                  {busy ? <Loader2 className="spin" size={17} /> : <Save size={17} />} {busy ? "Submitting…" : "Submit"}
                </button>
              </div>

              {confirmSubmit && <SubmitConfirm busy={busy} onConfirm={() => void doSubmit()} onCancel={() => setConfirmSubmit(false)} />}

              {slot && (
                <LivePreview
                  slot={slot} compiled={compiled} selected={selectedInfo} loading={!ready || tplLoading} open={previewOpen}
                  focusRequest={focusRequest} onClose={() => setPreviewOpen(false)}
                  emptyTitle="No preview available" emptyHint="This invitation has no template yet."
                />
              )}

              {toast && createPortal(
                <div className="dx-toast" role={toast.tone === "error" ? "alert" : "status"}>
                  {toast.tone === "error" ? <AlertCircle size={15} className="bad" /> : <CheckCircle2 size={15} />} {toast.msg}
                </div>,
                document.body,
              )}

              <style>{createCss}</style>
            </div>
          </main>
        </div>
        <div ref={setSlot} className="preview-slot" />
      </div>
    </div>
  );
}

export default function ClientApp() {
  return (
    <AuthProvider>
      <RoleGate allow="client">
        <Routes>
          {/* This <Routes> sits inside the parent route "/my/*", so these paths are relative to /my.
              Absolute paths ("/my") would never match and the screen stayed blank. */}
          <Route path="/" element={<Landing />} />
          <Route path="/:id" element={<ClientEditor />} />
          <Route path="*" element={<Navigate to="/my" replace />} />
        </Routes>
      </RoleGate>
    </AuthProvider>
  );
}
