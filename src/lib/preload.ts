/* Lazy chunk loaders, shared by App.tsx (which renders them with React.lazy) and by links that want to
   start the download early. import() of the same module twice downloads it once. */
export const loadLogin = () => import("../LoginApp");
export const loadAdmin = () => import("../AdminApp");
export const loadClient = () => import("../ClientApp");

export const preloadLogin = () => { void loadLogin(); };
export const preloadAdmin = () => { void loadAdmin(); };
