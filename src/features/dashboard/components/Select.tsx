import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  Check, ChevronDown,
} from "../../../components/Icons";
import { useEscape } from "../../../hooks/useEscape";

export interface SelectOption { value: string; label: string }

export const SORT_OPTIONS: SelectOption[] = [
  { value: "recent", label: "Recently added" },
  { value: "date", label: "Event date" },
  { value: "views", label: "Most viewed" },
];

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
}

export function Select({ value, onChange, options, label }: SelectProps) {
  const uid = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const [active, setActive] = useState(-1);
  const open = !!pos;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const cur = options[index];

  const close = (refocus = false) => {
    setPos(null);
    if (refocus) setTimeout(() => btnRef.current?.focus(), 0);
  };
  const openList = () => {
    const r = btnRef.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < Math.min(280, options.length * 40 + 20);
    setPos({ left: r.left, minWidth: r.width, top: up ? undefined : r.bottom + 6, bottom: up ? window.innerHeight - r.top + 6 : undefined });
    setActive(index);
  };
  const choose = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    close(true);
  };

  useEscape(open, () => close(true));
  useEffect(() => {
    if (!open) return undefined;
    listRef.current?.focus();
    const down = (e: MouseEvent) => { const t = e.target as Element; if (!t.closest(".dd-list") && !t.closest(".dd-btn")) close(); };
    const scroll = (e: Event) => { if (!(e.target as Element).closest?.(".dd-list")) close(); };
    document.addEventListener("mousedown", down);
    window.addEventListener("scroll", scroll, true);
    const resize = () => close();
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("mousedown", down);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", resize);
    };
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(`${uid}-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, uid]);

  const onBtnKey = (e: KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); if (open) close(); else openList(); }
  };
  const onListKey = (e: KeyboardEvent) => {
    const n = options.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % n); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + n) % n); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(n - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Tab") { close(); }
    else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const from = options.findIndex((o, i) => i > active && o.label.toLowerCase().startsWith(k));
      const any = from > -1 ? from : options.findIndex((o) => o.label.toLowerCase().startsWith(k));
      if (any > -1) setActive(any);
    }
  };

  return (
    <>
      <button
        ref={btnRef} type="button" className={`dd-btn${open ? " open" : ""}`} aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${label}: ${cur?.label ?? ""}`} onClick={() => (open ? close() : openList())} onKeyDown={onBtnKey}
      >
        <span>{cur?.label}</span>
        <ChevronDown size={15} />
      </button>
      {open && createPortal(
        <div
          ref={listRef} className="dd-list" role="listbox" tabIndex={-1} aria-label={label}
          aria-activedescendant={`${uid}-${active}`} onKeyDown={onListKey}
          style={pos ?? undefined}
        >
          {options.map((o, i) => (
            <div
              key={o.value} id={`${uid}-${i}`} role="option" aria-selected={o.value === value}
              className={`dd-opt${i === active ? " active" : ""}${o.value === value ? " sel" : ""}`}
              onMouseEnter={() => setActive(i)} onClick={() => choose(i)}
            >
              <span>{o.label}</span>
              {o.value === value && <Check size={14} />}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
