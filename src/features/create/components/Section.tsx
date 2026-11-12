import React, { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { SectionId } from "../../../types/invitation";
import type { IconComponent } from "../../../components/Icons";
import { SECTIONS } from "../constants";

interface Props {
  id: SectionId;
  icon: IconComponent;
  title: string;
  tag?: { tone: string; text: string; loading?: boolean };
  /** This section's own data is still on its way (its fields are ghosts). When it turns false the section fades in. */
  loading?: boolean;
  children: ReactNode;
}

export function Section({ id, icon: Icon, title, tag, loading = false, children }: Props) {
  /* Fade the section in once its data has arrived, a little later for each section further down the form. */
  const [reveal, setReveal] = useState(false);
  const was = useRef(loading);
  useEffect(() => {
    if (was.current && !loading) setReveal(true);
    if (loading) setReveal(false);
    was.current = loading;
  }, [loading]);
  const index = Math.max(0, SECTIONS.findIndex((s) => s.id === id));

  return (
    <section id={`sec-${id}`} aria-busy={loading || undefined} className={reveal ? "sec-reveal" : undefined} style={reveal ? ({ "--rv": `${index * 70}ms` } as CSSProperties) : undefined}>
      <div className="sec-head">
        <h2><i><Icon size={17} /></i>{title}</h2>
        {tag && <span className={`sec-tag ${tag.tone}${tag.loading ? " sk-bg" : ""}`} aria-hidden={tag.loading || undefined}>{tag.text}</span>}
      </div>
      {children}
    </section>
  );
}
