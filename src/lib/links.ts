/**
 * The one place that builds the public link of an invitation.
 * New short links look like https://example.com/harshajw.
 * Old links (https://example.com/i/harshajw) keep working because the /i/:slug route is still there,
 * but nothing in the app creates them any more.
 */
export const invitationPath = (slug: string): string => `/${encodeURIComponent(slug.trim())}`;

export const invitationUrl = (slug: string): string => `${window.location.origin}${invitationPath(slug)}`;
