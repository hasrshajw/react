import { useSearchParams } from "react-router-dom";
import type { SortKey } from "../../../types/dashboard";
import { DEFAULTS, oneOf, type ParamKey, type StatusFilter, type WhenFilter } from "../utils";

/** Filters live in the URL so a filtered list can be bookmarked or shared.
 *  `onChange` runs after every change (the page uses it to reset paging and selection). */
export function useInvitationFilters(onChange: (patch: Partial<Record<ParamKey, string>>) => void) {
  const [sp, setSp] = useSearchParams();
  const status = oneOf<StatusFilter>(sp.get("status"), ["all", "published", "draft"], DEFAULTS.status);
  const when = oneOf<WhenFilter>(sp.get("when"), ["all", "upcoming", "week", "past"], DEFAULTS.when);
  const sort = oneOf<SortKey>(sp.get("sort"), ["recent", "date", "views"], DEFAULTS.sort);
  const tpl = sp.get("template") || DEFAULTS.template;
  const q = sp.get("q") || DEFAULTS.q;

  const setParams = (patch: Partial<Record<ParamKey, string>>) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (!v || v === DEFAULTS[k as ParamKey]) n.delete(k); else n.set(k, v);
      });
      return n;
    }, { replace: true });
    onChange(patch);
  };

  const hasFilters = status !== "all" || when !== "all" || tpl !== "all" || q.trim() !== "";
  const clearFilters = () => setParams({ status: "all", when: "all", template: "all", q: "" });

  return { status, when, sort, tpl, q, setParams, hasFilters, clearFilters };
}
