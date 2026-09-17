import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Lock, Monitor, Eye, EyeOff } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { logActivity } from "@/lib/activityLog";
import { useCurrentOfficer } from "@/modules/office/useCurrentOfficer";
import { DESIGNATION_LABEL, SYSTEM_ROLE_LABEL } from "@/modules/office/permissions";
import { displayRoleLabel } from "@/modules/office/roleLabel";

const PREF_KEY = "office.profile.prefs";

interface Prefs {
  language: "en" | "bn";
  notifyReturned: boolean;
  notifyApproved: boolean;
  notifyNotices: boolean;
}

const defaultPrefs: Prefs = {
  language: "en",
  notifyReturned: true,
  notifyApproved: true,
  notifyNotices: true,
};

function loadPrefs(): Prefs {
  try {
    return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") };
  } catch {
    return defaultPrefs;
  }
}

export function isValidAdminPassword(pw: string) {
  if (pw.length < 8) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}

export default function AdminAccountSettings() {
  const officer = useCurrentOfficer();

  const [email, setEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mobile, setMobile] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentEmail(data.user.email ?? "");
        setEmail(data.user.email ?? "");
      }
      const { data: profile } = await supabase
        .from("admin_profiles")
        .select("display_name, mobile, employee_id, preferred_language, notification_prefs")
        .eq("user_id", data.user?.id ?? "")
        .maybeSingle();
      if (profile) {
        setDisplayName(profile.display_name ?? "");
        setMobile((profile as any).mobile ?? "");
        setEmployeeId((profile as any).employee_id ?? null);
        const np = (profile as any).notification_prefs ?? {};
        setPrefs((prev) => ({
          ...prev,
          language: ((profile as any).preferred_language ?? prev.language) as "en" | "bn",
          notifyReturned: np.returned ?? prev.notifyReturned,
          notifyApproved: np.issued ?? prev.notifyApproved,
          notifyNotices: np.notices ?? prev.notifyNotices,
        }));
      }
    })();
  }, []);

  const savePrefs = async (next: Prefs) => {
    setPrefs(next);
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase
        .from("admin_profiles")
        .update({
          preferred_language: next.language,
          notification_prefs: {
            returned: next.notifyReturned,
            issued: next.notifyApproved,
            notices: next.notifyNotices,
            system: true,
            in_app: true,
          },
        } as never)
        .eq("user_id", data.user.id);
    }
    toast.success("Preferences saved");
  };

  const saveProfile = async () => {
    if (mobile && !/^[6-9][0-9]{9}$/.test(mobile)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { error } = await supabase
        .from("admin_profiles")
        .update({ display_name: displayName, mobile: mobile || null } as any)
        .eq("user_id", data.user.id);
      if (error) throw error;
      await logActivity({
        action_type: "admin.profile.update",
        target_table: "admin_profiles",
        target_id: data.user.id,
        metadata: { display_name: displayName },
      });
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const changeEmail = async () => {
    if (!email || email === currentEmail) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      await logActivity({
        action_type: "admin.email.change_requested",
        metadata: { from: currentEmail, to: email },
      });
      toast.success("Confirmation email sent to the new address");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    if (!isValidAdminPassword(newPassword)) {
      toast.error(
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.",
      );
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await logActivity({ action_type: "admin.password.change" });
      setNewPassword("");
      toast.success("Password updated");
    } catch (e: any) {
      toast.error("Failed to update password. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(currentEmail, {
        redirectTo: `${window.location.origin}/admin`,
      });
      if (error) throw error;
      toast.success("Password reset email sent");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const backTo =
    officer.isDeo && !officer.isAdmin && !officer.isSuperAdmin ? "/admin/deo" : "/admin/dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton fallbackUrl={backTo} label="🏠 Dashboard" className="-ml-2 text-xs" />
        <h1 className="text-xl font-bold">⚙️ Profile Settings</h1>
        <p className="text-xs text-muted-foreground -mt-4">
          Available to every office role — DEO, Admin and Super Admin.
        </p>

        {/* 👤 My Profile */}
        <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold">👤 My Profile</h2>
          <p className="text-[11px] text-muted-foreground">
            🆔 Employee ID: <span className="font-mono font-medium">{employeeId ?? "—"}</span>
          </p>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="displayName">
              Display name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="mobile">
              📱 Mobile number
            </Label>
            <Input
              id="mobile"
              value={mobile}
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile"
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Designation
              </p>
              <p className="text-sm font-medium">
                {officer.designation ? DESIGNATION_LABEL[officer.designation] : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                System Role
              </p>
              <p className="text-sm font-medium">
                {officer.systemRole
                  ? SYSTEM_ROLE_LABEL[officer.systemRole]
                  : displayRoleLabel({
                      isSuperAdmin: officer.isSuperAdmin,
                      legacyLabel: officer.isDeo
                        ? "DEO"
                        : officer.isAdmin
                          ? "Admin"
                          : "Office User",
                    })}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Designation and System Role are managed by a Super Admin from Employee &amp; Role
            Management.
          </p>
          <Button size="sm" onClick={saveProfile} disabled={busy}>
            Save profile
          </Button>
        </section>

        {/* 📧 Email */}
        <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold">📧 Email address</h2>
          <p className="text-xs text-muted-foreground">Current: {currentEmail}</p>
          <Label className="text-xs sr-only" htmlFor="email">
            New email
          </Label>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          <Button size="sm" onClick={changeEmail} disabled={busy || email === currentEmail}>
            Send confirmation
          </Button>
        </section>

        {/* 🔑 Change Password */}
        <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold">🔑 Change password</h2>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="newPassword">
              New password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={changePassword} disabled={busy || !newPassword}>
              Update password
            </Button>
            <Button size="sm" variant="outline" onClick={sendReset} disabled={busy}>
              Email me a reset link
            </Button>
          </div>
        </section>

        {/* 🌐 Language */}
        <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold">🌐 Language</h2>
          <div className="flex gap-2">
            {(["en", "bn"] as const).map((lang) => (
              <Button
                key={lang}
                size="sm"
                variant={prefs.language === lang ? "default" : "outline"}
                onClick={() => savePrefs({ ...prefs, language: lang })}
              >
                {lang === "en" ? "English" : "বাংলা"}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            The Office Portal is currently in English. Your choice is remembered for upcoming
            bilingual screens.
          </p>
        </section>

        {/* 🔔 Notification Preferences */}
        <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold">🔔 Notification preferences</h2>
          {(
            [
              ["notifyReturned", "🔄 Applications returned for modification"],
              ["notifyApproved", "✅ Applications approved or issued"],
              ["notifyNotices", "📢 Office notices and announcements"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label className="text-xs font-normal" htmlFor={key}>
                {label}
              </Label>
              <Switch
                id={key}
                checked={prefs[key]}
                onCheckedChange={(v) => savePrefs({ ...prefs, [key]: v })}
              />
            </div>
          ))}
        </section>

        {/* Future sections */}
        <div className="grid sm:grid-cols-2 gap-4">
          <section className="rounded-2xl border border-dashed border-border/50 bg-muted/30 p-5 opacity-80">
            <div className="flex items-center gap-2">
              <Monitor size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground">🖥️ Active Sessions</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              See where you are signed in and sign out other devices. Coming soon.
            </p>
          </section>
          <section className="rounded-2xl border border-dashed border-border/50 bg-muted/30 p-5 opacity-80">
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground">🔒 Security</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Two-step verification and login alerts. Coming soon.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
