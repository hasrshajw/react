import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { LayoutDashboard, Pencil } from "../../components/Icons";
import { ProfileMenu } from "../../components/ProfileMenu";
import Sidebar, { type SidebarItem } from "../../components/Sidebar";
import { fetchMyInvitations, type MyInvitation } from "../../lib/api";
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
  const [list, setList] = useState<MyInvitation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchMyInvitations().then(
      (d) => { setList(d); setLoading(false); },
      () => { setError(true); setLoading(false); },
    );
  }, []);
  useEffect(() => { reload(); }, [reload]);

  /* The address wins (/my/<id> is the editor of that invitation); otherwise the last one picked; otherwise the newest. */
  const routeId = matchPath("/my/:id", pathname)?.params.id;
  const routeInv = routeId ? decodeURIComponent(routeId) : null;
  const selectedId = useMemo(() => {
    const ids = list?.map((i) => i.id) ?? [];
    if (routeInv && ids.includes(routeInv)) return routeInv;
    if (picked && ids.includes(picked)) return picked;
    return ids[0] ?? null;
  }, [list, routeInv, picked]);
  const selected = list?.find((i) => i.id === selectedId) ?? null;

  /* Edit only exists once there is an invitation to edit (otherwise it would point at the same page as Dashboard). */
  const items = useMemo<SidebarItem[]>(() => [
    { name: "Dashboard", path: "/my", Icon: LayoutDashboard, end: true },
    ...(selectedId ? [{ name: "Edit", path: `/my/${encodeURIComponent(selectedId)}`, Icon: Pencil, end: false }] : []),
  ], [selectedId]);

  const data = useMemo(
    () => ({ list, loading, error, reload, selectedId, select: setPicked, setPanelOpen, slot }),
    [list, loading, error, reload, selectedId, slot],
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
