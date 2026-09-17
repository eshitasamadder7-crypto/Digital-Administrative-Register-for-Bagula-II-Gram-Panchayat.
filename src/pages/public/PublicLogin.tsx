import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, EyeOff, Landmark, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { JURISDICTION } from "@/lib/masterData";
import { loginCitizen, validateCitizenSession } from "@/modules/citizen/citizenAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/hooks/use-toast";
import PublicShell, { comingSoon } from "./PublicShell";


export default function PublicLogin() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => {
    return sessionStorage.getItem("citizen_login_disclaimer_accepted") === "true";
  });

  const handleAgreeDisclaimer = () => {
    sessionStorage.setItem("citizen_login_disclaimer_accepted", "true");
    setDisclaimerAccepted(true);
  };

  const handleGoBack = () => {
    navigate("/");
  };

  const routeAuthenticatedUser = useCallback(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;
    if (userError || !user) throw new Error("Your session could not be verified. Please sign in again.");

    const [{ data: roles, error: rolesError }, { data: office, error: officeError }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("admin_profiles").select("status, archived_at").eq("user_id", user.id).maybeSingle(),
    ]);

    if (rolesError) throw new Error(`Office role verification failed: ${rolesError.message}`);
    if (officeError) throw new Error(`Office profile verification failed: ${officeError.message}`);

    const officeRole = (roles ?? []).some(({ role }) =>
      ["deo", "admin", "super_admin", "monitoring_authority"].includes(role),
    );
    if (officeRole && office?.status === "active" && !office.archived_at) {
      navigate("/admin", { replace: true });
      return;
    }

    await validateCitizenSession();
    navigate("/public/dashboard", { replace: true });
  }, [navigate]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (active) setChecking(false);
        return;
      }
      try {
        await routeAuthenticatedUser();
      } catch {
        await supabase.auth.signOut();
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [routeAuthenticatedUser]);

  const signInWithGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/public/login",
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      await routeAuthenticatedUser();
    } catch (err) {
      toast({
        title: "Google sign-in failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <PublicShell>
        <div className="min-h-[60vh] grid place-items-center text-sm text-muted-foreground">Checking session…</div>
      </PublicShell>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast({ title: "Please fill both fields", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await loginCitizen(identifier, password);
      navigate("/public/dashboard", { replace: true });
    } catch (err) {
      toast({
        title: "Sign in failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <Helmet>
        <title>Citizen Login — Bagula II Gram Panchayat</title>
        <meta name="description" content="Sign in to the Bagula II Gram Panchayat Public Citizen Portal to track applications and download certificates." />
        <link rel="canonical" href="https://deo-workflow-helper.lovable.app/public/login" />
        <meta property="og:title" content="Citizen Login — Bagula II Gram Panchayat" />
        <meta property="og:description" content="Sign in to the citizen portal to track your applications and download issued certificates." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://deo-workflow-helper.lovable.app/public/login" />
      </Helmet>

      {/* Mandatory Citizen Disclaimer Modal */}
      {!disclaimerAccepted && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="disclaimer-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border shadow-2xl rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-card-foreground">
            {/* Header */}
            <div className="bg-primary/10 border-b border-primary/20 px-5 py-4 flex items-center gap-3">
              <div className="p-2 bg-primary/20 text-primary rounded-lg shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h2 id="disclaimer-modal-title" className="font-bold text-base text-foreground flex items-center gap-2">
                  Mandatory Citizen Facilitation Disclaimer
                </h2>
                <p className="text-xs text-muted-foreground">
                  বাধ্যতামূলক নাগরিক সুবিধা পরিষেবা ঘোষণা ও নির্দেশাবলী
                </p>
              </div>
            </div>

            {/* Scrollable Body with exact verbatim text */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed divide-y divide-border/60">
              <div className="space-y-2 pb-3">
                <div className="flex items-center gap-1.5 font-semibold text-primary text-[11px] uppercase tracking-wider">
                  <Landmark className="h-3.5 w-3.5" />
                  Bagula II Gram Panchayat, Hanskhali Block, Nadia
                </div>
                <p className="text-foreground/90 font-medium leading-relaxed">
                  This portal is a facilitation service of Bagula II Gram Panchayat, Hanskhali Block, Nadia. Information submitted must be true and correct; submission of false information or forged documents may lead to rejection of the application and action under applicable law. Certificates issued through this portal remain subject to verification by the issuing authority and may be cancelled if obtained by suppression of facts. Downloaded copies are watermarked and are valid only when verification succeeds on the official verification page. The Gram Panchayat is not responsible for delays caused by incomplete documents, network failure, or incorrect contact details supplied by the applicant. Services listed here may be added, modified or withdrawn as per Panchayat policy and Government directions.
                </p>
              </div>

              <div className="pt-3 space-y-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                  বাংলা নির্দেশিকা (Official Bengali Notice)
                </div>
                <p className="text-foreground/90 leading-relaxed font-sans">
                  এই পোর্টালটি বগুলা ২ নং গ্রাম পঞ্চায়েত, হাঁসখালি ব্লক, নদীয়ার একটি অনলাইন নাগরিক সুবিধা পরিষেবা। জমাকৃত সমস্ত তথ্য সঠিক ও সত্য হওয়া আবশ্যক; মিথ্যা তথ্য বা জাল নথিপত্র দাখিল করলে আবেদন খারিজ হতে পারে এবং আইনানুগ ব্যবস্থা গ্রহণ করা হতে পারে। এই পোর্টালের মাধ্যমে প্রদত্ত শংসাপত্রগুলি প্রদানকারী কর্তৃপক্ষের যাচাইকরণের সাপেক্ষ এবং তথ্য গোপনের প্রমাণ মিললে তা বাতিলযোগ্য। ডাউনলোড করা অনুলিপিগুলি ওয়াটারমার্কযুক্ত এবং অফিসিয়াল যাচাইকরণ পৃষ্ঠায় সফল যাচাই হলেই তা বৈধ হিসেবে গণ্য হবে। অসম্পূর্ণ নথিপত্র, নেটওয়ার্কের ত্রুটি বা আবেদনকারীর দেওয়া ভুল যোগাযোগের তথ্যের কারণে বিলম্বের জন্য গ্রাম পঞ্চায়েত দায়ী থাকবে না। পঞ্চায়েতের নীতি ও সরকারি নির্দেশনা অনুযায়ী যেকোনো পরিষেবা সংযোজন, পরিবর্তন বা প্রত্যাহার করা হতে পারে।
                </p>
              </div>

              <div className="pt-3 text-[11px] text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  You must agree to this declaration before accessing citizen credentials, applications, or certificate repositories.
                </span>
              </div>
            </div>

            {/* Footer Actions: Agree and Proceed OR Go Back to Main Page */}
            <div className="bg-muted/40 border-t border-border px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoBack}
                className="w-full sm:w-auto gap-2 text-xs order-2 sm:order-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back to the Main Page / মূল পৃষ্ঠায় ফিরে যান
              </Button>

              <Button
                type="button"
                variant="default"
                onClick={handleAgreeDisclaimer}
                className="w-full sm:w-auto gap-2 text-xs font-semibold order-1 sm:order-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
              >
                <CheckCircle2 className="h-4 w-4" />
                Agree and Proceed / সম্মত হয়ে এগিয়ে যান
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-10 space-y-4">
        {/* Jurisdiction banner */}
        <div className="flex items-start gap-3 rounded-lg border bg-muted/50 px-3 py-2.5">
          <Landmark size={18} className="mt-0.5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{JURISDICTION.gramPanchayat}</span> · {JURISDICTION.block} Block · {JURISDICTION.district} · {JURISDICTION.state}
          </p>
        </div>

        <Card className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold">Citizen Login</h1>
            <p className="text-xs text-muted-foreground">
              নাগরিক লগইন — আপনার আবেদন দেখতে সাইন ইন করুন
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="citizen-login-username" className="text-xs">
                Mobile Number / Citizen ID / Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="citizen-login-username"
                name="username"
                autoComplete="username"
                placeholder="Mobile, Citizen ID or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                মোবাইল নম্বর, নাগরিক আইডি অথবা ইমেল দিন।
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="citizen-login-password" className="text-xs">
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="citizen-login-password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  className="pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy && <Loader2 size={16} className="mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full gap-2"
            disabled={busy}
            onClick={signInWithGoogle}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8L6.2 33C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center justify-between text-xs">
            <button type="button" className="text-primary underline" onClick={() => comingSoon("Password recovery")}>
              Forgot Password
            </button>
            <Link to="/public/register" className="text-primary underline">Create an account</Link>
          </div>

        </Card>

        <div className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5">
          <ShieldCheck size={18} className="mt-0.5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            Never share your password with anyone. Panchayat staff will never ask for it.
            <br />
            আপনার পাসওয়ার্ড কারও সঙ্গে শেয়ার করবেন না।
            <br />
            For your safety you are signed out after 3 minutes of inactivity.
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
