/* Browser-storage keys that hold a signed-in user's data. Kept in one tiny file (no imports) so both the
   Create page and the sign-out cleanup (lib/userData.ts) can use them without importing each other. */
export const LS_DRAFT = "schedy_create_draft_";
