import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  type SuperAdminConfigurableControls,
  type PartyTheme,
  DEFAULT_SUPER_ADMIN_CONTROLS,
  getCachedSuperAdminControls,
  saveSuperAdminControls,
  applyPartyTheme,
} from "@/lib/appSettings";
import {
  type AuthenticationSettings,
  DEFAULT_AUTH_SETTINGS,
  loadAuthenticationSettings,
  saveAuthenticationSettings,
  validateAuthSettings,
} from "@/lib/authenticationSettings";
import { useAuthz } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";
import {
  SlidersHorizontal,
  Palette,
  Eye,
  EyeOff,
  Layout,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Layers,
  KeyRound,
  Mail,
  ShieldAlert,
} from "lucide-react";

export default function AdminPortalControls() {
  const authz = useAuthz();
  const [controls, setControls] = useState<SuperAdminConfigurableControls>(
    getCachedSuperAdminControls
  );
  const [authSettings, setAuthSettings] = useState<AuthenticationSettings>(
    DEFAULT_AUTH_SETTINGS
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setControls(getCachedSuperAdminControls());
    loadAuthenticationSettings().then((loaded) => {
      setAuthSettings(loaded);
    });
  }, []);

  const handleThemeChange = (theme: PartyTheme) => {
    setControls((prev) => {
      const next = { ...prev, partyTheme: theme };
      applyPartyTheme(theme);
      return next;
    });
  };

  const handleToggleCitizenPassword = (enabled: boolean) => {
    setAuthSettings((prev) => {
      const next = { ...prev, citizen_password_enabled: enabled };
      if (!enabled) {
        // Enforce dependency: Citizen Password OFF -> Forgot Password MUST be OFF
        next.citizen_forgot_password_enabled = false;
      }
      return next;
    });
  };

  const handleToggleCitizenForgotPassword = (enabled: boolean) => {
    if (enabled && !authSettings.citizen_password_enabled) {
      toast.error("Dependency Violation: Cannot enable Forgot Password while Citizen Password Authentication is disabled. Citizens authenticate via OTP.");
      return;
    }
    setAuthSettings((prev) => ({ ...prev, citizen_forgot_password_enabled: enabled }));
  };

  const handleToggleCitizenOtp = (enabled: boolean) => {
    if (!enabled && !authSettings.citizen_google_enabled && !authSettings.citizen_password_enabled) {
      toast.error("Invalid Configuration: At least one Citizen authentication method must remain active.");
      return;
    }
    setAuthSettings((prev) => ({ ...prev, citizen_email_otp_enabled: enabled }));
  };

  const handleToggleCitizenGoogle = (enabled: boolean) => {
    if (!enabled && !authSettings.citizen_email_otp_enabled && !authSettings.citizen_password_enabled) {
      toast.error("Invalid Configuration: At least one Citizen authentication method must remain active.");
      return;
    }
    setAuthSettings((prev) => ({ ...prev, citizen_google_enabled: enabled }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!authz.isSuperAdmin) {
      toast.error("Access Denied: Only Super Admin can modify portal controls.");
      return;
    }

    const validation = validateAuthSettings(authSettings);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid authentication settings");
      return;
    }

    setSaving(true);
    try {
      const [resControls, resAuth] = await Promise.all([
        saveSuperAdminControls(controls, authz.email),
        saveAuthenticationSettings(authSettings, authz.email),
      ]);

      if (resControls.success && resAuth.success) {
        toast.success("Super Admin controls & authentication policy published successfully!");
      } else {
        if (!resControls.success) toast.error(resControls.error || "Failed to save portal controls");
        if (!resAuth.success) toast.error(resAuth.error || "Failed to save authentication policy");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save portal controls");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setControls(DEFAULT_SUPER_ADMIN_CONTROLS);
    applyPartyTheme(DEFAULT_SUPER_ADMIN_CONTROLS.partyTheme);
    setAuthSettings(DEFAULT_AUTH_SETTINGS);
    toast.info("Reset to standard defaults. Click 'Save Changes' to persist.");
  };

  const partyThemes: { id: PartyTheme; name: string; color: string; desc: string; previewClass: string }[] = [
    {
      id: "default",
      name: "Default Official (WB Gov)",
      color: "#0f172a",
      desc: "Standard West Bengal G2C government theme with navy blue, emerald green, and gold accents.",
      previewClass: "bg-slate-900 border-slate-700 text-white",
    },
    {
      id: "bjp",
      name: "BJP Profile (Saffron / Amber)",
      color: "#f97316",
      desc: "Saffron and deep amber accents honoring Indian national heritage and traditional civic styling.",
      previewClass: "bg-amber-600 border-amber-500 text-white",
    },
    {
      id: "tmc",
      name: "TMC Profile (Emerald Green)",
      color: "#16a34a",
      desc: "Grassroots emerald green and white palette aligned with state panchayat and rural governance aesthetics.",
      previewClass: "bg-emerald-600 border-emerald-500 text-white",
    },
    {
      id: "cpim",
      name: "CPIM Profile (Crimson Red)",
      color: "#dc2626",
      desc: "Classic civic red and bold scarlet accents representing working-class and peasant solidarity.",
      previewClass: "bg-red-600 border-red-500 text-white",
    },
    {
      id: "congress",
      name: "Congress Profile (Royal Blue)",
      color: "#2563eb",
      desc: "Constitutional tricolor royal blue and crisp white palette for pan-Indian secular administration.",
      previewClass: "bg-blue-600 border-blue-500 text-white",
    },
  ];

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6">
      <Helmet>
        <title>Super Admin Configurable Controls — Bagula II GP</title>
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  Super Admin Governance
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
                <SlidersHorizontal className="h-6 w-6 text-primary" />
                Portal &amp; Form Configurable Controls
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage party color profiles, form layouts, field visibility, and citizen privacy phone controls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave()}
              disabled={saving}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow"
            >
              <CheckCircle2 className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* 1. Party Color Profiles */}
        <Card className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Palette className="h-4 w-4 text-primary" />
                <span>1. Party Color Profile Theme</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Customize the overarching visual accent palette across the entire application interface to match designated administrative guidelines.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {partyThemes.map((t) => {
              const isSelected = controls.partyTheme === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-border/80 hover:bg-muted/30"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="font-semibold text-xs text-foreground">{t.name}</span>
                      </div>
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {t.desc}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${t.previewClass}`}>
                      Live Accent
                    </span>
                    <span className="font-mono text-muted-foreground">{t.color}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 2. Form Size & Layout Spacing */}
        <Card className="p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Layout className="h-4 w-4 text-primary" />
              <span>2. Form Size &amp; Layout Density</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Adjust input padding, typography scaling, and vertical spacing throughout the Application Wizard and Citizen forms.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              {
                id: "standard" as const,
                title: "Standard Layout",
                desc: "Balanced spacing (16px base font, 1.5 line height, standard touch targets). Recommended for most devices.",
              },
              {
                id: "compact" as const,
                title: "Compact Layout (High Density)",
                desc: "Tightened form inputs and reduced padding for DEO high-volume typing and narrow displays.",
              },
              {
                id: "spacious" as const,
                title: "Spacious Layout (High Legibility)",
                desc: "Expanded touch targets and generous margins optimized for elderly citizens and mobile screens.",
              },
            ].map((layout) => {
              const isSelected = controls.formSizeLayout === layout.id;
              return (
                <div
                  key={layout.id}
                  onClick={() => setControls({ ...controls, formSizeLayout: layout.id })}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <div className="font-semibold text-xs text-foreground mb-1">{layout.title}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{layout.desc}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 3. Authentication Governance & Citizen Access Policy */}
        <Card className="p-6 space-y-4 border-l-4 border-l-primary">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>3. Authentication Governance &amp; Citizen Access Policy</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Authoritative Super Admin control over public citizen authentication methods and credential governance. Enforces strict dependency: Citizen Password must be active before Forgot Password can be enabled.
            </p>
          </div>

          <div className="space-y-4 pt-2 divide-y divide-border/60">
            {/* Email OTP Authentication */}
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs font-semibold text-foreground">
                    Citizen Email OTP Authentication (Default &amp; Recommended)
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Citizens authenticate by receiving a single-use 6-digit verification code sent to their registered email address. Eliminates static password vulnerabilities and forgot-password dead ends.
                </p>
              </div>
              <Switch
                checked={authSettings.citizen_email_otp_enabled}
                onCheckedChange={handleToggleCitizenOtp}
              />
            </div>

            {/* Google OAuth */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8L6.2 33C9.5 39.6 16.2 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z"/>
                  </svg>
                  <Label className="text-xs font-semibold text-foreground">
                    Citizen Google OAuth Sign-in
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Allow citizens with verified Google accounts to sign in directly without typing credentials or waiting for email codes.
                </p>
              </div>
              <Switch
                checked={authSettings.citizen_google_enabled}
                onCheckedChange={handleToggleCitizenGoogle}
              />
            </div>

            {/* Static Password Authentication */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs font-semibold text-foreground">
                    Citizen Static Password Authentication
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Allow citizens to log in with a citizen ID / mobile number and static password. (Disabled by default: OTP authentication is the standard citizen policy).
                </p>
              </div>
              <Switch
                checked={authSettings.citizen_password_enabled}
                onCheckedChange={handleToggleCitizenPassword}
              />
            </div>

            {/* Citizen Forgot Password Recovery (Dependent) */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className={`text-xs font-semibold ${!authSettings.citizen_password_enabled ? "text-muted-foreground" : "text-foreground"}`}>
                    Citizen Password Recovery ("Forgot Password" Flow)
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Controls whether "Forgot Password" links and recovery actions are exposed in the Citizen Login screen.
                  {!authSettings.citizen_password_enabled && (
                    <span className="block font-medium text-amber-600 mt-1">
                      ⚠️ Locked OFF: Citizen Password Authentication is disabled. Citizens authenticate truthfully via OTP; password recovery is not applicable.
                    </span>
                  )}
                </p>
              </div>
              <Switch
                checked={authSettings.citizen_forgot_password_enabled}
                disabled={!authSettings.citizen_password_enabled}
                onCheckedChange={handleToggleCitizenForgotPassword}
              />
            </div>
          </div>

          <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border/60 flex items-start gap-2.5 text-xs text-muted-foreground">
            <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Official Staff &amp; DEO Governance Notice:</span>{" "}
              DEO, Auditor, and Panchayat Staff accounts maintain dedicated official credentials and administrative session verification. Modifying citizen access policies does not compromise or alter official staff authentication routes.
            </div>
          </div>
        </Card>

        {/* 4. Phone Number & Privacy Visibility Controls */}
        <Card className="p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Smartphone className="h-4 w-4 text-primary" />
              <span>4. Phone Number &amp; Contact Visibility Controls</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Enforce citizen data protection standards under DPDP Rules by controlling where applicant mobile numbers are shown or masked.
            </p>
          </div>

          <div className="space-y-3 pt-2 divide-y divide-border/60">
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5 max-w-xl">
                <Label className="text-xs font-semibold text-foreground">
                  Display Phone Numbers on Printed / Downloaded Certificates
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When enabled, the applicant's contact mobile number is printed in the address header of the certificate. When disabled, the number is omitted or masked (e.g. 98320XXXXX).
                </p>
              </div>
              <Switch
                checked={controls.showPhoneNumbersOnCertificates}
                onCheckedChange={(v) => setControls({ ...controls, showPhoneNumbersOnCertificates: v })}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5 max-w-xl">
                <Label className="text-xs font-semibold text-foreground">
                  Show Full Mobile Number in Public QR Verification Page
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When disabled (recommended for privacy), anyone scanning the certificate's QR code sees only the last 4 digits (e.g. ******1234).
                </p>
              </div>
              <Switch
                checked={controls.showMobileInVerification}
                onCheckedChange={(v) => setControls({ ...controls, showMobileInVerification: v })}
              />
            </div>
          </div>
        </Card>

        {/* 5. Form Fields Enable / Disable Controls */}
        <Card className="p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span>5. Application Form Fields Configuration</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Enable or disable optional administrative data collection fields in the Citizen and DEO Application Wizard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 max-w-xs">
                <Label className="text-xs font-semibold text-foreground">Aadhaar Number Field</Label>
                <p className="text-[11px] text-muted-foreground">
                  Collect Aadhaar last 4 digits in applicant details step.
                </p>
              </div>
              <Switch
                checked={controls.enableAadhaarField}
                onCheckedChange={(v) => setControls({ ...controls, enableAadhaarField: v })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 max-w-xs">
                <Label className="text-xs font-semibold text-foreground">Voter EPIC Number Field</Label>
                <p className="text-[11px] text-muted-foreground">
                  Collect applicant Voter ID Card (EPIC) number.
                </p>
              </div>
              <Switch
                checked={controls.enableEpicField}
                onCheckedChange={(v) => setControls({ ...controls, enableEpicField: v })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 max-w-xs">
                <Label className="text-xs font-semibold text-foreground">Guardian / Relation Details</Label>
                <p className="text-[11px] text-muted-foreground">
                  Include Guardian Name and Relationship type (S/O, D/O, W/O).
                </p>
              </div>
              <Switch
                checked={controls.enableGuardianField}
                onCheckedChange={(v) => setControls({ ...controls, enableGuardianField: v })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 max-w-xs">
                <Label className="text-xs font-semibold text-foreground">Custom Address / Village Override</Label>
                <p className="text-[11px] text-muted-foreground">
                  Allow typing a manual village name if not in the master dropdown.
                </p>
              </div>
              <Switch
                checked={controls.enableCustomAddressField}
                onCheckedChange={(v) => setControls({ ...controls, enableCustomAddressField: v })}
              />
            </div>
          </div>
        </Card>

        {/* Bottom Save Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleReset} className="text-xs">
            Reset All Defaults
          </Button>
          <Button
            onClick={() => handleSave()}
            disabled={saving}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow font-semibold"
          >
            <CheckCircle2 className="h-4 w-4" />
            {saving ? "Publishing Changes..." : "Save & Apply Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
