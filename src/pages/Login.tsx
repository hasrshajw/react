import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Check, Eye, EyeOff, Google, Loader2, Lock, Mail } from "../components/Icons";
import schedyMark from "../assets/schedy-mark.svg";
import loginCss from "../features/auth/login.css?inline";
import { useAuth } from "../hooks/useAuth";
import { AuthError, MIN_PASSWORD, isEmail } from "../lib/auth";

type Busy = "google" | "email" | null;
interface FieldErrors { email?: string; password?: string }

const FEATURES = [
  "Invitations in English and తెలుగు",
  "Share by link, WhatsApp or QR code",
  "Live preview while you edit",
];

export default function Login() {
  const { session, signInGoogle, signInEmail, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const state = loc.state as { from?: string; loggedOut?: boolean } | null;
  const loggedOut = !!state?.loggedOut;
  const dest = state?.from && !state.from.startsWith("/login") ? state.from : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [resetHint, setResetHint] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  /* "Log out" navigates here; the session is cleared on arrival, so a blocked navigation
     (e.g. the "Save your changes?" dialog on the Create page) leaves the person signed in. */
  useEffect(() => { if (loggedOut) logout(); }, [loggedOut, logout]);

  useEffect(() => {
    const prev = document.title;
    document.title = "Sign in · Schedy Admin";
    return () => { document.title = prev; };
  }, []);

  if (session && !loggedOut) return <Navigate to={dest} replace />;

  const finish = () => navigate(dest, { replace: true });
  const fail = (e: unknown) => {
    setFormError(e instanceof AuthError ? e.message : "Something went wrong. Please try again.");
    setBusy(null);
  };

  const google = async () => {
    if (busy) return;
    setFormError(""); setErrors({}); setBusy("google");
    try { await signInGoogle(); finish(); } catch (e) { fail(e); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next: FieldErrors = {};
    if (!email.trim()) next.email = "Enter your email address.";
    else if (!isEmail(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    else if (password.length < MIN_PASSWORD) next.password = `Password must be at least ${MIN_PASSWORD} characters.`;
    setErrors(next);
    setFormError("");
    if (next.email) { emailRef.current?.focus(); return; }
    if (next.password) { pwRef.current?.focus(); return; }
    setBusy("email");
    try { await signInEmail(email, password); finish(); } catch (err) { fail(err); }
  };

  return (
    <div className="login">
      <aside className="login-brand" aria-hidden="true">
        <div className="lb-top">
          <span className="lb-mark"><img src={schedyMark} alt="" /></span>
          Schedy Admin
        </div>
        <div className="lb-copy">
          <h2>Invitations your guests will remember.</h2>
          <p>Create, publish and track wedding invitations from one place.</p>
          <ul className="lb-list">
            {FEATURES.map((f) => (
              <li key={f}><i><Check size={14} /></i>{f}</li>
            ))}
          </ul>
        </div>
        <div className="lb-foot">Schedy Admin · Demo</div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div className="lc-brand">
            <span className="lb-mark"><img src={schedyMark} alt="" /></span>
            Schedy Admin
          </div>
          <h1>Welcome back</h1>
          <p className="lc-sub">Sign in to manage your invitations.</p>

          {loggedOut && !session && (
            <p className="lc-note" role="status"><Check size={16} /> You’ve been logged out.</p>
          )}

          <button type="button" className={`lc-btn lc-google${busy === "google" ? " is-busy" : ""}`} onClick={google} disabled={!!busy} aria-busy={busy === "google"}>
            {busy === "google" ? <Loader2 className="spin" size={18} /> : <Google size={18} />}
            {busy === "google" ? "Signing in…" : "Continue with Google"}
          </button>

          <div className="lc-or" role="separator"><span>or sign in with email</span></div>

          <form className="lc-form" onSubmit={submit} noValidate>
            <div className="lc-field">
              <label className="lc-label" htmlFor="login-email">Email</label>
              <div className={`lc-input${errors.email ? " bad" : ""}`}>
                <Mail size={18} />
                <input
                  ref={emailRef} id="login-email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
                  value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: undefined })); }}
                  disabled={!!busy} aria-invalid={!!errors.email} aria-describedby={errors.email ? "login-email-err" : undefined}
                />
              </div>
              {errors.email && <p className="lc-err" id="login-email-err">{errors.email}</p>}
            </div>

            <div className="lc-field">
              <div className="lc-label">
                <label htmlFor="login-password">Password</label>
                <button type="button" className="lc-link" onClick={() => setResetHint((v) => !v)}>Forgot password?</button>
              </div>
              <div className={`lc-input${errors.password ? " bad" : ""}`}>
                <Lock size={18} />
                <input
                  ref={pwRef} id="login-password" type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password"
                  value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((x) => ({ ...x, password: undefined })); }}
                  disabled={!!busy} aria-invalid={!!errors.password} aria-describedby={errors.password ? "login-password-err" : undefined}
                />
                <button type="button" className="lc-eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="lc-err" id="login-password-err">{errors.password}</p>}
            </div>

            {resetHint && <p className="lc-hint" role="status">Password reset isn’t available in demo mode.</p>}
            {formError && <p className="lc-alert" role="alert"><AlertCircle size={16} /> {formError}</p>}

            <button type="submit" className={`lc-btn lc-submit${busy === "email" ? " is-busy" : ""}`} disabled={!!busy} aria-busy={busy === "email"}>
              {busy === "email" && <Loader2 className="spin" size={18} />}
              {busy === "email" ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="lc-demo"><i aria-hidden="true" /> Demo mode: Google signs you in straight away. With email, any valid address and a password of {MIN_PASSWORD}+ characters works.</p>
        </div>
      </main>

      <style>{loginCss}</style>
    </div>
  );
}
