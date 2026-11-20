import React from "react";
import { Plus, Trash2 } from "../../../components/Icons";
import type { FamilyMember, ListField } from "../../../types/invitation";
import { newFamilyMember, MAX_FAMILY_PER_SIDE } from "../constants";
import { FAMILY_RELATIONS, INVITER_PREFIXES } from "../../../lib/inviteText";

interface Props {
  side: "groom" | "bride";
  /** Every relative of the invitation (both sides); this block shows and edits the ones of its own side. */
  items: FamilyMember[];
  add: (field: ListField, make: () => FamilyMember) => void;
  patch: (field: ListField, id: string, patch: Partial<FamilyMember>) => void;
  remove: (field: ListField, id: string) => void;
  focus: (field: string) => void;
  /** The relatives are unknown while the invitation loads: show the add button as a ghost (the usual state). */
  loading?: boolean;
}

const FIELD: ListField = "familyMembers";

/* T8: relatives (siblings, grandparents, uncles...) of one side. The list is shared by both sides; `side` filters it. */
export function Relatives({ side, items, add, patch, remove, focus, loading = false }: Props) {
  const mine = items.filter((x) => x.side === side);
  const at = `${side}-relatives-te`;   // the preview scrolls to this side's relatives
  if (loading) return <span className="outline sk-bg" aria-hidden="true"><Plus size={15} /> Add relative</span>;
  return (
    <>
      <div className="sub">Relatives (optional)</div>
      {mine.map((x) => (
        <div className="repeat" key={x.id}>
          <button type="button" className="del" aria-label="Remove relative" onClick={() => remove(FIELD, x.id)}><Trash2 size={15} /></button>
          <div className="grid two">
            <select aria-label="Relation" value={FAMILY_RELATIONS.some((r) => r.id === x.relation) ? x.relation : "other"} onFocus={() => focus(at)} onChange={(e) => patch(FIELD, x.id, { relation: e.target.value })}>
              {FAMILY_RELATIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <select aria-label="Title before the name" value={x.late === "1" ? "late" : x.prefix} disabled={x.late === "1"} onFocus={() => focus(at)} onChange={(e) => patch(FIELD, x.id, { prefix: e.target.value })}>
              {INVITER_PREFIXES.map((p) => <option key={p.id || "none"} value={p.id}>{p.label}</option>)}
              {x.late === "1" && <option value="late">కీ.శే.</option>}
            </select>
          </div>
          <div className="grid two">
            <input aria-label="Relative name in English" placeholder="Name EN" value={x.nameEn} onFocus={() => focus(at)} onChange={(e) => patch(FIELD, x.id, { nameEn: e.target.value })} />
            <input aria-label="Relative name in Telugu" lang="te" placeholder="Name తెలుగు" value={x.nameTe} onFocus={() => focus(at)} onChange={(e) => patch(FIELD, x.id, { nameTe: e.target.value })} />
          </div>
          <div className="grid two">
            <input aria-label="Spouse name in English" placeholder="Spouse EN (optional)" value={x.spouseEn} onFocus={() => focus(at)} onChange={(e) => patch(FIELD, x.id, { spouseEn: e.target.value })} />
            <input aria-label="Spouse name in Telugu" lang="te" placeholder="Spouse తెలుగు" value={x.spouseTe} onFocus={() => focus(at)} onChange={(e) => patch(FIELD, x.id, { spouseTe: e.target.value })} />
          </div>
          <label className="check"><input type="checkbox" checked={x.late === "1"} onChange={(e) => patch(FIELD, x.id, { late: e.target.checked ? "1" : "" })} /> Late (కీ.శే.)</label>
          <label className="check"><input type="checkbox" checked={x.show === "1"} onChange={(e) => patch(FIELD, x.id, { show: e.target.checked ? "1" : "" })} /> Show on the invitation</label>
        </div>
      ))}
      {mine.length < MAX_FAMILY_PER_SIDE && <button type="button" className="outline" onClick={() => add(FIELD, () => newFamilyMember(side))}><Plus size={15} /> Add relative</button>}
    </>
  );
}
