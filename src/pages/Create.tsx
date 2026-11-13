import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBlocker, useSearchParams } from "react-router-dom";
import { AlertCircle, Check, Eye, Loader2, Save } from "../components/Icons";
import { ApiError, fetchInvitation, saveInvitation } from "../lib/api";
import { useTemplates } from "../hooks/useTemplates";
import { compile } from "../lib/compileInvitation";
import { invitationUrl } from "../lib/links";
import { readJSON, removeKey, writeJSON } from "../lib/storage";
import { has, validateInvitation } from "../lib/validate";
import type { ContactItem, EventItem, InvitationData, ListField, SectionId } from "../types/invitation";
import createCss from "../features/create/create.css?inline";
import { EN_TO_TE, LS_DRAFT, PROGRESS_IDS, SECTIONS, initial, uid } from "../features/create/constants";
import { CreateForm } from "../features/create/CreateForm";
import { formReducer, initialFormState, snapshot } from "../features/create/formReducer";
import { LeaveModal } from "../features/create/components/LeaveModal";
import { LivePreview, type FocusRequest } from "../features/create/components/LivePreview";
import { SectionNav } from "../features/create/components/SectionNav";
import { ShareModal } from "../features/create/components/ShareModal";
import { useToast } from "../features/create/hooks/useToast";
import { useTransliteration } from "../features/create/hooks/useTransliteration";
import { useBeforeUnload, useSaveShortcut } from "../features/create/hooks/useUnsavedWarnings";
import { scrollToSection } from "../features/create/scroll";
import { useAuth } from "../hooks/useAuth";

const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); }
  catch { window.prompt("Copy", text); }
};

type Draft = { data: InvitationData; at: number };

export default function Create({ onPanelChange }: { onPanelChange?: (open: boolean) => void }) {
  const { templates, categories, loading: tplLoading } = useTemplates();
  const { session } = useAuth();

  const [state, dispatch] = useReducer(formReducer, undefined, () => initialFormState(new URLSearchParams(window.location.search).get("edit")));
  const { data, snap, touched, submitted, editId, categoryId, lastSaved } = state;

  /* UI-only state, kept apart from the form so it never touches the form data */
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [draftOffer, setDraftOffer] = useState<Draft | null>(null);
  const [share, setShare] = useState<{ id: string } | null>(null);
  const headBtnRef = useRef<HTMLButtonElement>(null);
  const saveRef = useRef<() => void>(() => {});
  /* Id for a new invitation. Created up front so the preview image can be uploaded under it before the first save. */
  const pendingId = useRef(uid());
  const invitationId = editId || pendingId.current;
  const { toast, notify } = useToast();
  const schedule = useTransliteration();

  const dirty = useMemo(() => snapshot(data) !== snap, [data, snap]);
  /* B6 / M-1: scope create drafts per signed-in user so a shared browser does not leak the previous person's draft. */
  const emailKey = (session?.email ?? "anon").trim().toLowerCase();
  const draftKey = `${LS_DRAFT}${emailKey}:${editId || "new"}`;

  /* ---------- ask before leaving with unsaved changes ---------- */
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const blocker = useBlocker(
    /* Any router navigation (even to the same URL, such as the sidebar "Create Invitation" link) remounts this page
       via CreateRoute's key, which would discard unsaved edits, so it must ask first. Create's own address-bar
       updates use history.replaceState and never reach the router. */
    useCallback(({ currentLocation, nextLocation }: { currentLocation: { key: string }; nextLocation: { key: string } }) => dirtyRef.current && currentLocation.key !== nextLocation.key, [])
  );
  useBeforeUnload(dirty);
  useSaveShortcut(useCallback(() => saveRef.current(), []));

  /* ---------- load (edit mode) + look for an unsaved draft ---------- */
  const [urlParams] = useSearchParams();
  /* Creating starts instantly. Editing waits for the record, and the form shows skeletons until it arrives. */
  const recordLoading = !!editId && !ready && !loadError;
  const expectTemplate = !!editId || !!urlParams.get("template");
  useEffect(() => {
    let live = true;
    const finish = (base: InvitationData) => {
      dispatch({ type: "load", data: base });
      /* /create?template=ID (from Manage Templates) preselects that template */
      const t = urlParams.get("template");
      if (t && !editId) dispatch({ type: "field", key: "templateId", value: String(t) });
      const draft = readJSON<Draft | null>(draftKey, null);
      if (draft?.data && JSON.stringify({ ...initial, ...draft.data }) !== JSON.stringify(base)) setDraftOffer(draft);
      setReady(true);
    };
    if (!editId) { finish(initial); return; }
    fetchInvitation(editId).then(
      (row) => {
        if (!live) return;
        let base = initial;
        if (!row) {
          setMessage("Invitation not found. You can create a new one.");
        } else {
          const details = row.details || {};
          const { clientEmail: _ignoreFromDetails, ...detailsRest } = details as Partial<InvitationData> & { clientEmail?: string };
          base = {
            ...initial, ...detailsRest,
            templateId: (row.template_id != null && row.template_id !== "" ? String(row.template_id) : "") || details.templateId || "",
            brideEn: row.bride_name || details.brideEn || "",
            groomEn: row.groom_name || details.groomEn || "",
            weddingDate: row.event_date || details.weddingDate || "",
            clientEmail: (row.client_email ?? "").trim(),
          };
        }
        finish(base);
      },
      /* Never fall back to an empty form here: saving it would overwrite the real invitation. */
      () => { if (live) { setLoadError(true); setMessage("Couldn't load this invitation. Check your connection and try again."); } },
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- autosave a local draft while there are unsaved changes ---------- */
  useEffect(() => {
    if (!ready || draftOffer) return;
    if (!dirty) { removeKey(draftKey); return; }
    const t = setTimeout(() => writeJSON(draftKey, { data, at: Date.now() }), 800);
    return () => clearTimeout(t);
  }, [data, dirty, ready, draftOffer, draftKey]);

  useEffect(() => { setSlot(document.getElementById("preview-slot")); }, []);
  /* The live preview is a permanent right-side panel on desktop (>900px): tell App so the sidebar becomes a rail + overlay menu. */
  useEffect(() => {
    if (!slot) return;
    const report = () => onPanelChange?.(window.innerWidth > 900);
    report();
    window.addEventListener("resize", report);
    return () => { window.removeEventListener("resize", report); onPanelChange?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  /* ---------- template + preview ---------- */
  const selected = useMemo(() => templates.find((t) => String(t.id) === String(data.templateId)), [templates, data.templateId]);
  const source = selected?.html_code || "";
  const compiled = useMemo(() => compile(source, data) as string, [source, data]);
  const selectedInfo = useMemo(() => (selected ? { id: String(selected.id), name: selected.name } : undefined), [selected]);
  /* The preview only needs a skeleton when a template is expected (editing, or /create?template=…). */
  const previewLoading = expectTemplate && (tplLoading || recordLoading);
  const closePreview = useCallback(() => setPreviewOpen(false), []);
  const chooseTemplate = useCallback(() => { setPreviewOpen(false); scrollToSection("template"); }, []);

  /* ---------- form actions (stable, so memoised children are not re-rendered by them) ---------- */
  const set = useCallback(<K extends keyof InvitationData>(key: K, value: InvitationData[K]) => {
    dispatch({ type: "field", key, value });
    const target = EN_TO_TE[key as keyof typeof EN_TO_TE];
    if (target && typeof value === "string") schedule(`${key}:${target}`, value, (te) => dispatch({ type: "field", key: target, value: te }));
  }, [schedule]);
  const focus = useCallback((field: string) => setFocusRequest({ field, id: uid() }), []);
  const add = useCallback((field: ListField, make: () => EventItem | ContactItem) => dispatch({ type: "addItem", field, item: make() }), []);
  const patch = useCallback((field: ListField, id: string, p: Partial<EventItem & ContactItem>) => {
    dispatch({ type: "patchItem", field, id, patch: p });
    if (field === "events") {
      if (p.name !== undefined) schedule(`event-${id}-name`, p.name, (te) => dispatch({ type: "patchItem", field, id, patch: { nameTe: te } }));
      if (p.venue !== undefined) schedule(`event-${id}-venue`, p.venue, (te) => dispatch({ type: "patchItem", field, id, patch: { venueTe: te } }));
    }
  }, [schedule]);
  const remove = useCallback((field: ListField, id: string) => dispatch({ type: "removeItem", field, id }), []);
  const touch = useCallback((key: string) => dispatch({ type: "touch", key }), []);
  const onCategory = useCallback((id: string) => dispatch({ type: "category", id }), []);

  /* ---------- validation ---------- */
  const errors = useMemo(() => validateInvitation(data), [data]);
  /* An error is only shown after the field was left, or after a save attempt. */
  const vis = useCallback((key: string) => ((submitted || touched[key]) ? errors[key]?.msg : undefined), [submitted, touched, errors]);

  const issues = useMemo(() => {
    const n: Record<string, number> = {};
    Object.entries(errors).forEach(([k, v]) => { if (submitted || touched[k]) n[v.section] = (n[v.section] || 0) + 1; });
    return n;
  }, [errors, touched, submitted]);

  const done = useMemo<Record<string, boolean>>(() => ({
    template: has(data.templateId),
    family: has(data.weddingDate),
    groom: has(data.groomEn),
    bride: has(data.brideEn),
    venue: has(data.venueEn) || has(data.venueAddress),
    seo: has(data.seoTitle) || has(data.seoDescription) || has(data.seoImage),
    events: data.events.length > 0,
    client: has(data.clientEmail),
  }), [data.templateId, data.weddingDate, data.groomEn, data.brideEn, data.venueEn, data.venueAddress, data.events.length, data.seoTitle, data.seoDescription, data.seoImage, data.clientEmail]);
  const doneCount = PROGRESS_IDS.filter((id) => done[id]).length;

  /* Each section has its own loading flag, so a section can appear as soon as ITS data is there.
     (Today the invitation arrives in one piece, so its sections appear together, with a short stagger.) */
  const sectionLoading = useMemo<Record<SectionId, boolean>>(() => ({
    template: recordLoading, family: recordLoading, groom: recordLoading, bride: recordLoading,
    venue: recordLoading, seo: recordLoading, events: recordLoading, client: recordLoading,
  }), [recordLoading]);

  const tagFor = useCallback((id: SectionId): { tone: string; text: string; loading?: boolean } => {
    const s = SECTIONS.find((x) => x.id === id)!;
    if (recordLoading) return { tone: "", text: "Required", loading: true };
    if (issues[id]) return { tone: "bad", text: `${issues[id]} to fix` };
    if (done[id]) return { tone: "ok", text: "Done" };
    return { tone: "", text: s.hint === "required" ? "Required" : s.hint === "recommended" ? "Recommended" : "Optional" };
  }, [issues, done, recordLoading]);

  /* ---------- save ---------- */
  const getLink = (id: string) => invitationUrl(data.customId?.trim() || id);
  const coupleName = `${has(data.groomEn) ? data.groomEn.trim() : "Groom"} & ${has(data.brideEn) ? data.brideEn.trim() : "Bride"}`;

  /* Returns true when the invitation is saved (or there was nothing to save).
     { leaving: true } is used by the "Save your changes?" dialog: it skips the share
     popup and the toast, because the user is on their way to another page. */
  const doSave = async ({ leaving = false } = {}): Promise<boolean> => {
    /* The buttons are disabled in these states, but Ctrl+S and the leave dialog call this directly. After a failed
       load the form is empty, and saving it would overwrite the real invitation. */
    if (saving || recordLoading || loadError) return false;
    if (editId && !dirty) return true;
    dispatch({ type: "submit" });
    const entries = Object.entries(errors);
    if (entries.length) {
      const [key, { section }] = entries[0];
      scrollToSection(section);
      setTimeout(() => document.getElementById(`f-${key}`)?.focus({ preventScroll: true }), 450);
      notify(`Fix ${entries.length} ${entries.length === 1 ? "field" : "fields"} to continue`, "error");
      return false;
    }
    setSaving(true);
    const id = invitationId;
    try {
      const { clientEmail, ...detailsForSave } = data;
      await saveInvitation({
        id,
        bride_name: data.brideEn,
        groom_name: data.groomEn,
        event_date: data.weddingDate || null,
        template_id: data.templateId || null,
        template_name: selected?.name || "Custom invitation",
        client_email: clientEmail.trim() === "" ? null : clientEmail.trim().toLowerCase(),
        details: detailsForSave,
      });
    } catch (e) {
      setSaving(false);
      if (e instanceof ApiError) notify(e.message, "error");
      else notify("Couldn’t save the invitation. Check your connection and try again.", "error");
      return false;
    }
    dispatch({ type: "saved", editId: id, at: Date.now() });
    removeKey(`${LS_DRAFT}${emailKey}:new`);
    removeKey(`${LS_DRAFT}${emailKey}:${id}`);
    if (!editId) {
      /* Keep history.state: the router stores its position there (needed for back/forward blocking). */
      if (!leaving) history.replaceState(history.state, "", `/create?edit=${id}`);
      if (!leaving) setShare({ id });
    } else if (!leaving) {
      notify("Invitation updated");
    }
    setSaving(false);
    return true;
  };

  /* "Save your changes?" dialog actions */
  const leaveSave = () => {
    /* if saving fails (validation or network) stay on the page and show what needs fixing */
    void doSave({ leaving: true }).then((ok) => { if (ok) blocker.proceed?.(); else blocker.reset?.(); });
  };
  const leaveCancel = () => {
    /* Flush the draft now (autosave is debounced) so the Restore card appears on return. */
    writeJSON(draftKey, { data, at: Date.now() });
    blocker.proceed?.();
  };
  const leaveStay = () => blocker.reset?.();

  saveRef.current = () => (blocker.state === "blocked" ? leaveSave() : void doSave());

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); doSave(); };

  const createAnother = () => {
    setShare(null);
    pendingId.current = uid();
    dispatch({ type: "reset" });
    history.replaceState(history.state, "", "/create");
    scrollToSection("template");
  };

  const copyShareLink = async () => { if (share) { await copyText(getLink(share.id)); notify("Link copied"); } };
  const shareWhatsApp = () => {
    if (!share) return;
    const text = `You are invited! ${coupleName}\n${getLink(share.id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const restoreDraft = () => {
    if (!draftOffer) return;
    dispatch({ type: "replaceData", data: { ...initial, ...draftOffer.data } });
    setDraftOffer(null);
    notify("Draft restored");
  };
  const discardDraft = () => { removeKey(draftKey); setDraftOffer(null); };

  const saveDisabled = saving || recordLoading || loadError || (!!editId && !dirty);
  const saveLabel = saving ? "Saving..." : editId ? "Update" : "Create";
  const draftTime = draftOffer?.at ? new Date(draftOffer.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

  return (
    <div className="create" aria-busy={recordLoading || tplLoading}>
      <header>
        <div>
          <div className="title-row">
            <h1>{editId ? "Edit invitation" : "Create invitation"}</h1>
            <span aria-live="polite">
              {dirty ? (
                <span className="save-state dirty" title="Changes are also kept as a local draft"><i /> Unsaved changes</span>
              ) : lastSaved ? (
                <span className="save-state saved"><Check size={13} /> All changes saved</span>
              ) : null}
            </span>
          </div>
          <p>Fill in the details to build your invitation.</p>
        </div>
        <div className="actions">
          <button ref={headBtnRef} className="primary" type="submit" form="create-form" disabled={saveDisabled} title="Save (Ctrl+S)">
            {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />} {saveLabel}
          </button>
        </div>
      </header>

      {message && (
        <div className="msg">
          <span>{message}</span>
          {loadError && <div className="msg-actions"><button type="button" className="mini-act" onClick={() => window.location.reload()}>Retry</button></div>}
        </div>
      )}
      {draftOffer && (
        <div className="msg">
          <span>You have unsaved changes from {draftTime}. Restore them?</span>
          <div className="msg-actions">
            <button type="button" className="mini-act" onClick={restoreDraft}>Restore</button>
            <button type="button" className="mini-act ghost" onClick={discardDraft}>Discard</button>
          </div>
        </div>
      )}

      <div className="create-builder-layout">
        <SectionNav
          sections={SECTIONS} issues={issues} done={done} doneCount={doneCount} total={PROGRESS_IDS.length}
          saving={saving} saveDisabled={saveDisabled} saveLabel={saveLabel} headBtnRef={headBtnRef} loading={recordLoading}
        />
        <CreateForm
          data={data} categories={categories} templates={templates} categoryId={categoryId} onCategory={onCategory}
          sectionLoading={sectionLoading} templatesLoading={tplLoading} expectTemplate={expectTemplate}
          set={set} add={add} patch={patch} remove={remove} focus={focus} vis={vis} touch={touch}
          tagFor={tagFor} onSubmit={onSubmit} notify={notify} invitationId={invitationId}
          originalClientEmail={(JSON.parse(snap) as InvitationData).clientEmail || ""}
        />
      </div>

      {/* mobile action bar */}
      <div className="mbar">
        <button className="secondary" type="button" onClick={() => setPreviewOpen(true)}><Eye size={17} /> Preview</button>
        <button className="primary" type="submit" form="create-form" disabled={saveDisabled}>
          {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />} {saveLabel}
        </button>
      </div>

      {slot && (
        <LivePreview
          slot={slot} compiled={compiled} selected={selectedInfo} loading={previewLoading} open={previewOpen}
          focusRequest={focusRequest} onClose={closePreview} onChoose={chooseTemplate}
        />
      )}

      {share && (
        <ShareModal
          name={coupleName} link={getLink(share.id)} onCopy={copyShareLink} onWhatsApp={shareWhatsApp}
          onClose={() => setShare(null)} onAnother={createAnother}
        />
      )}

      {blocker.state === "blocked" && <LeaveModal onSave={leaveSave} onCancel={leaveCancel} onStay={leaveStay} />}

      {toast && createPortal(
        <div className="dx-toast" role="status">
          {toast.tone === "error" ? <AlertCircle size={15} className="bad" /> : <Check size={15} />} {toast.msg}
        </div>,
        document.body
      )}

      <style>{createCss}</style>
    </div>
  );
}
