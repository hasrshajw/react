import React from "react";
import type { ParentStatus as Status } from "../../../types/invitation";
import { parentStatus } from "../../../lib/inviteText";

const OPTIONS: { id: Status; label: string }[] = [
  { id: "", label: "Alive" },
  { id: "late", label: "Late" },
  { id: "hidden", label: "Hide" },
];

interface Props {
  /** Shown to screen readers, e.g. "Groom's father". */
  label: string;
  value: unknown;
  onChange: (v: Status) => void;
  onFocus?: () => void;
  loading?: boolean;
}

/** Alive / Late / Hide for one parent. Late prints "కీ.శే." and hides the phone; Hide removes the parent from the invitation (the typed values are kept). */
export function ParentStatus({ label, value, onChange, onFocus, loading = false }: Props) {
  const current = parentStatus(value);
  return (
    <>
      <div className="seg wrap" role="radiogroup" aria-label={`${label} status`}>
        {OPTIONS.map((o) => (
          <button
            key={o.id || "alive"} type="button" role="radio" aria-checked={current === o.id} className={current === o.id ? "on" : undefined}
            disabled={loading} onClick={() => { onChange(o.id); onFocus?.(); }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {!loading && current === "late" && <div className="hint">Shown with “కీ.శే.”. The phone number is not shown.</div>}
      {!loading && current === "hidden" && <div className="hint">Not shown on the invitation. What you typed is kept.</div>}
    </>
  );
}
