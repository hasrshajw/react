import React, { memo, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, Save } from "../../../components/Icons";
import type { SectionDef } from "../../../types/invitation";
import { getScrollRoot, isScrollLocked, onSectionChosen, scrollToSection } from "../scroll";

interface Props {
  sections: SectionDef[];
  issues: Record<string, number>;
  done: Record<string, boolean>;
  doneCount: number;
  total: number;
  saving: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  headBtnRef: React.RefObject<HTMLButtonElement | null>;
  /** Editing: the progress count is unknown until the invitation arrives. */
  loading?: boolean;
}

/* Owns every piece of nav-only state (active tab, stuck, header-button visibility),
   so scrolling never re-renders the form or the live preview. */
export const SectionNav = memo(function SectionNav({ sections, issues, done, doneCount, total, saving, saveDisabled, saveLabel, headBtnRef, loading = false }: Props) {
  const [active, setActive] = useState<string>(sections[0].id);
  const [stuck, setStuck] = useState(false);
  const [navCta, setNavCta] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pct = Math.round((doneCount / total) * 100);

  /* a tab was clicked (or a validation error jumped to a section) */
  useEffect(() => onSectionChosen(setActive), []);

  /* scroll-spy: the active tab is the last section whose top has passed just under the sticky nav */
  useEffect(() => {
    const root = getScrollRoot();
    if (!root) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (isScrollLocked()) return;
      const navBottom = (navRef.current?.getBoundingClientRect().bottom ?? 0) + 24;
      let cur = sections[0].id;
      for (const sec of sections) {
        const el = document.getElementById(`sec-${sec.id}`);
        if (el && el.getBoundingClientRect().top <= navBottom) cur = sec.id;
      }
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) cur = sections[sections.length - 1].id;
      setActive(cur);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    root.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => { root.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [sections]);

  /* sliding pill behind the active tab (moved directly, no re-render) */
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () => {
      const chip = bar.querySelector<HTMLElement>(`[data-id="${active}"]`);
      const pl = pillRef.current;
      if (chip && pl) { pl.style.width = `${chip.offsetWidth}px`; pl.style.transform = `translateX(${chip.offsetLeft}px)`; }
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready?.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, issues, done]);

  /* keep the active chip visible inside the scrollable bar */
  useEffect(() => {
    const bar = barRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!bar || !chip) return;
    bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  /* stuck: the nav has stuck under the top navbar, so it can separate from the content */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const navbarH = document.querySelector(".top-navbar")?.getBoundingClientRect().height || 64;
    const io = new IntersectionObserver(([en]) => setStuck(!en.isIntersecting), { root: getScrollRoot(), rootMargin: `-${Math.round(navbarH)}px 0px 0px 0px`, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* show a Create/Update button in the nav while the real one in the page header is out of view */
  useEffect(() => {
    const btn = headBtnRef.current;
    if (!btn || typeof IntersectionObserver === "undefined") return;
    const navbarH = document.querySelector(".top-navbar")?.getBoundingClientRect().height || 64;
    const io = new IntersectionObserver(([en]) => setNavCta(!en.isIntersecting), { root: getScrollRoot(), rootMargin: `-${Math.round(navbarH)}px 0px 0px 0px`, threshold: 0.01 });
    io.observe(btn);
    return () => io.disconnect();
  }, [headBtnRef]);

  return (
    <>
      <div ref={sentinelRef} className="sec-sentinel" aria-hidden="true" />
      <nav ref={navRef} className={`sec-nav${stuck ? " stuck" : ""}`} aria-label="Form sections">
        <div className="sec-chips" ref={barRef}>
          <span className="sec-pill" ref={pillRef} aria-hidden="true" />
          {sections.map((s) => {
            const Icon = s.icon;
            const bad = !!issues[s.id];
            const ok = !bad && done[s.id];
            return (
              <button
                key={s.id} type="button" data-id={s.id} aria-current={active === s.id ? "step" : undefined}
                className={`chip-nav${active === s.id ? " on" : ""}${ok ? " ok" : ""}${bad ? " bad" : ""}`}
                onClick={() => scrollToSection(s.id)}
              >
                <span className="cn-ic">{bad ? <AlertCircle size={14} /> : ok ? <Check size={14} /> : <Icon size={14} />}</span>
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="sec-progress" title={`${doneCount} of ${total} sections complete`}>
          <span className={loading ? "sk-bg" : undefined} aria-hidden={loading || undefined}>{doneCount}/{total}</span>
          <i><b style={{ width: `${pct}%` }} /></i>
        </div>
        <div className={`sec-cta${navCta ? " show" : ""}`}>
          <button className="primary" type="submit" form="create-form" disabled={saveDisabled} title="Save (Ctrl+S)">
            {saving ? <Loader2 className="spin" size={15} /> : <Save size={15} />} {saveLabel}
          </button>
        </div>
      </nav>
    </>
  );
});
