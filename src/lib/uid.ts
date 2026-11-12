/* One id generator for invitations, events and contacts (task L-5, L-6).
   An invitation's id is also its default link ID (`/<id>`), so it may only contain letters, digits and `-`:
   a `.` would make Vercel treat the path as a file and skip the app's rewrite. The fallback is used only where
   `crypto.randomUUID` is missing (old browsers, plain http). */
export const uid = (): string => {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(12);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return `${Date.now().toString(36)}-${Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("")}`;
};
