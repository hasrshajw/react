import React from "react";
import type { ReactNode } from "react";
import type { SectionId } from "../../../types/invitation";

interface Props {
  id: SectionId;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  tag?: { tone: string; text: string };
  children: ReactNode;
}

export function Section({ id, icon: Icon, title, tag, children }: Props) {
  return (
    <section id={`sec-${id}`}>
      <div className="sec-head">
        <h2><i><Icon size={17} /></i>{title}</h2>
        {tag && <span className={`sec-tag ${tag.tone}`}>{tag.text}</span>}
      </div>
      {children}
    </section>
  );
}
