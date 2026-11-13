import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Check, Eye, EyeOff, Google, Loader2, Lock, Mail } from "../components/Icons";
import schedyMark from "../assets/schedy-mark.svg";
import loginCss from "../features/auth/login.css?inline";
import { useAuth } from "../hooks/useAuth";
import { preloadAdmin } from "../lib/preload";
import { AuthError, MIN_PASSWORD, RECOVERY_LINK, isEmail, isSafeTarget, requestPasswordReset, setNewPassword, takeLoginTarget } from "../lib/auth";

type Busy = "google" | "email" | null;
interface FieldErrors { email?: string; password?: string }

const FEATURES = [
  "Invitations in English and తెలుగు",
  "Share by link, WhatsApp or QR code",
  "Live preview while you edit",
];

export default function Login() {
  const { session, signInGoogle, signInEmail, signUpEmail, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const state = loc.state as { from?: string; loggedOut?: boolean } | null;
  const loggedOut = !!state?.loggedOut;
  /* M-7: the page we came from, kept through the Google redirect (read once; see lib/auth.ts). */
  const [returnTo] = useState(takeLoginTarget);
  const dest = isSafeTarget(state?.from) ? state.from : returnTo ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signedUpNotice, setSignedUpNotice] = useState(false);
  const isSignUp = mode === "signup";
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [recovering, setRecovering] = useState(RECOVERY_LINK);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  /* "Log out" navigates here; the session is cleared on arrival, so a blocked navigation
     (e.g. the "Save your changes?" dialog on the Create page) leaves the person signed in. */
  /* M-1: the form stays locked until Supabase has finished signing out; a late sign-out must not end the next login. */
  const [signingOut, setSigningOut] = useState(loggedOut);
  useEffect(() => {
    if (!loggedOut) return;
    let live = true;
    void logout().finally(() => { if (live) setSigningOut(false); });
    return () => { live = false; };
  }, [loggedOut, logout]);
  const locked = !!busy || signingOut || resetting;
  /* The dashboard is the next page after a login: download it while the person types their password. */
  useEffect(() => { if (!loggedOut) preloadAdmin(); }, [loggedOut]);

  useEffect(() => {
    const prev = document.title;
    document.title = "Sign in · Schedy Admin";
    return () => { document.title = prev; };
  }, []);

  /* M-7: coming back with the browser's Back button (or from the back/forward cache) after starting Google sign-in
     must not leave the button stuck on "Signing in…". */
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setBusy((b) => (b === "google" ? null : b)); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  if (session && !loggedOut && !recovering) return <Navigate to={dest} replace />;

  const finish = () => navigate(dest, { replace: true });
  const fail = (e: unknown) => {
    setFormError(e instanceof AuthError ? e.message : "Something went wrong. Please try again.");
    setBusy(null);
  };

  const google = async () => {
    if (locked) return;
    setFormError(""); setErrors({}); setBusy("google");
    try { await signInGoogle(state?.from ?? undefined); finish(); } catch (e) { fail(e); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (locked) return;
    const next: FieldErrors = {};
    if (!email.trim()) next.email = "Enter your email address.";
    else if (!isEmail(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = isSignUp ? "Choose a password." : "Enter your password.";
    else if (isSignUp && password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters.`;
    setErrors(next);
    setFormError("");
    if (next.email) { emailRef.current?.focus(); return; }
    if (next.password) { pwRef.current?.focus(); return; }
    setBusy("email");
    try {
      if (isSignUp) {
        const s = await signUpEmail(email, password);
        if (s) { finish(); return; }
        /* Email confirmation is on: ask them to open the link, then sign in. */
        setSignedUpNotice(true); setMode("signin"); setPassword(""); setBusy(null);
        return;
      }
      await signInEmail(email, password); finish();
    } catch (err) { fail(err); }
  };

  const switchMode = (m: "signin" | "signup") => {
    if (locked) return;
    setMode(m); setErrors({}); setFormError(""); setResetSent(false); setSignedUpNotice(false);
  };

  /* M-7: "Forgot password?" sends the reset email for the address typed above. The answer is the same whether or not
     an account exists, so the form cannot be used to find out who has one. */
  const forgot = async () => {
    if (locked) return;
    setFormError(""); setResetSent(false);
    if (!email.trim() || !isEmail(email)) {
      setErrors({ email: "Enter your email address above, then choose “Forgot password?”." });
      emailRef.current?.focus();
      return;
    }
    setErrors({}); setResetting(true);
    try { await requestPasswordReset(email); setResetSent(true); } catch (e) { fail(e); }
    setResetting(false);
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
        <div className="lb-foot">Schedy Admin</div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div className="lc-brand">
            <span className="lb-mark"><img src={schedyMark} alt="" /></span>
            Schedy Admin
          </div>
          <h1>{isSignUp ? "Create your account" : "Welcome back"}</h1>
          <p className="lc-sub">{isSignUp ? "Sign up with the email your invitation was set up with to view and update it." : "Sign in to manage your invitations."}</p>

          {loggedOut && !session && (
            <p className="lc-note" role="status"><Check size={16} /> You’ve been logged out.</p>
          )}

          {recovering ? (
            <NewPasswordForm onDone={() => { setRecovering(false); finish(); }} onCancel={() => setRecovering(false)} />
          ) : (
            <>
          <button type="button" className={`lc-btn lc-google${busy === "google" ? " is-busy" : ""}`} onClick={google} disabled={locked} aria-busy={busy === "google"}>
            {busy === "google" ? <Loader2 className="spin" size={18} /> : <Google size={18} />}
            {busy === "google" ? "Signing in…" : "Continue with Google"}
          </button>

          <div className="lc-or" role="separator"><span>{isSignUp ? "or sign up with email" : "or sign in with email"}</span></div>

          <form className="lc-form" onSubmit={submit} noValidate>
            <div className="lc-field">
              <label className="lc-label" htmlFor="login-email">Email</label>
              <div className={`lc-input${errors.email ? " bad" : ""}`}>
                <Mail size={18} />
                <input
                  ref={emailRef} id="login-email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
                  value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: undefined })); }}
                  disabled={locked} aria-invalid={!!errors.email} aria-describedby={errors.email ? "login-email-err" : undefined}
                />
              </div>
              {errors.email && <p className="lc-err" id="login-email-err">{errors.email}</p>}
            </div>

            <div className="lc-field">
              <div className="lc-label">
                <label htmlFor="login-password">Password</label>
                {!isSignUp && <button type="button" className="lc-link" onClick={forgot} disabled={locked}>Forgot password?</button>}
              </div>
              <div className={`lc-input${errors.password ? " bad" : ""}`}>
                <Lock size={18} />
                <input
                  ref={pwRef} id="login-password" type={showPw ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} placeholder={isSignUp ? `At least ${MIN_PASSWORD} characters` : "Enter your password"}
                  value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((x) => ({ ...x, password: undefined })); }}
                  disabled={locked} aria-invalid={!!errors.password} aria-describedby={errors.password ? "login-password-err" : undefined}
                />
                <button type="button" className="lc-eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="lc-err" id="login-password-err">{errors.password}</p>}
            </div>

            {signedUpNotice && <p className="lc-hint" role="status">Account created. Check your inbox for a confirmation link, then sign in here.</p>}
            {resetSent && <p className="lc-hint" role="status">If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.</p>}
            {formError && <p className="lc-alert" role="alert"><AlertCircle size={16} /> {formError}</p>}

            <button type="submit" className={`lc-btn lc-submit${busy === "email" ? " is-busy" : ""}`} disabled={locked} aria-busy={busy === "email"}>
              {busy === "email" && <Loader2 className="spin" size={18} />}
              {busy === "email" ? (isSignUp ? "Creating account…" : "Signing in…") : (isSignUp ? "Create account" : "Sign in")}
            </button>
          </form>
          <p className="lc-switch">
            {isSignUp ? "Already have an account? " : "New here? "}
            <button type="button" className="lc-link" onClick={() => switchMode(isSignUp ? "signin" : "signup")} disabled={locked}>
              {isSignUp ? "Sign in" : "Create an account"}
            </button>
          </p>
            </>
          )}

        </div>
      </main>

      <style>{loginCss}</style>
    </div>
  );
}

/* M-7: shown after the person opens the link from the reset email. */
function NewPasswordForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (pw !== pw2) { setErr("The two passwords don’t match."); return; }
    setErr(""); setBusy(true);
    try { await setNewPassword(pw); onDone(); }
    catch (x) { setErr(x instanceof AuthError ? x.message : "Something went wrong. Please try again."); setBusy(false); }
  };

  return (
    <form className="lc-form" onSubmit={submit} noValidate>
      <p className="lc-hint" role="status">Choose a new password for your account (at least {MIN_PASSWORD} characters).</p>
      <div className="lc-field">
        <label className="lc-label" htmlFor="new-password">New password</label>
        <div className="lc-input"><Lock size={18} />
          <input id="new-password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} disabled={busy} />
        </div>
      </div>
      <div className="lc-field">
        <label className="lc-label" htmlFor="new-password-2">Repeat the new password</label>
        <div className="lc-input"><Lock size={18} />
          <input id="new-password-2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} disabled={busy} />
        </div>
      </div>
      {err && <p className="lc-alert" role="alert"><AlertCircle size={16} /> {err}</p>}
      <button type="submit" className={`lc-btn lc-submit${busy ? " is-busy" : ""}`} disabled={busy} aria-busy={busy}>
        {busy && <Loader2 className="spin" size={18} />}
        {busy ? "Saving…" : "Save new password"}
      </button>
      <button type="button" className="lc-link" onClick={onCancel} disabled={busy}>Back to sign in</button>
    </form>
  );
}
