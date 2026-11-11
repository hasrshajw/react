/* Lazy chunk for /login: the login page together with the auth provider and Supabase SDK it needs. */
import { AuthProvider } from "./hooks/useAuth";
import Login from "./pages/Login";

export default function LoginApp() {
  return <AuthProvider><Login /></AuthProvider>;
}
