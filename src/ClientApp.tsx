import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useBlocker, useNavigate, useParams } from "react-router-dom";
import { RoleGate } from "./components/RoleGate";
import {
  CLIENT_STATUS_LABEL,
  clientStatus,
  invitationToForm,
} from "./features/client/invitationToForm";
import { CreateForm } from "./features/create/CreateForm";
import { formReducer, initialFormState, snapshot } from "./features/create/formReducer";
import { useToast } from "./features/create/hooks/useToast";
import { useBeforeUnload } from "./features/create/hooks/useUnsavedWarnings";
import { useAuth, AuthProvider } from "./hooks/useAuth";
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
import { fmtDateTime } from "./lib/dashboardData";
import { validateInvitation } from "./lib/validate";
import type { ContactItem, EventItem, InvitationData, ListField, SectionId } from "./types/invitation";
import createCss from "./features/create/create.css?inline";

/* Track B (B4 shell + B6 client editor). Separate chunk so clients never download admin code. */

/* Mobile-first: comfortable padding and min 44px touch targets on small screens. */
const page: React.CSSProperties = {
  maxWidth: 720, margin: "0 auto", padding: "16px 12px 96px",
  fontFamily: "system-ui, sans-serif", color: "#23263a",
  boxSizing: "border-box", width: "100%",
};

function Frame({ children, title = "Your invitations" }: { children: React.ReactNode; title?: string }) {
  const navigate = useNavigate();
  return (
    <main className="client-frame-main" style={page}>
      <style>{`
        @media (min-width: 480px) {
          .client-frame-main { padding: 24px 16px 80px !important; }
        }
        .client-header { flex-wrap: wrap; }
        .client-touch { min-height: 44px; }
      `}</style>
      <div className="client-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        <strong style={{ fontSize: 18, lineHeight: 1.3 }}>{title}</strong>
        <button
          type="button"
          className="client-touch"
          style={btnGhost}
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
  border: 0, background: "#2563eb", color: "#fff", borderRadius: 10, padding: "12px 18px", cursor: "pointer", font: "inherit", fontWeight: 600,
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
  if (loading) return <Frame><p>Loading…</p></Frame>;
  if (error || !data) {
    return (
      <Frame>
        <p role="alert">We couldn’t load your invitations. Reload the page to try again.</p>
      </Frame>
    );
  }
  if (data.length === 0) {
    return (
      <Frame>
        <p>No invitations are linked to this account.</p>
        {session?.email && (
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            Signed in as <b>{session.email}</b>. Use the email your invitation was set up with
            {ADMIN_EMAIL ? <>, or <a href={`mailto:${ADMIN_EMAIL}`}>contact the admin</a></> : null}.
          </p>
        )}
        {!session?.email && ADMIN_EMAIL && (
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            <a href={`mailto:${ADMIN_EMAIL}`}>Contact the admin</a> if you expected to see an invitation here.
          </p>
        )}
      </Frame>
    );
  }
  if (data.length === 1) return <Navigate to={`/my/${encodeURIComponent(data[0].id)}`} replace />;
  return (
    <Frame>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {data.map((i) => {
          const st = clientStatus(i);
          const label = [i.groomName, i.brideName].filter(Boolean).join(" & ") || "Your invitation";
          return (
            <li key={i.id}>
              <Link
                to={`/my/${encodeURIComponent(i.id)}`}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                  padding: "14px 16px", borderRadius: 12, border: "1px solid #e5e7eb",
                  textDecoration: "none", color: "inherit", background: "#fff",
                }}
              >
                <span>
                  <b>{label}</b>
                  {i.eventDate && (
                    <span style={{ display: "block", fontSize: 13, color: "#6b7280", marginTop: 2 }}>{i.eventDate}</span>
                  )}
                </span>
                <span style={{
                  fontSize: 12, whiteSpace: "nowrap", padding: "3px 8px", borderRadius: 999, fontWeight: 600,
                  background: st === "pending" ? "#fef3c7" : st === "rejected" ? "#fee2e2" : st === "live" ? "#dcfce7" : "#f3f4f6",
                  color: st === "pending" ? "#92400e" : st === "rejected" ? "#991b1b" : st === "live" ? "#166534" : "#4b5563",
                }}>
                  {CLIENT_STATUS_LABEL[st]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Frame>
  );
}

type ClientDraft = { data: InvitationData; at: number };

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
  const emailKey = (session?.email || "anon").trim().toLowerCase();
  const draftKey = `${LS_CLIENT_DRAFT}${emailKey}:${id}`;

  const inv = useMemo(() => list?.find((i) => i.id === id) ?? null, [list, id]);
  const pending = inv?.request?.status === "pending";
  const rejectedOpen = inv?.request?.status === "rejected" && !inv.request.acknowledgedAt;
  const approvedOpen = inv?.request?.status === "approved" && !inv.request.acknowledgedAt;

  useEffect(() => {
    if (!inv) return;
    const preferProposed = inv.request?.status === "pending"
      || (inv.request?.status === "rejected" && !inv.request.acknowledgedAt);
    const form = invitationToForm(inv, !!preferProposed);
    dispatch({ type: "load", data: form });
    setReady(true);
    if (!preferProposed) {
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
    fetchClientTemplateHtml(inv.id).then(
      (html) => { if (live) setTemplateHtml(html || ""); },
      () => { if (live) setTemplateHtml(""); },
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
  const set = useCallback(<K extends keyof InvitationData>(key: K, value: InvitationData[K]) => {
    dispatch({ type: "field", key, value });
  }, []);
  const add = useCallback((field: ListField, make: () => EventItem | ContactItem) => {
    dispatch({ type: "addItem", field, item: make() });
  }, []);
  const patch = useCallback((field: ListField, id: string, p: Partial<EventItem & ContactItem>) => {
    dispatch({ type: "patchItem", field, id, patch: p });
  }, []);
  const remove = useCallback((field: ListField, id: string) => {
    dispatch({ type: "removeItem", field, id });
  }, []);
  const touch = useCallback((key: string) => dispatch({ type: "touch", key }), []);
  const focus = useCallback((_field: string) => {}, []);
  const sectionLoading = useMemo<Record<SectionId, boolean>>(
    () => ({
      template: !ready, family: !ready, groom: !ready, bride: !ready,
      venue: !ready, seo: !ready, events: !ready, client: !ready,
    }),
    [ready],
  );
  const tagFor = useCallback((sec: SectionId) => {
    if (!ready) return { tone: "", text: "…", loading: true };
    return { tone: "", text: sec === "family" || sec === "groom" || sec === "bride" ? "Required" : "Optional" };
  }, [ready]);

  const compiled = useMemo(() => {
    try { return templateHtml ? compile(templateHtml, data) : ""; }
    catch { return ""; }
  }, [templateHtml, data]);

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
      notify(e instanceof ApiError ? e.message : "Couldn’t submit changes", "error");
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
      notify(e instanceof Error ? e.message : "Couldn’t dismiss", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !list) return <Frame><p>Loading…</p></Frame>;
  if (error || !list) {
    return <Frame><p role="alert">We couldn’t load your invitation. Reload the page to try again.</p></Frame>;
  }
  if (!inv) {
    return (
      <Frame>
        <p>This invitation isn’t linked to your account.</p>
        <Link to="/my">Back</Link>
      </Frame>
    );
  }

  const title = [inv.groomName, inv.brideName].filter(Boolean).join(" & ") || "Your invitation";

  return (
    <Frame title={title}>
      <style>{createCss}</style>
      {list.length > 1 && (
        <p style={{ marginTop: 0 }}>
          <Link to="/my">← All invitations</Link>
        </p>
      )}

      {pending && inv.request && (
        <div style={{ ...banner, background: "#eff6ff", border: "1px solid #bfdbfe" }} role="status">
          Your changes are waiting for admin review, submitted {fmtDateTime(inv.request.createdAt)}.
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={btnDanger} disabled={busy} onClick={() => void onWithdraw()}>
              Withdraw
            </button>
          </div>
        </div>
      )}

      {rejectedOpen && inv.request && (
        <div style={{ ...banner, background: "#fef2f2", border: "1px solid #fecaca" }} role="status">
          <b>Changes were rejected.</b>
          {inv.request.adminNote && <p style={{ margin: "6px 0" }}>{inv.request.adminNote}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" style={btnGhost} disabled={busy} onClick={() => void onAck()}>
              Got it
            </button>
          </div>
        </div>
      )}

      {approvedOpen && inv.request && (
        <div style={{ ...banner, background: "#ecfdf5", border: "1px solid #a7f3d0" }} role="status">
          Your changes are live.
          <div style={{ marginTop: 8 }}>
            <button type="button" style={btnGhost} disabled={busy} onClick={() => void onAck()}>
              Got it
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
        <div style={{ ...banner, background: "#fff", border: "1px solid #e5e7eb" }} role="dialog" aria-label="Leave without submitting?">
          <p style={{ margin: "0 0 10px" }}>You have unsaved changes. Leave this page? A local draft is kept until you submit or sign out.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={btnGhost} onClick={() => blocker.reset?.()}>Stay</button>
            <button type="button" style={btnPrimary} onClick={() => {
              writeJSON(draftKey, { data, at: Date.now() });
              blocker.proceed?.();
            }}>Leave</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 20 }}>
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
          onSubmit={(e) => { e.preventDefault(); if (!pending) setConfirmSubmit(true); }}
          notify={notify}
          invitationId={inv.id}
        />

        {compiled ? (
          <div>
            <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>Preview</h2>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", minHeight: 320, aspectRatio: "3 / 4", maxHeight: 480 }}>
              <iframe title="Invitation preview" srcDoc={compiled} sandbox="allow-scripts" style={{ width: "100%", height: "100%", border: 0, display: "block", minHeight: 320 }} />
            </div>
          </div>
        ) : null}
      </div>

      {!pending && (
        <div style={{ position: "sticky", bottom: 0, padding: "12px 0 calc(12px + env(safe-area-inset-bottom, 0px))", background: "linear-gradient(transparent, #fff 28%)", marginTop: 16, zIndex: 2 }}>
          {confirmSubmit ? (
            <div style={{ ...banner, background: "#fff", border: "1px solid #e5e7eb" }}>
              <p style={{ margin: "0 0 10px" }}>
                Submit these changes for admin review? They go live only after approval.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="client-touch" style={btnGhost} disabled={busy} onClick={() => setConfirmSubmit(false)}>Cancel</button>
                <button type="button" className="client-touch" style={btnPrimary} disabled={busy || !dirty} onClick={() => void doSubmit()}>
                  {busy ? "Submitting…" : "Confirm submit"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="client-touch"
              style={{ ...btnPrimary, width: "100%", opacity: dirty ? 1 : 0.5 }}
              disabled={busy || !dirty}
              onClick={() => setConfirmSubmit(true)}
            >
              Submit for review
            </button>
          )}
        </div>
      )}

      {toast ? (
        <div
          role="status"
          style={{
            position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
            background: "#111827", color: "#fff", padding: "10px 16px", borderRadius: 999, fontSize: 14, zIndex: 50,
          }}
        >
          {toast.msg}
        </div>
      ) : null}
    </Frame>
  );
}

export default function ClientApp() {
  return (
    <AuthProvider>
      <RoleGate allow="client">
        <Routes>
          <Route path="/my" element={<Landing />} />
          <Route path="/my/:id" element={<ClientEditor />} />
          <Route path="*" element={<Navigate to="/my" replace />} />
        </Routes>
      </RoleGate>
    </AuthProvider>
  );
}
