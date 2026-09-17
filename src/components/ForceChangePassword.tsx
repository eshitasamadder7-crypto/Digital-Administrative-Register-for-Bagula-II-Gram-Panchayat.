import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, Clock } from "lucide-react";
import { logActivity } from "@/lib/activityLog";
import { markTempPasswordConsumed, getRemainingTempMinutes } from "@/lib/tempAdminCredentials";
import { validatePassword, checkPasswordMatch } from "@/lib/passwordPolicy";
import { PasswordRequirementsIndicator } from "@/components/PasswordRequirementsIndicator";

/**
 * Shown after the first sign-in with a Super-Admin-issued temporary password.
 * The officer cannot reach any office page until the password is changed.
 */
export default function ForceChangePassword({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => void;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const validation = validatePassword(pw);
  const matchResult = checkPasswordMatch(pw, confirm);

  const problem = (): string | null => {
    if (!validation.isValid) return validation.errorMessage;
    if (!matchResult.matches) return "The two passwords do not match.";
    return null;
  };

  const isTempSession =
    sessionStorage.getItem("bagula2_temp_must_change_password") === "true";
  const remainingMins = isTempSession ? getRemainingTempMinutes() : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = problem();
    if (err) return toast.error(err);
    setBusy(true);
    try {
      if (isTempSession) {
        // Invalidate the temporary password immediately and set permanent password
        markTempPasswordConsumed(pw);
      }

      // Best effort update against Supabase Auth & admin_profiles
      try {
        await supabase.auth.updateUser({ password: pw });
      } catch (authErr) {
        console.warn("Supabase updateUser notice:", authErr);
      }

      try {
        await supabase
          .from("admin_profiles")
          .update({ must_change_password: false } as any)
          .eq("user_id", userId);
      } catch (profErr) {
        console.warn("admin_profiles update notice:", profErr);
      }

      try {
        await logActivity({
          action_type: "office.account.password_changed",
          target_table: "admin_profiles",
          target_id: userId,
          metadata: {
            action: "PASSWORD_CHANGED",
            target_user_id: userId,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (logErr) {
        console.warn("logActivity notice:", logErr);
      }

      toast.success("Password updated successfully");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Could not update the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm shadow-md p-6 space-y-4"
      >
        <div className="text-center">
          <KeyRound className="mx-auto mb-2" size={20} />
          <h1 className="text-lg font-bold">Change your temporary password</h1>
          <p className="text-xs text-muted-foreground mt-1">
            For security, you must set your own password before using the office portal.
          </p>
          {isTempSession && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Temporary credential window: ~{remainingMins} min remaining (30-min limit)</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <label htmlFor="new-pw" className="text-[10px] uppercase tracking-wide text-muted-foreground">
            New password
          </label>
          <div className="relative">
            <Input
              id="new-pw"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              className="pr-10"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="confirm-pw" className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Confirm new password
          </label>
          <div className="relative">
            <Input
              id="confirm-pw"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              className="pr-10"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <PasswordRequirementsIndicator
          password={pw}
          confirmPassword={confirm}
          showMatch={Boolean(pw || confirm)}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={busy || !validation.isValid || !matchResult.matches}
        >
          {busy ? "Saving…" : "Set password"}
        </Button>
        <button
          type="button"
          className="w-full text-[11px] underline text-muted-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
          }}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
