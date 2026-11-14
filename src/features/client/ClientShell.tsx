import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { LayoutDashboard, Pencil } from "../../components/Icons";
import { ProfileMenu } from "../../components/ProfileMenu";
import Sidebar, { type SidebarItem } from "../../components/Sidebar";
import { fetchMyInvitation, fetchMyInvitationList, type MyInvitation } from "../../lib/api";
import { DOCS_URL, SUPPORT_URL } from "../../lib/helpLinks";
import { clientNotificationBody, clientNotificationHref } from "../notifications/useAdminNotifications";
import { ClientCtx, publicUrlOf } from "./clientContext";
import clientWsCss from "./clientWorkspace.css?inline";
import schedyMark from "../../assets/schedy-mark.svg";

/* The client area's frame: the same strip, sidebar and top navigation as the admin shell, with two links only (Dashboard, Edit). */

const CRUMBS: Record<string, string[]> = { "/my": ["Dashboard", "Overview"] };
const crumbsFor = (pathname: string): string[] => {
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return CRUMBS[clean] ?? ["Manage", "Edit invitation"];
};

export function ClientShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  /* The list is read light (no `details`); the invitation being shown or edited is read in full, one at a time (fetchMyInvitation). */
  const [light, setLight] = useState<MyInvitation[] | null>(null);
  const [fulls, setFulls] = useState<Record<string, MyInvitation>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const wantedRef = useRef<string | null>(null);
  const tried = useRef<Set<string>>(new Set());

  /* Reads the list and, in the same step, the invitation that is on screen, so a reload (after a submit) swaps both at once. */
  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    tried.current = new Set();
    fetchMyInvitationList().then(
      async ({ items, complete }) => {
        const map: Record<string, MyInvitation> = {};
        if (complete) for (const i of items) map[i.id] = i;
        else {
          const ids = items.map((i) => i.id);
          const w = wantedRef.current && ids.includes(wantedRef.current) ? wantedRef.current : ids[0];
          if (w) { tried.current.add(w); const f = await fetchMyInvitation(w); if (f) map[w] = f; }
        }
        setLight(items); setFulls(map); setLoading(false);
      },
    ).catch(() => { setError(true); setLoading(false); }); // a failed list read or a failed read of the invitation on screen
  }, []);
  useEffect(() => { reload(); }, [reload]);

  /* The address wins (/my/<id> is the editor of that invitation); otherwise the last one picked; otherwise the newest. */
  const routeId = matchPath("/my/:id", pathname)?.params.id;
  const routeInv = routeId ? decodeURIComponent(routeId) : null;
  const selectedId = useMemo(() => {
    const ids = light?.map((i) => i.id) ?? [];
    if (routeInv && ids.includes(routeInv)) return routeInv;
    if (picked && ids.includes(picked)) return picked;
    return ids[0] ?? null;
  }, [light, routeInv, picked]);
  wantedRef.current = selectedId;

  /* The invitation on screen has no full copy yet (another one was picked, or the address changed): read just that one. */
  const needFull = !!selectedId && !fulls[selectedId];
  useEffect(() => {
    if (!selectedId || fulls[selectedId] || tried.current.has(selectedId)) return;
    tried.current.add(selectedId);
    let live = true;
    fetchMyInvitation(selectedId).then(
      (f) => {
        if (!live) return;
        if (f) setFulls((m) => ({ ...m, [f.id]: f }));
        else setLight((l) => (l ? l.filter((i) => i.id !== selectedId) : l)); // not theirs or gone: leave it out
      },
      () => { if (live) setError(true); },
    );
    return () => { live = false; };
  }, [selectedId, fulls]);

  /* Consumers see the list only once the invitation on screen is complete, with that one row swapped for its full copy. */
  const list = useMemo(
    () => (light && (!selectedId || fulls[selectedId]) ? light.map((i) => fulls[i.id] ?? i) : null),
    [light, fulls, selectedId],
  );
  const selected = list?.find((i) => i.id === selectedId) ?? null;

  /* Edit only exists once there is an invitation to edit (otherwise it would point at the same page as Dashboard). */
  const items = useMemo<SidebarItem[]>(() => [
    { name: "Dashboard", path: "/my", Icon: LayoutDashboard, end: true },
    ...(selectedId ? [{ name: "Edit", path: `/my/${encodeURIComponent(selectedId)}`, Icon: Pencil, end: false }] : []),
  ], [selectedId]);

  const data = useMemo(
    () => ({ list, loading: (loading || needFull) && !error, error, reload, selectedId, select: setPicked, setPanelOpen, slot }),
    [list, loading, needFull, error, reload, selectedId, slot],
  );

  return (
    <ClientCtx.Provider value={data}>
      <div className="client-ws">
        <style>{clientWsCss}</style>
        <header className="client-promo">
          <div className="promo-brand">
            <span className="promo-mark" aria-hidden="true"><img src={schedyMark} alt="" /></span>
            <span className="promo-name">Schedy</span>
          </div>
          {DOCS_URL || SUPPORT_URL ? (
            <nav className="promo-right" aria-label="Help">
              {DOCS_URL && <a className="promo-link" href={DOCS_URL} target="_blank" rel="noopener noreferrer">Docs</a>}
              {SUPPORT_URL && <a className="promo-link" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">Support</a>}
            </nav>
          ) : <span />}
        </header>

        <div className="client-ws-body">
          <div className="client-app">
            <Sidebar
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              panelOpen={panelOpen}
              onHoverExpand={setHoverExpanded}
              profileOpen={profileOpen}
              onProfileClick={() => setProfileOpen((o) => !o)}
              items={items}
              crumbsFor={crumbsFor}
              homePath="/my"
              sectionLabel="My invitation"
              showCreate={false}
              liveSiteUrl={selected ? publicUrlOf(selected) : null}
              liveSiteLabel="View invitation"
              liveSiteDot={!!selected?.published}
              notificationHref={clientNotificationHref}
              notificationBody={clientNotificationBody}
            />
            <main
              id="main"
              tabIndex={-1}
              className={`main-content ${(collapsed || panelOpen) && !hoverExpanded ? "content-collapsed" : "content-expanded"}`}
            >
              {children}
            </main>
          </div>
          <div ref={setSlot} className="preview-slot" />
        </div>
      </div>
      {profileOpen && <ProfileMenu variant="client" onClose={() => setProfileOpen(false)} />}
    </ClientCtx.Provider>
  );
}
