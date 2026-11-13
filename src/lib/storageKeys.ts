/* Browser-storage keys that hold a signed-in user's data. Kept in one tiny file (no imports) so both the
   Create page and the sign-out cleanup (lib/userData.ts) can use them without importing each other. */
/* Admin create drafts: key is prefix + email + ":" + (editId|"new") (B6 / M-1, 66th update). */
export const LS_DRAFT = "schedy_create_draft_";
/* Client editor drafts: key is prefix + email + ":" + invitation id (B6, M-1). */
export const LS_CLIENT_DRAFT = "schedy_client_draft_";
