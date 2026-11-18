import React from "react";
import type { InvitationData, InviterName, ListField, ListItem, ListPatch } from "../../../types/invitation";
import {
  CLOSING_TITLES, DEFAULT_INVITE_MESSAGE_TE, INVITER_OPTIONS, INVITER_PREFIXES, INVITER_SOURCES, INVITER_SOURCE_LABELS, INVITE_MESSAGE_MAX, MAX_INVITER_NAMES,
  closingTitleMode, closingTitleTe, effectiveSources, inviterLinesTe, inviterMode, serializeSources, type InviterSource,
} from "../../../lib/inviteText";
import { newInviterName } from "../constants";
import { Plus, Trash2 } from "../../../components/Icons";
import { Bilingual } from "./Bilingual";
import { Field } from "./Field";

type FieldProps = (name: string) => { name: string; onFocus: () => void; onBlur: () => void; error?: string; loading?: boolean };
interface Props {
  data: InvitationData;
  set: <K extends keyof InvitationData>(key: K, value: InvitationData[K]) => void;
  add: (field: ListField, make: () => ListItem) => void;
  patch: (field: ListField, id: string, patch: ListPatch) => void;
  remove: (field: ListField, id: string) => void;
  fp: FieldProps;
  /** Like `fp`, but the preview focuses `focusKey` instead of the field's own name (used by the repeated rows). */
  fpx?: (name: string, focusKey: string) => ReturnType<FieldProps>;
  loading?: boolean;
}

/* Quick choices for the "who appears" checklist. */
const GROOM_SIDE: InviterSource[] = ["groom", "groomFather", "groomMother"];
const BRIDE_SIDE: InviterSource[] = ["bride", "brideFather", "brideMother"];
const QUICK: { label: string; sources: InviterSource[] }[] = [
  { label: "Groom side", sources: GROOM_SIDE },
  { label: "Bride side", sources: BRIDE_SIDE },
  { label: "All", sources: [...GROOM_SIDE, ...BRIDE_SIDE] },
  { label: "Nobody", sources: [] },
];
const sameSet = (a: InviterSource[], b: InviterSource[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Edit the invitation paragraph: the message, the closing title, who appears after it, and any number of custom names. */
export function InviteSection({ data, set, add, patch, remove, fp, fpx, loading = false }: Props) {
  const mode = inviterMode(data);
  const sources = effectiveSources(data);
  const legacy = !data.inviterSources.trim();
  const titleMode = closingTitleMode(data);
  const msg = fp("inviteMessageTe");
  const rowFp = (name: string) => (fpx ? fpx(name, "inviterNames") : fp(name));
  const names = data.inviterNames || [];
  const move = (i: number, by: -1 | 1) => {
    const next = [...names];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    set("inviterNames", next);
  };
  const writeSources = (list: InviterSource[]) => { set("inviterSources", serializeSources(list)); fp("inviterSources").onFocus(); };
  const lines = inviterLinesTe(data);
  return (
    <>
      <label className="f te" htmlFor="f-inviteMessageTe">
        <span>Invitation message తెలుగు</span>
        <textarea
          id="f-inviteMessageTe" rows={5} lang="te" value={loading ? "" : data.inviteMessageTe} disabled={loading}
          className={loading ? "sk-bg" : undefined} placeholder={DEFAULT_INVITE_MESSAGE_TE} maxLength={INVITE_MESSAGE_MAX}
          onFocus={msg.onFocus} onBlur={msg.onBlur} onChange={(e) => set("inviteMessageTe", e.target.value)}
        />
        <small className="counter">{loading ? "" : `${data.inviteMessageTe.length}/${INVITE_MESSAGE_MAX}`}</small>
      </label>
      <div className="hint">Leave it empty to use the standard text.</div>
      {!loading && data.inviteMessageTe.trim() !== DEFAULT_INVITE_MESSAGE_TE && (
        <button type="button" className="outline" onClick={() => set("inviteMessageTe", DEFAULT_INVITE_MESSAGE_TE)}>Use the standard text</button>
      )}

      <div className="sub">Closing title</div>
      <div className="f">
        <label htmlFor="f-closingTitleMode">Title above the names</label>
        <select
          id="f-closingTitleMode" value={titleMode === "" ? "itlu" : titleMode} disabled={loading} className={loading ? "sk-bg" : undefined}
          onChange={(e) => { set("closingTitleMode", e.target.value); fp("closingTitleMode").onFocus(); }}
        >
          {CLOSING_TITLES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          <option value="custom">Custom title</option>
          <option value="none">Hide the title</option>
        </select>
      </div>
      {titleMode === "custom" && (
        <Bilingual enLabel="Title EN" teLabel="Title తెలుగు" enField="closingTitleEn" teField="closingTitleTe" data={data} set={set as never} fp={fp} />
      )}

      <div className="sub">Who is inviting (ఇట్లు)</div>
      <div className="seg wrap" role="radiogroup" aria-label="Who is inviting">
        {INVITER_OPTIONS.map((o) => {
          const on = legacy && mode === o.id;
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} className={on ? "on" : undefined} disabled={loading}
              onClick={() => { set("inviterMode", o.id); if (!legacy) set("inviterSources", ""); fp("inviterMode").onFocus(); }}>
              {o.label}
            </button>
          );
        })}
      </div>
      {mode === "custom" && legacy && (
        <Bilingual enLabel="Name EN" teLabel="Name తెలుగు" enField="inviterEn" teField="inviterTe" data={data} set={set as never} fp={fp} />
      )}

      <div className="hint">Or choose exactly who appears:</div>
      <div className="seg wrap" role="group" aria-label="Quick choices">
        {QUICK.map((q) => (
          <button key={q.label} type="button" className={sameSet(sources, q.sources) ? "on" : undefined} disabled={loading} onClick={() => writeSources(q.sources)}>{q.label}</button>
        ))}
      </div>
      <div className="grid two" role="group" aria-label="People who appear">
        {INVITER_SOURCES.map((id) => (
          <label className="check" key={id}>
            <input type="checkbox" disabled={loading} checked={sources.includes(id)}
              onChange={(e) => writeSources(e.target.checked ? [...sources, id] : sources.filter((x) => x !== id))} /> {INVITER_SOURCE_LABELS[id]}
          </label>
        ))}
      </div>

      <div className="sub">Custom names</div>
      {!loading && names.map((n: InviterName, i) => (
        <div className="repeat" key={n.id}>
          <button type="button" className="del" aria-label="Remove name" onClick={() => remove("inviterNames", n.id)}><Trash2 size={15} /></button>
          <div className="sub">Name {i + 1}</div>
          <div className="f">
            <label htmlFor={`f-inviter-${n.id}-prefix`}>Prefix</label>
            <select id={`f-inviter-${n.id}-prefix`} value={n.prefix} onChange={(e) => patch("inviterNames", n.id, { prefix: e.target.value })}>
              {INVITER_PREFIXES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div className="grid two">
            <Field label="Name EN" {...rowFp(`inviter-${n.id}-nameEn`)} value={n.nameEn} onChange={(v) => patch("inviterNames", n.id, { nameEn: v })} />
            <Field label="Name తెలుగు" lang="te" {...rowFp(`inviter-${n.id}-nameTe`)} value={n.nameTe} onChange={(v) => patch("inviterNames", n.id, { nameTe: v })} />
          </div>
          <div className="grid two">
            <Field label="Relation EN" placeholder="e.g. Maternal uncle" {...rowFp(`inviter-${n.id}-relationEn`)} value={n.relationEn} onChange={(v) => patch("inviterNames", n.id, { relationEn: v })} />
            <Field label="Relation తెలుగు" lang="te" {...rowFp(`inviter-${n.id}-relationTe`)} value={n.relationTe} onChange={(v) => patch("inviterNames", n.id, { relationTe: v })} />
          </div>
          <div className="grid two">
            <button type="button" className="outline" aria-label="Move name up" disabled={i === 0} onClick={() => move(i, -1)}>↑ Up</button>
            <button type="button" className="outline" aria-label="Move name down" disabled={i === names.length - 1} onClick={() => move(i, 1)}>↓ Down</button>
          </div>
        </div>
      ))}
      {loading ? (
        <span className="outline sk-bg" aria-hidden="true"><Plus size={15} /> Add name</span>
      ) : names.length < MAX_INVITER_NAMES ? (
        <button type="button" className="outline" onClick={() => add("inviterNames", newInviterName)}><Plus size={15} /> Add name</button>
      ) : (
        <div className="hint">You can add up to {MAX_INVITER_NAMES} custom names.</div>
      )}

      {!loading && (
        <div className="hint" aria-live="polite">
          Preview: {closingTitleTe(data) || "(no title)"}{lines.length ? ` — ${lines.join(" · ")}` : " — (no names)"}
        </div>
      )}
    </>
  );
}
