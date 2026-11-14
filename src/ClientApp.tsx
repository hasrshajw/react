import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, Route, Routes, useBlocker, useParams } from "react-router-dom";
import { RoleGate } from "./components/RoleGate";
import { Loading, Sk } from "./components/Skeleton";
import { Clock, AlertCircle, CheckCircle2, Eye, Loader2, Save } from "./components/Icons";
import { invitationToForm } from "./features/client/invitationToForm";
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
import { AccountProvider } from "./hooks/useAccount";
import { ClientShell } from "./features/client/ClientShell";
import ClientDashboard from "./features/client/ClientDashboard";
import { useClientData } from "./features/client/clientContext";
import { useEscape, useFocusTrap } from "./hooks/useEscape";
import {
  acknowledgeRejection,
  ApiError,
  fetchClientTemplateHtml,
  submitChangeRequest,
  withdrawChangeRequest,
  type MyInvitation,
} from "./lib/api";
import { compile } from "./lib/compileInvitation";
import { readJSON, removeKey, writeJSON } from "./lib/storage";
import { LS_CLIENT_DRAFT } from "./lib/storageKeys";
import { fmtDateTime } from "./lib/dashboardData";
import { has, validateInvitation } from "./lib/validate";
import type { ContactItem, EventItem, InvitationData, ListField, SectionId } from "./types/invitation";
import createCss from "./features/create/create.css?inline";

/* Track B (B4 shell + B6 client editor). Separate chunk so clients never download admin code. */

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
  /* The shell loads the invitations once and shares them with the Dashboard. */
  const { list, loading, error, reload, setPanelOpen, slot } = useClientData();
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
  const headBtnRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    const report = () => setPanelOpen(window.innerWidth > 900);
    report();
    window.addEventListener("resize", report);
    return () => { window.removeEventListener("resize", report); setPanelOpen(false); };
  }, [setPanelOpen]);

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
      <div aria-busy="true">
        <Loading label="Loading invitation" />
        <div style={{ display: "grid", gap: 12 }} aria-hidden="true">
          <Sk h={48} w="100%" r={12} />
          <Sk h={120} w="100%" r={16} />
          <Sk h={120} w="100%" r={16} />
        </div>
      </div>
    );
  }
  if (error || !list) {
    return (
      <div>
        <p role="alert">We couldn’t load your invitation. Check your connection and try again.</p>
        <button type="button" className="client-touch" style={btnPrimary} onClick={reload}>Try again</button>
      </div>
    );
  }
  if (!inv) {
    return (
      <div>
        <p>This invitation isn’t linked to your account.</p>
        <Link to="/my" style={{ color: "var(--primary)", fontWeight: 600 }}>← Back to your dashboard</Link>
      </div>
    );
  }

  const submitDisabled = busy || !!pending || !dirty;
  const subtitle = pending
    ? "Your changes are waiting for admin review."
    : dirty
      ? "Review your changes, then submit them for approval."
      : "Update your details, then submit for review. Changes go live after admin approval.";

  return (
    <>
            <div className="create client-create" aria-busy={!ready}>
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
                  loading={!ready}
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
    </>
  );
}

export default function ClientApp() {
  return (
    <AuthProvider>
      <RoleGate allow="client">
        <AccountProvider>
          <ClientShell>
            <Routes>
              {/* This <Routes> sits inside the parent route "/my/*", so these paths are relative to /my.
                  Absolute paths ("/my") would never match and the screen stayed blank. */}
              <Route path="/" element={<ClientDashboard />} />
              <Route path="/:id" element={<ClientEditor />} />
              <Route path="*" element={<Navigate to="/my" replace />} />
            </Routes>
          </ClientShell>
        </AccountProvider>
      </RoleGate>
    </AuthProvider>
  );
}
