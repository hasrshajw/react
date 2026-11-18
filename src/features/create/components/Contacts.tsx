import React from "react";
import { Plus, Trash2 } from "../../../components/Icons";
import type { ContactItem, ListField } from "../../../types/invitation";
import { newContact, MAX_CONTACTS } from "../constants";
import { CONTACT_ROLE_MAX } from "../../../lib/contactLimits";

interface Props {
  field: "groomContacts" | "brideContacts";
  items: ContactItem[];
  add: (field: ListField, make: () => ContactItem) => void;
  patch: (field: ListField, id: string, patch: Partial<ContactItem>) => void;
  remove: (field: ListField, id: string) => void;
  focus: (field: string) => void;
  vis: (key: string) => string | undefined;
  touch: (key: string) => void;
  /** Whether contacts exist is unknown while the invitation loads: show the add button as a ghost (the usual state). */
  loading?: boolean;
}

export function Contacts({ field, items, add, patch, remove, focus, vis, touch, loading = false }: Props) {
  if (loading) return <span className="outline sk-bg" aria-hidden="true"><Plus size={15} /> Add contact</span>;
  return (
    <>
      {items.map((x, i) => {
        const at = i === 0 ? field : `${field === "groomContacts" ? "groom" : "bride"}-extra-${i + 1}-phone`;   // position-based, so the preview scrolls to the right card
        const key = `contact-${x.id}-phone`;
        const err = vis(key);
        return (
          <div className="repeat" key={x.id}>
            <button type="button" className="del" aria-label="Remove contact" onClick={() => remove(field, x.id)}><Trash2 size={15} /></button>
            <div className="grid three">
              <input aria-label="Contact name in English" placeholder="Name EN" value={x.nameEn} onFocus={() => focus(at)} onChange={(e) => patch(field, x.id, { nameEn: e.target.value })} />
              <input aria-label="Contact name in Telugu" lang="te" placeholder="Name తెలుగు" value={x.nameTe} onFocus={() => focus(at)} onChange={(e) => patch(field, x.id, { nameTe: e.target.value })} />
              <input
                id={`f-${key}`} aria-label="Contact phone" aria-invalid={!!err} className={err ? "bad" : ""} inputMode="tel" placeholder="Phone" value={x.phone}
                onFocus={() => focus(at)} onBlur={() => touch(key)} onChange={(e) => patch(field, x.id, { phone: e.target.value })}
              />
            </div>
            <div className="grid two">
              <input aria-label="Contact role in English" placeholder="Role EN (optional)" maxLength={CONTACT_ROLE_MAX} value={x.roleEn || ""} onFocus={() => focus(at)} onChange={(e) => patch(field, x.id, { roleEn: e.target.value })} />
              <input aria-label="Contact role in Telugu" lang="te" placeholder="Role తెలుగు" maxLength={CONTACT_ROLE_MAX} value={x.roleTe || ""} onFocus={() => focus(at)} onChange={(e) => patch(field, x.id, { roleTe: e.target.value })} />
            </div>
            {err && <em className="err">{err}</em>}
          </div>
        );
      })}
      {items.length < MAX_CONTACTS && <button type="button" className="outline" onClick={() => add(field, newContact)}><Plus size={15} /> Add contact</button>}
    </>
  );
}
