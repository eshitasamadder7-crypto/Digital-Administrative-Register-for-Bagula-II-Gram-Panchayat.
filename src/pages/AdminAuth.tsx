import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Home, Eye, EyeOff, Mail, KeyRound, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_EMAILS } from "@/components/RequireAdmin";
import { type OfficeRole } from "@/lib/permissions";
import {
  verifyTempAdminLogin,
  establishTempAdminSession,
  TEMP_ADMIN_EMAIL,
  SUPER_ADMIN_CRED_EMAILS,
} from "@/lib/tempAdminCredentials";
import { setLastRedirectReason, writeAdminAuthDebug } from "@/lib/adminAuthDebug";
import { validateAdminRedirect } from "@/lib/redirectValidator";
import {
  ADMIN_LOGOUT_REASON_KEY,
  ADMIN_DISCLAIMER_KEY,
  ADMIN_INACTIVITY_DISCLAIMER,
} from "@/components/AdminIdleTimer";
import { recordAuthIncident } from "@/lib/systemStatusService";

// Parse OAuth tokens delivered in the URL hash (full-page redirect flow).
async function consumeHashTokens(): Promise<boolean> {
  if (typeof window === "undefined" || !window.location.hash) return false;
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);

  // Strictly reject email/magiclink URL tokens to enforce manual OTP entry
  const type = params.get("type");
  if (type === "email" || type === "magiclink" || type === "signup") {
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
    return false;
  }

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return false;
  try {
    await supabase.auth.setSession({ access_token, refresh_token });
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
    return true;
  } catch (error) {
    writeAdminAuthDebug({
      sessionState: "error",
      roleLookupResult: "not_checked",
      roleLookupMessage: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// Same-origin relative path preserved across sign-in (used by the OAuth consent flow).
function nextPath(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("next");
  return validateAdminRedirect(raw, window.location.origin);
}

type Method = "google" | "password" | "otp" | "session";

/**
 * Checks that the signed-in account is an office account and that the login
 * method it just used is permitted for that account.
 * Returns an error message, or null when the sign-in is accepted.
 */
async function validateOfficeSession(userId: string, email: string | null, method: Method): Promise<{ problem: string | null; role: OfficeRole | null }> {
  const normEmail = email?.trim().toLowerCase() ?? null;

  // Designated Super Admin is unconditionally authorized & synced to Supabase
  if (normEmail === "bagula2nogp111@gmail.com" || normEmail === "nitish374482@gmail.com") {
    supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "super_admin" } as any)
      .then(() => {});
    supabase
      .from("admin_profiles")
      .upsert({
        user_id: userId,
        email: normEmail,
        display_name: "Super Admin (Bagula-II GP)",
        status: "active",
        allowed_login_method: "all",
        service_scope: ["all"],
      } as any)
      .then(() => {});
    return { problem: null, role: "super_admin" };
  }

  // Active temporary session for designated Super Admins
  if (
    normEmail &&
    (SUPER_ADMIN_CRED_EMAILS.includes(normEmail) || normEmail === "nitish374482@gmail.com") &&
    sessionStorage.getItem("bagula2_temp_must_change_password") === "true"
  ) {
    return { problem: null, role: "super_admin" };
  }

  let [{ data: roles, error: rolesError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).in("role", ["deo", "admin", "super_admin", "monitoring_authority"]),
    supabase.from("admin_profiles").select("status, allowed_login_method, archived_at").eq("user_id", userId).maybeSingle(),
  ]);

  if (rolesError) return { problem: `Office role verification failed: ${rolesError.message}`, role: null };
  if (profileError) return { problem: `Office profile verification failed: ${profileError.message}`, role: null };

  const hasRole = (roles ?? []).length > 0;
  const bootstrappable = !!normEmail && (ADMIN_EMAILS.includes(normEmail) || SUPER_ADMIN_CRED_EMAILS.includes(normEmail));
  if (!hasRole && bootstrappable) {
    const { error: bootstrapError } = await supabase.rpc("bootstrap_admin_role");
    if (bootstrapError) return { problem: `Office role setup failed: ${bootstrapError.message}`, role: null };
    [{ data: roles, error: rolesError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).in("role", ["deo", "admin", "super_admin", "monitoring_authority"]),
      supabase.from("admin_profiles").select("status, allowed_login_method, archived_at").eq("user_id", userId).maybeSingle(),
    ]);
    if (rolesError) return { problem: `Office role verification failed: ${rolesError.message}`, role: null };
    if (profileError) return { problem: `Office profile verification failed: ${profileError.message}`, role: null };
  }
  if (!roles || roles.length === 0) {
    return { problem: "This account is not registered as an office user.", role: null };
  }
  if (!profile) {
    return { problem: "This office account has no active profile. Contact the Super Admin.", role: null };
  }

  if (profile?.status === "suspended") return { problem: "This office account is suspended. Contact the Super Admin.", role: null };
  if (profile.archived_at) return { problem: "This office account has been revoked. Contact the Super Admin.", role: null };

  const allowed = (profile as any)?.allowed_login_method ?? "both";
  if (allowed === "google" && method === "password")
    return { problem: "This account may only sign in with Google or OTP to Mail.", role: null };
  if (allowed === "password" && method === "google")
    return { problem: "This account may only sign in with email and password or OTP to Mail.", role: null };

  // Strict role resolution
  let role: OfficeRole = "deo";
  if (normEmail === "bagula2nogp111@gmail.com" || normEmail === "nitish374482@gmail.com") {
    role = "super_admin";
  } else if (normEmail === "nitush6488@gmail.com") {
    role = "admin";
  } else if (normEmail === "nitush8343980898@gmail.com") {
    role = "deo";
  } else {
    const roleList = (roles ?? []).map((r) => r.role);
    if (roleList.includes("super_admin")) role = "super_admin";
    else if (roleList.includes("admin")) role = "admin";
    else if (roleList.includes("monitoring_authority")) role = "monitoring_authority";
    else role = "deo";
  }

  return { problem: null, role };
}

export default function AdminAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  // OTP to mail states
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const MAX_OTP_ATTEMPTS = 5;

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const interval = setInterval(() => {
      setOtpCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCountdown]);

  useEffect(() => {
    // Check if redirected due to idle timeout
    const isIdleTimeout =
      searchParams.get("reason") === "idle_timeout" ||
      sessionStorage.getItem(ADMIN_LOGOUT_REASON_KEY) === "idle_timeout";

    if (isIdleTimeout) {
      const customDisclaimer =
        sessionStorage.getItem(ADMIN_DISCLAIMER_KEY) || ADMIN_INACTIVITY_DISCLAIMER;
      setDisclaimer(customDisclaimer);
      // Clear flag from sessionStorage so subsequent clean visits don't show it
      sessionStorage.removeItem(ADMIN_LOGOUT_REASON_KEY);
      sessionStorage.removeItem(ADMIN_DISCLAIMER_KEY);
    }
  }, [searchParams]);

  const goOn = (detectedRole?: OfficeRole | null) => {
    const target = nextPath();
    if (target) {
      if (detectedRole === "deo" && (
        target.includes("/admin/manage") ||
        target.includes("/admin/master-data") ||
        target.includes("/admin/deo-quotas") ||
        target.includes("/admin/employees") ||
        target.includes("/admin/dashboard")
      )) {
        navigate("/admin/deo", { replace: true });
        return;
      }
      window.location.replace(target);
      return;
    }

    if (detectedRole === "deo") {
      navigate("/admin/deo", { replace: true });
    } else {
      navigate("/admin/dashboard", { replace: true });
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const restoredFromOAuth = await consumeHashTokens();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!active) return;

      if (session) {
        const mail = session.user.email?.trim().toLowerCase() ?? null;
        const { problem, role } = await validateOfficeSession(session.user.id, mail, restoredFromOAuth ? "google" : "session");
        if (!active) return;
        if (!problem) {
          writeAdminAuthDebug({
            sessionState: "present",
            userId: session.user.id,
            email: mail,
            roleLookupResult: "found",
            roleLookupMessage: `Office session found on login page; redirecting as ${role}.`,
            lastRedirectReason: null,
          });
          goOn(role);
          return;
        }
        await supabase.auth.signOut();
        setLastRedirectReason(problem);
        toast.error(problem);
      }
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const signInWithGoogle = async () => {
    setBusy(true);
    try {
      const redirectUri =
        window.location.origin +
        "/admin" +
        (nextPath() ? `?next=${encodeURIComponent(nextPath()!)}` : "");

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        // Fallback to native supabase OAuth if Lovable client encountered an issue
        const { error: sbError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUri,
            queryParams: { prompt: "select_account" },
          },
        });
        if (sbError) throw sbError;
        return;
      }
      if (result.redirected) return; // Browser is leaving the page
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sign-in did not complete.");
      const user = data.session.user;
      const mail = user.email?.trim().toLowerCase() ?? null;
      const { problem, role } = await validateOfficeSession(user.id, mail, "google");
      if (problem) {
        await supabase.auth.signOut();
        toast.error(problem);
        return;
      }
      goOn(role);
    } catch (err: any) {
      toast.error(err?.message ?? "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      const normEmail = email.trim().toLowerCase();

      // Check temporary credentials for designated Super Admins
      if (SUPER_ADMIN_CRED_EMAILS.includes(normEmail)) {
        const tempResult = verifyTempAdminLogin(normEmail, password);
        if (tempResult.success) {
          establishTempAdminSession(normEmail);
          setPassword("");
          toast.success(
            tempResult.isTemp
              ? "Signed in with temporary password. Please update your password immediately."
              : "Signed in successfully."
          );
          goOn("super_admin");
          return;
        } else if (tempResult.error && tempResult.isTemp) {
          throw new Error(tempResult.error);
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normEmail,
        password,
      });
      if (error) {
        recordAuthIncident({
          action_type: "auth.signin_failed",
          actor_email: normEmail,
          reason: "Invalid email or password provided at admin portal",
          severity: "error",
        });
        throw new Error("Incorrect email or password.");
      }
      const user = data.user;
      if (!user) throw new Error("Sign-in did not return an authenticated user.");
      const mail = user.email?.trim().toLowerCase() ?? null;
      const { problem, role } = await validateOfficeSession(user.id, mail, "password");
      if (problem) {
        recordAuthIncident({
          action_type: "auth.unauthorized_access",
          actor_email: mail,
          reason: problem,
          severity: "warning",
        });
        await supabase.auth.signOut();
        toast.error(problem);
        return;
      }
      recordAuthIncident({
        action_type: "auth.signin_success",
        actor_email: mail,
        reason: `Admin user signed in with ${role} privileges`,
        severity: "info",
      });
      setPassword("");
      goOn(role);
    } catch (err: any) {
      toast.error(err?.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = (otpEmail || email).trim().toLowerCase();
    if (!targetEmail) {
      toast.error("Please enter your official email address.");
      return;
    }
    setBusy(true);
    try {
      const isDesignatedAdmin =
        SUPER_ADMIN_CRED_EMAILS.includes(targetEmail) ||
        ADMIN_EMAILS.includes(targetEmail);

      // Strict OTP sending: NO emailRedirectTo parameter ensures purely numeric OTP is dispatched
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: isDesignatedAdmin,
        },
      });
      if (error) {
        throw error;
      }
      setOtpSent(true);
      setOtpCode("");
      setOtpAttempts(0);
      setOtpCountdown(60);
      toast.success(`One-Time Code (OTP) sent to ${targetEmail}`);
      recordAuthIncident({
        action_type: "auth.otp_requested",
        actor_email: targetEmail,
        reason: "Admin OTP requested for office authentication",
        severity: "info",
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to send OTP. Please verify email address.");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtpCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (otpEmail || email).trim().toLowerCase();
    const code = otpCode.trim();

    if (otpAttempts >= MAX_OTP_ATTEMPTS) {
      toast.error("Maximum verification attempts reached. Please request a new OTP.");
      return;
    }

    if (!code || code.length < 6) {
      toast.error("Please enter the 6-digit OTP code sent to your email.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: code,
        type: "email",
      });
      if (error) {
        const nextAttempts = otpAttempts + 1;
        setOtpAttempts(nextAttempts);
        recordAuthIncident({
          action_type: "auth.otp_failed",
          actor_email: targetEmail,
          reason: `OTP verification failed: ${error.message} (attempt ${nextAttempts}/${MAX_OTP_ATTEMPTS})`,
          severity: "warning",
        });
        if (nextAttempts >= MAX_OTP_ATTEMPTS) {
          throw new Error("Too many invalid attempts. For security, please request a new OTP code.");
        }
        throw new Error(error.message.includes("expired") ? "The OTP code has expired. Please request a new one." : `Invalid OTP code. (${MAX_OTP_ATTEMPTS - nextAttempts} attempts remaining)`);
      }
      const user = data.user;
      if (!user) throw new Error("Verification succeeded but no authenticated user returned.");
      const mail = user.email?.trim().toLowerCase() ?? targetEmail;
      const { problem, role } = await validateOfficeSession(user.id, mail, "otp");
      if (problem) {
        recordAuthIncident({
          action_type: "auth.unauthorized_access",
          actor_email: mail,
          reason: problem,
          severity: "warning",
        });
        await supabase.auth.signOut();
        toast.error(problem);
        return;
      }
      recordAuthIncident({
        action_type: "auth.signin_success",
        actor_email: mail,
        reason: `Admin user signed in via Email OTP with ${role} privileges`,
        severity: "info",
      });
      toast.success("Office authentication verified successfully!");
      goOn(role);
    } catch (err: any) {
      toast.error(err?.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-sm mb-3 flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs bg-white/80 backdrop-blur-sm shadow-xs hover:bg-white gap-1.5 font-medium">
          <Link to="/">
            <Home size={14} className="text-primary" />
            <span>Main Site</span>
          </Link>
        </Button>
        <span className="text-[11px] text-muted-foreground font-medium">Bagula II Gram Panchayat</span>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm shadow-md p-6 space-y-5">
        <div className="text-center">
          <h1 className="text-lg font-bold">Office Sign In</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Google account, email password, or OTP to mail are allowed for office login.
          </p>
        </div>

        {disclaimer && (
          <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-xs font-bold text-amber-800 dark:text-amber-300">
              Security Compliance Disclaimer
            </AlertTitle>
            <AlertDescription className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90 mt-1">
              {disclaimer}
            </AlertDescription>
          </Alert>
        )}

        {/* 1. Google OAuth Sign In */}
        <Button onClick={signInWithGoogle} disabled={busy} className="w-full gap-2 font-medium">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8L6.2 33C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z"/>
          </svg>
          {busy ? "Please wait..." : "Sign in with Google"}
        </Button>

        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          <span className="h-px flex-1 bg-border/60" /> or choose login method <span className="h-px flex-1 bg-border/60" />
        </div>

        {/* 2. Method Tabs: Password vs OTP */}
        <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => setAuthMode("password")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              authMode === "password"
                ? "bg-white text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <KeyRound size={14} />
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("otp");
              if (!otpEmail && email) setOtpEmail(email);
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              authMode === "otp"
                ? "bg-white text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail size={14} />
            OTP to Mail
          </button>
        </div>

        {/* 3. Password Form */}
        {authMode === "password" && (
          <form onSubmit={signInWithPassword} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="office-email" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Official email
              </label>
              <Input
                id="office-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!otpEmail) setOtpEmail(e.target.value);
                }}
                placeholder="bagula2nogp111@gmail.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="office-password" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  id="office-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="default" className="w-full" disabled={busy || !email || !password}>
              {busy ? "Signing in..." : "Sign in with password"}
            </Button>
          </form>
        )}

        {/* 4. OTP to Mail Form */}
        {authMode === "otp" && (
          <div className="space-y-3">
            {!otpSent ? (
              <form onSubmit={sendOtp} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="otp-email" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Google account / Official email
                  </label>
                  <Input
                    id="otp-email"
                    type="email"
                    autoComplete="email"
                    value={otpEmail || email}
                    onChange={(e) => {
                      setOtpEmail(e.target.value);
                      setEmail(e.target.value);
                    }}
                    placeholder="bagula2nogp111@gmail.com"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground leading-tight pt-0.5">
                    A 6-digit one-time security code will be sent to this email.
                  </p>
                </div>
                <Button type="submit" variant="default" className="w-full gap-2" disabled={busy || !(otpEmail || email)}>
                  <Mail size={15} />
                  {busy ? "Sending Code..." : "Send OTP to Mail"}
                </Button>
              </form>
            ) : (
              <form onSubmit={verifyOtpCode} className="space-y-3">
                <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CheckCircle2 size={15} className="text-primary shrink-0" />
                    <div className="truncate">
                      <span className="text-muted-foreground block text-[10px]">OTP sent to:</span>
                      <span className="font-semibold text-foreground font-mono truncate block">
                        {otpEmail || email}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    className="text-[11px] text-primary hover:underline shrink-0 ml-2"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="otp-code" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      6-Digit One-Time Code
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      Attempts: {otpAttempts}/{MAX_OTP_ATTEMPTS}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    Enter the OTP sent to your email.
                  </p>
                  <Input
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    disabled={otpAttempts >= MAX_OTP_ATTEMPTS}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="text-center font-mono text-lg tracking-[0.35em] font-semibold"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="default"
                  className="w-full"
                  disabled={busy || otpCode.length < 6 || otpAttempts >= MAX_OTP_ATTEMPTS}
                >
                  {busy ? "Verifying OTP..." : "Verify OTP"}
                </Button>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="hover:text-foreground inline-flex items-center gap-1"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => sendOtp()}
                    disabled={busy || otpCountdown > 0}
                    className="text-primary hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1"
                  >
                    <RefreshCw size={11} className={busy ? "animate-spin" : ""} />
                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          Super Admin (<span className="font-mono text-[10px]">bagula2nogp111@gmail.com</span>) has full system authority.
          Office accounts are provisioned and managed by the Super Admin.
        </p>

        <div className="pt-2 text-center border-t border-border/40">
          <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5">
            <Link to="/">
              <Home size={13} /> Return to Main Public Site
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

