import type { MouseEvent, RefObject } from "react";
import { Search, Trash2 } from "../../../components/Icons";
import { SkText } from "../../../components/Skeleton";
import { fmt } from "../../../lib/dashboardData";
import type { SortKey } from "../../../types/dashboard";
import { SORT_OPTIONS, Select } from "../../dashboard/components/Select";
import { WHEN_FILTERS, type ParamKey, type WhenFilter } from "../utils";

interface Props {
  loading: boolean;
  when: WhenFilter;
  counts: Record<"upcoming" | "week" | "past", number>;
  hasFilters: boolean;
  q: string;
  tpl: string;
  sort: SortKey;
  templates: { key: string; name: string; n: number }[];
  trashedCount: number;
  searchRef: RefObject<HTMLInputElement>;
  onParams: (patch: Partial<Record<ParamKey, string>>) => void;
  onClearFilters: () => void;
  onOpenTrash: (e: MouseEvent<HTMLButtonElement>) => void;
}

/** Date chips on the left; search, template, sort and trash on the right. */
export function InvitationsToolbar(p: Props) {
  return (
    <div className="inv-toolbar">
      <div className="inv-chips" role="group" aria-label="Filter by event date">
        {WHEN_FILTERS.map(([key, label, hint]) => (
          <button
            key={key} type="button" aria-pressed={p.when === key} title={hint}
            className={`inv-filter${p.when === key ? " on" : ""}`}
            onClick={() => p.onParams({ when: p.when === key ? "all" : key })}
          >
            {label} <em>{p.loading ? <SkText w={2} /> : fmt(p.counts[key])}</em>
          </button>
        ))}
        {p.hasFilters && <button type="button" className="link-btn" onClick={p.onClearFilters}>Clear filters</button>}
      </div>
      <div className="recent-tools">
        <label className="search">
          <Search size={15} />
          <input
            ref={p.searchRef} type="search" placeholder="Search couple or client email" value={p.q} aria-label="Search invitations"
            onChange={(e) => p.onParams({ q: e.target.value })}
          />
          {!p.q && <kbd className="kbd" aria-hidden="true">/</kbd>}
        </label>
        {p.templates.length > 1 && (
          <Select
            label="Filter by template" value={p.tpl} onChange={(v) => p.onParams({ template: v })}
            options={[{ value: "all", label: "All templates" }, ...p.templates.map((t) => ({ value: t.key, label: `${t.name} (${t.n})` }))]}
          />
        )}
        <Select label="Sort invitations" value={p.sort} options={SORT_OPTIONS} onChange={(v) => p.onParams({ sort: v })} />
        {p.trashedCount > 0 && (
          <button type="button" className="act-btn" onClick={p.onOpenTrash}>
            <Trash2 size={14} /> Trash <em className="cnt">{p.trashedCount}</em>
          </button>
        )}
      </div>
    </div>
  );
}
