import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, LayoutTemplate, Plus, Search, X } from "../components/Icons";
import { SkText, Loading } from "../components/Skeleton";
import { useTemplates } from "../hooks/useTemplates";
import { useRowHint } from "../hooks/useRowHint";
import { useFadeIn } from "../hooks/useFadeIn";
import { compile } from "../lib/compileInvitation";
import { SAMPLE } from "../features/create/constants";
import type { TemplateRecord } from "../types/dashboard";

const nameOf = (t: TemplateRecord) => t.name || t.title || `Template ${t.id}`;

function useCompiled(t: TemplateRecord) {
  const src = t.html_code || "";
  return useMemo(() => {
    if (!src) return "";
    try { return compile(src, SAMPLE); } catch { return ""; }
  }, [src]);
}

function Thumb({ t }: { t: TemplateRecord }) {
  const img = t.thumbnail || t.thumbnail_url || t.image || t.preview_image;
  const doc = useCompiled(t);
  const fade = useFadeIn();
  /* The preview iframes render slowly: show a shimmer until each one is ready, then fade it in. */
  if (img) return <>{!fade.loaded && <i className="sk thumb-shimmer" aria-hidden="true" />}<img ref={fade.imgRef} className={fade.className} src={img} alt="" loading="lazy" onLoad={fade.onLoad} onError={fade.onError} /></>;
  if (doc) return <>{!fade.loaded && <i className="sk thumb-shimmer" aria-hidden="true" />}<iframe className={fade.className} title="" srcDoc={doc} sandbox="" loading="lazy" tabIndex={-1} aria-hidden="true" onLoad={fade.onLoad} /></>;
  return <span className="tpl-none"><LayoutTemplate size={26} /></span>;
}

function PreviewModal({ t, onClose }: { t: TemplateRecord; onClose: () => void }) {
  const doc = useCompiled(t);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="tpl-modal" role="dialog" aria-modal="true" aria-label={`${nameOf(t)} preview`} onClick={onClose}>
      <div className="tpl-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="tpl-modal-head">
          <b>{nameOf(t)}</b>
          <button type="button" className="tpl-x" aria-label="Close preview" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="tpl-phone"><iframe title={nameOf(t)} srcDoc={doc} sandbox="" /></div>
        <Link className="tpl-use big" to={`/create?template=${encodeURIComponent(t.id)}`}><Plus size={16} /> Use this template</Link>
      </div>
    </div>
  );
}

/** Same box as a real template card; only the server data (thumbnail, name, category, button) is ghosted. */
function TemplateCardSkeleton() {
  return (
    <article className="tpl-card is-skeleton" aria-hidden="true">
      <div className="tpl-thumb sk-bg" />
      <div className="tpl-info">
        <b><SkText w={13} /></b>
        <span className="tpl-badge sk-bg">Wedding</span>
      </div>
      <span className="tpl-use sk-bg">Use template</span>
    </article>
  );
}

export default function Templates() {
  const { templates, categories, loading } = useTemplates();
  const skeletonCards = useRowHint("templates", templates.length, loading, 8, 4);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<TemplateRecord | null>(null);

  const catName = (id: string | number) => categories.find((c) => String(c.id) === String(id))?.name || "General";
  const visible = (templates as TemplateRecord[]).filter((t) =>
    (cat === "all" || String(t.category_id) === String(cat)) &&
    nameOf(t).toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <div className="tpl-page" aria-busy={loading}>
      <header className="tpl-head">
        <div>
          <h1>Manage Templates</h1>
          <p>{loading ? <SkText w={34} /> : `${templates.length} template${templates.length === 1 ? "" : "s"} available for invitations`}</p>
        </div>
        <label className="tpl-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" aria-label="Search templates" />
        </label>
      </header>

      <div className="tpl-cats" role="group" aria-label="Template category">
        {[{ id: "all", name: "All" }, ...categories].map((c) => (
          <button key={c.id} type="button" aria-pressed={cat === c.id} className={`tpl-cat${cat === c.id ? " on" : ""}`} onClick={() => setCat(c.id)}>
            {c.name}
          </button>
        ))}
        {/* categories come from the server: ghost chips until they arrive ("All" is always there) */}
        {loading && [0, 1].map((i) => <span key={i} className="tpl-cat sk-bg" aria-hidden="true">Wedding</span>)}
      </div>

      <div className="tpl-grid">
        {loading && <Loading label="Loading templates" />}
        {loading && Array.from({ length: skeletonCards }, (_, i) => <TemplateCardSkeleton key={i} />)}
        {!loading && visible.map((t) => (
          <article key={t.id} className="tpl-card">
            <button type="button" className="tpl-thumb" onClick={() => setOpen(t)} aria-label={`Preview ${nameOf(t)}`}>
              <Thumb t={t} />
              <span className="tpl-eye"><Eye size={16} /> Preview</span>
            </button>
            <div className="tpl-info">
              <b>{nameOf(t)}</b>
              <span className="tpl-badge">{catName(t.category_id)}</span>
            </div>
            <Link className="tpl-use" to={`/create?template=${encodeURIComponent(t.id)}`}>Use template</Link>
          </article>
        ))}
        {!loading && visible.length === 0 && <div className="tpl-empty">No templates match your search.</div>}
      </div>

      {open && <PreviewModal t={open} onClose={() => setOpen(null)} />}

      <style>{`
        .tpl-page { max-width: 1100px; margin: 0 auto; color: var(--dark, #1b1c25); }
        .tpl-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 18px; }
        .tpl-head h1 { margin: 0 0 4px; font-size: 24px; font-weight: 700; }
        .tpl-head p { margin: 0; font-size: 13.5px; color: var(--gray, #6d7081); }
        .tpl-search { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 14px; width: 260px; max-width: 100%; background: #fff; border: 1px solid var(--gray-border, #dadce0); border-radius: 14px; color: var(--gray, #6d7081); }
        .tpl-search:focus-within { border-color: var(--primary, #673de6); box-shadow: 0 0 0 3px var(--primary-lightest, #673de614); }
        .tpl-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; color: var(--dark, #1b1c25); }
        .tpl-cats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
        .tpl-cat { height: 36px; padding: 0 16px; border: 1px solid var(--gray-border, #dadce0); border-radius: 999px; background: #fff; color: var(--gray-dark, #44465a); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .2s, color .2s, border-color .2s; }
        .tpl-cat:hover { border-color: var(--periwinkle, #b8a5f5); }
        .tpl-cat.on { background: var(--btn, #673de6); border-color: var(--btn, #673de6); color: #fff; }
        .tpl-cat.on:hover { background: var(--btn-hover, #471ea7); border-color: var(--btn-hover, #471ea7); }
        .tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        .tpl-card { display: flex; flex-direction: column; gap: 12px; padding: 14px; background: #fff; border: 1px solid var(--gray-border, #dadce0); border-radius: 22px; transition: transform .25s, border-color .25s; }
        .tpl-card:hover { transform: translateY(-3px); border-color: var(--periwinkle, #b8a5f5); }
        .tpl-thumb { position: relative; display: block; width: 100%; aspect-ratio: 390 / 694; padding: 0; overflow: hidden; border: 1px solid var(--gray-border, #dadce0); border-radius: 16px; background: #f5f6fa; cursor: pointer; container-type: inline-size; }
        .tpl-thumb iframe { position: absolute; top: 0; left: 0; width: 390px; height: 694px; border: 0; background: #fff; transform: scale(calc(100cqw / 390px)); transform-origin: 0 0; pointer-events: none; }
        .tpl-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .tpl-none { display: grid; place-items: center; width: 100%; height: 100%; color: var(--gray, #6d7081); }
        .tpl-eye { position: absolute; left: 50%; bottom: 12px; transform: translate(-50%, 8px); display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; background: #101011; color: #fff; font-size: 12.5px; font-weight: 600; opacity: 0; transition: opacity .2s, transform .2s; }
        .tpl-thumb:hover .tpl-eye, .tpl-thumb:focus-visible .tpl-eye { opacity: 1; transform: translate(-50%, 0); }
        .tpl-info { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .tpl-info b { font-size: 14.5px; font-weight: 700; }
        .tpl-badge { padding: 3px 10px; border-radius: 999px; background: var(--primary-light, #ebe4ff); color: var(--primary, #673de6); font-size: 11.5px; font-weight: 700; white-space: nowrap; }
        .tpl-use { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; border-radius: 12px; background: var(--btn, #673de6); color: #fff; font-size: 13.5px; font-weight: 700; text-decoration: none; box-shadow: none; transition: background .2s; }
        .tpl-use:hover { background: var(--btn-hover, #471ea7); }
        .tpl-use.big { height: 46px; width: 100%; }
        .tpl-card.is-skeleton { pointer-events: none; }
        .tpl-card.is-skeleton:hover { transform: none; border-color: var(--gray-border, #dadce0); }
        .tpl-empty { grid-column: 1 / -1; padding: 40px 0; text-align: center; color: var(--gray, #6d7081); font-size: 14px; }
        .tpl-modal { position: fixed; inset: 0; z-index: 5000; display: grid; place-items: center; padding: 16px; background: rgba(16, 16, 17, .6); }
        .tpl-modal-box { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 420px; max-height: 100%; padding: 16px; background: #fff; border-radius: 24px; }
        .tpl-modal-head { display: flex; align-items: center; justify-content: space-between; font-size: 15px; }
        .tpl-x { width: 34px; height: 34px; display: grid; place-items: center; border: 0; border-radius: 50%; background: var(--gray-light, #f1f2f6); cursor: pointer; }
        .tpl-phone { flex: 1; min-height: 0; height: min(694px, 68vh); border: 1px solid var(--gray-border, #dadce0); border-radius: 16px; overflow: hidden; }
        .tpl-phone iframe { width: 100%; height: 100%; border: 0; background: #fff; }
      `}</style>
    </div>
  );
}
