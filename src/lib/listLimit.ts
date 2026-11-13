/** Most invitations the admin list reads (M-5). Past this the read stops and the list says so on screen.
 *  Lives in its own file so `api.ts` and the UI share one number without the UI importing the data layer. */
export const LIST_LIMIT = 10000;
