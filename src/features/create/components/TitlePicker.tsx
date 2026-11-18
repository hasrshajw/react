import React, { useState } from "react";
import type { InvitationData } from "../../../types/invitation";
import { Field } from "./Field";
import {
  KEYS, TITLE_CUSTOM, TITLE_MAX, TITLE_NONE, TITLE_PRESETS, TITLE_TARGETS,
  customValue, detectTitleMode, presetPatch, sidesOf, titlePatch, titleSummary,
} from "../titles";
import type { TitleTarget } from "../titles";

type FieldProps = (name: string) => { name: string; onFocus: () => void; onBlur: () => void; error?: string; loading?: boolean };
interface Props {
  data: InvitationData;
  set: <K extends keyof InvitationData>(key: K, value: InvitationData[K]) => void;
  fp: FieldProps;
  loading?: boolean;
}

/** Compliment title (Chi., Chi. Sow., Mr., Dr. or your own words) for the groom, the bride, or both names. */
export function TitlePicker({ data, set, fp, loading = false }: Props) {
  const [target, setTarget] = useState<TitleTarget>("all");
  const [mode, setMode] = useState<string>(() => detectTitleMode(data, "all"));

  const write = (patch: Partial<InvitationData>) => (Object.keys(patch) as (keyof InvitationData)[]).forEach((k) => set(k, patch[k] as never));

  const pickTarget = (next: TitleTarget) => { setTarget(next); setMode(detectTitleMode(data, next)); };
  const pickMode = (next: string) => {
    setMode(next);
    if (next === TITLE_CUSTOM) return; /* keep what is there; the person types over it */
    write(presetPatch(target, next === TITLE_NONE ? "" : next));
  };
  const typeCustom = (lang: "en" | "te", value: string) => {
    const cur = customValue(data, target);
    const next = { ...cur, [lang]: value };
    write(titlePatch(target, () => next));
  };

  const first = sidesOf(target)[0];
  const cur = customValue(data, target);

  return (
    <div className="title-picker" role="group" aria-labelledby="title-picker-label">
      <div className="sub" id="title-picker-label">Compliment title</div>
      <div className="seg" role="radiogroup" aria-label="Show the title before">
        {TITLE_TARGETS.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={target === t.id} className={target === t.id ? "on" : undefined} disabled={loading} onClick={() => pickTarget(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="f">
        <label htmlFor="f-titlePreset">Title</label>
        <select id="f-titlePreset" value={mode} disabled={loading} onChange={(e) => pickMode(e.target.value)}>
          <option value={TITLE_NONE}>No title</option>
          {TITLE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          <option value={TITLE_CUSTOM}>Custom…</option>
        </select>
      </div>
      {mode === TITLE_CUSTOM && (
        <div className="grid two">
          <Field label="Custom title EN" {...fp(KEYS[first].en)} loading={loading} maxLength={TITLE_MAX} placeholder="e.g. Chi." value={cur.en} onChange={(v) => typeCustom("en", v)} />
          <Field label="Custom title తెలుగు" lang="te" {...fp(KEYS[first].te)} loading={loading} maxLength={TITLE_MAX} placeholder="ఉదా. చి." value={cur.te} onChange={(v) => typeCustom("te", v)} />
        </div>
      )}
      <div className="hint" aria-live="polite">{titleSummary(data)}</div>
    </div>
  );
}
