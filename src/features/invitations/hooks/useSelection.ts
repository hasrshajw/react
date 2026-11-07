import { useState } from "react";
import type { InvitationRow } from "../../../types/dashboard";

/** Checkbox selection of invitation ids, with "select this page" support. */
export function useSelection() {
  const [sel, setSel] = useState<Set<string>>(() => new Set());
  const clear = () => setSel(new Set());
  const selectMany = (rows: InvitationRow[]) => setSel(new Set(rows.map((x) => x.id)));
  const toggle = (id: string) => setSel((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const togglePage = (shown: InvitationRow[], allOnPage: boolean) => setSel((prev) => {
    const n = new Set(prev);
    if (allOnPage) shown.forEach((x) => n.delete(x.id)); else shown.forEach((x) => n.add(x.id));
    return n;
  });
  return { sel, clear, selectMany, toggle, togglePage };
}
