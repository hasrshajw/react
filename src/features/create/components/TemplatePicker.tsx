import React, { useMemo } from "react";
import { Check, CheckCircle2, LayoutTemplate } from "../../../components/Icons";
import { SkText } from "../../../components/Skeleton";
import { useRowHint } from "../../../hooks/useRowHint";
import { useFadeIn } from "../../../hooks/useFadeIn";
import { compile } from "../../../lib/compileInvitation";
import type { Category, Template } from "../../../types/invitation";
import { SAMPLE } from "../constants";

interface ThumbSource extends Template { thumbnail?: string; thumbnail_url?: string; image?: string; preview_image?: string; title?: string }

export function TemplateThumb({ t }: { t: ThumbSource }) {
  const img = t.thumbnail || t.thumbnail_url || t.image || t.preview_image;
  const src = t.html_code || "";
  const doc = useMemo(() => {
    if (img || !src) return "";
    try { return compile(src, SAMPLE); } catch { return ""; }
  }, [img, src]);
  const fade = useFadeIn();
  /* The preview iframes render slowly: show a shimmer until each one is ready, then fade it in. */
  if (img) return <>{!fade.loaded && <i className="sk thumb-shimmer" aria-hidden="true" />}<img ref={fade.imgRef} className={fade.className} src={img} alt="" loading="lazy" onLoad={fade.onLoad} onError={fade.onError} /></>;
  /* No scripts in thumbnails: they are static previews only. */
  if (doc) return <>{!fade.loaded && <i className="sk thumb-shimmer" aria-hidden="true" />}<iframe className={fade.className} title="" srcDoc={doc} sandbox="" loading="lazy" tabIndex={-1} aria-hidden="true" onLoad={fade.onLoad} /></>;
  return <span className="tp-none"><LayoutTemplate size={22} /></span>;
}

export function TemplatePicker({ categories, categoryId, onCategory, templates, value, onSelect, error, loading = false, pending = false, expectSelected = false }: { categories: Category[]; categoryId: string; onCategory: (id: string) => void; templates: ThumbSource[]; value: string; onSelect: (id: string) => void; error?: string; loading?: boolean; pending?: boolean; expectSelected?: boolean }) {
  const ghostCards = useRowHint("create-templates", templates.length, loading, 6, 3);
  const selected = templates.find((t) => String(t.id) === String(value));
  const visible = categoryId === "ALL" ? templates : templates.filter((t) => String(t.category_id) === String(categoryId));
  const nameOf = (t: ThumbSource) => t.name || t.title || `Template ${t.id}`;
  const cats = [{ id: "ALL", name: "All" }, ...categories];
  return (
    <div className={`tp${error ? " has-err" : ""}`} id="f-templateId" tabIndex={-1}>
      <div className="tp-cats" role="group" aria-label="Template category">
        {cats.map((c) => (
          <button key={c.id} type="button" aria-pressed={String(categoryId) === String(c.id)} className={`tp-cat${String(categoryId) === String(c.id) ? " on" : ""}`} onClick={() => onCategory(c.id)}>
            {c.name}
          </button>
        ))}
        {/* categories come from the server: ghost chips until they arrive ("All" is always there) */}
        {loading && [0, 1].map((i) => <span key={i} className="tp-cat sk-bg" aria-hidden="true">Wedding</span>)}
      </div>
      {(loading || pending) && expectSelected ? (
        <div className="tp-current" aria-hidden="true"><CheckCircle2 size={16} /> Using <b><SkText w={14} /></b></div>
      ) : selected ? (
        <div className="tp-current"><CheckCircle2 size={16} /> Using <b>{nameOf(selected)}</b></div>
      ) : (
        <div className="tp-hint">Pick a design to see your invitation take shape in the live preview.</div>
      )}
      <div className="tp-grid" role="radiogroup" aria-label="Templates" aria-busy={loading || pending}>
        {loading && Array.from({ length: ghostCards }, (_, i) => (
          <div key={i} className="tp-card" aria-hidden="true">
            <span className="tp-thumb sk-bg" />
            <span className="tp-name"><SkText w={12} /></span>
          </div>
        ))}
        {!loading && visible.map((t) => {
          /* The cards show as soon as the templates are there; which one is selected is only known once the invitation has loaded. */
          const on = !pending && String(t.id) === String(value);
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on} disabled={pending} className={`tp-card${on ? " on" : ""}`} onClick={() => onSelect(String(t.id))}>
              <span className="tp-thumb">
                <TemplateThumb t={t} />
                {on && <span className="tp-check"><Check size={14} /></span>}
              </span>
              <span className="tp-name">{nameOf(t)}</span>
            </button>
          );
        })}
        {!loading && visible.length === 0 && <div className="hint">No templates in this category yet.</div>}
      </div>
      {error && <em className="err">{error}</em>}
    </div>
  );
}
