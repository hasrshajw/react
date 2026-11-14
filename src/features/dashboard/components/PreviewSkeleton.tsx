import { Loading, Sk } from "../../../components/Skeleton";

/** Placeholder for the side preview panel while the invitation or its template is still loading.
 *  Same shape as the Create page's live preview placeholder (a small label, a round photo, two names, a divider, three lines),
 *  so the panel looks the same on every page and the real invitation replaces it without a jump. */
export function PreviewSkeleton({ label = "Loading preview" }: { label?: string }) {
  return (
    <div className="dp-skel" aria-busy="true">
      <div className="dp-skel-art" aria-hidden="true">
        <Sk w="38%" h={9} />
        <Sk circle w={112} h={112} style={{ margin: "10px 0" }} />
        <Sk w="58%" h={24} />
        <Sk w={18} h={14} />
        <Sk w="54%" h={24} />
        <Sk w={64} h={2} style={{ margin: "10px 0" }} />
        <Sk w="42%" h={9} />
        <Sk w="66%" h={9} />
        <Sk w="52%" h={9} />
      </div>
      <Loading label={label} />
    </div>
  );
}
