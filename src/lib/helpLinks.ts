/* Where the "Docs", "Support", "Help center" and "Contact support" links go (task L-1). They used to point at `#`.
   The addresses are not in the code: set VITE_DOCS_URL and VITE_SUPPORT_URL (an https address or a mailto: address)
   in the environment. A link whose value is empty or not allowed is not shown (menu items are shown as "Soon"). */

/** Returns the cleaned address when it is `https:` or `mailto:`, otherwise null. */
export const helpLink = (value: string | undefined | null): string | null => {
  const v = (value ?? "").trim();
  if (!v || v.length > 300) return null;
  try {
    const u = new URL(v);
    if (u.protocol === "https:" && /^https:\/\/[^/]/i.test(v) && u.hostname.includes(".") && !u.username && !u.password) return u.href;
    if (u.protocol === "mailto:" && /^mailto:[^\s@/?#]+@[^\s@/?#]+\.[^\s@/?#]+(\?[^\s]*)?$/i.test(v)) return v;
  } catch { /* not an address */ }
  return null;
};

export const DOCS_URL = helpLink(import.meta.env.VITE_DOCS_URL as string | undefined);
export const SUPPORT_URL = helpLink(import.meta.env.VITE_SUPPORT_URL as string | undefined);

/** Opens a help link: a web address in a new tab (no opener), a mailto: address in the mail app. */
export const openHelpLink = (href: string): void => {
  if (href.startsWith("mailto:")) window.location.href = href;
  else window.open(href, "_blank", "noopener,noreferrer");
};
