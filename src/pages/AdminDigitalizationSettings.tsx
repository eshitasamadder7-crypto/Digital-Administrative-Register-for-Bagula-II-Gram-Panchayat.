import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  type BirthDigitalizationRule,
  DEFAULT_BIRTH_DIGITALIZATION_RULE,
  saveBirthDigitalizationRule,
  useBirthDigitalizationRule,
} from "@/lib/birthDigitalizationRule";
import { useAuthz } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";
import {
  SlidersHorizontal,
  Power,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  Eye,
  Clock,
  History,
  Info,
} from "lucide-react";

export default function AdminDigitalizationSettings() {
  const authz = useAuthz();
  const { rule, loading } = useBirthDigitalizationRule();
  const [form, setForm] = useState<BirthDigitalizationRule>(rule);
  const [autoGenerateText, setAutoGenerateText] = useState(true);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setForm(rule);
  }, [rule]);

  const updateField = <K extends keyof BirthDigitalizationRule>(
    key: K,
    value: BirthDigitalizationRule[K]
  ) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (autoGenerateText && (key === "acceptedDays" || key === "monthlyLimit" || key === "dailyLimit")) {
        const days = key === "acceptedDays" ? (value as string) : next.acceptedDays;
        const monthly = key === "monthlyLimit" ? (value as number) : next.monthlyLimit;
        const daily = key === "dailyLimit" ? (value as number) : next.dailyLimit;
        next.scheduleDescription = `Applications accepted on the ${days} — up to ${monthly} applications, limit ${daily}/day.`;
      }
      return next;
    });
  };

  const handleResetToStandard = () => {
    setForm({
      ...DEFAULT_BIRTH_DIGITALIZATION_RULE,
      lastModifiedBy: authz.email || "Super Admin",
      lastModifiedAt: new Date().toISOString(),
    });
    setAutoGenerateText(true);
    toast.info("Form reset to standard policy (1st Tue & Wed, 300/mo, 100/day). Click 'Save Configuration' to persist.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authz.isSuperAdmin) {
      toast.error("Permission denied: Only Super Admin can modify or deactivate this rule.");
      return;
    }

    if (!form.acceptedDays.trim()) {
      toast.error("Please enter the accepted schedule days.");
      return;
    }

    if (form.monthlyLimit <= 0 || form.dailyLimit <= 0) {
      toast.error("Monthly and daily application limits must be greater than 0.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveBirthDigitalizationRule(form, authz.email);
      if (res.success) {
        toast.success("Birth Certificate Digitalization rule updated and published!");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error saving rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <BackButton fallbackUrl="/admin/dashboard" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  Birth Certificate Digitalization Rules
                </h1>
                <Badge variant="outline" className="border-red-500/40 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-semibold gap-1 text-[11px]">
                  <ShieldCheck size={12} />
                  Super Admin Control
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Set application intake days, monthly and daily quotas, or deactivate the application window.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link to="/">
                <Eye size={13} className="text-primary" />
                <span>View Public Site</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Status Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`p-4 rounded-xl border ${form.isActive ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
            <p className="text-[11px] font-medium text-muted-foreground">Intake Status</p>
            <div className="flex items-center gap-2 mt-1">
              <Power size={16} className={form.isActive ? "text-emerald-600" : "text-amber-600"} />
              <p className="font-bold text-sm text-foreground">
                {form.isActive ? "Active (Accepting)" : "Deactivated (Paused)"}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {form.isActive ? "Accepting applications on schedule" : "Applications currently on administrative hold"}
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-muted-foreground">Schedule Window</p>
            <div className="flex items-center gap-2 mt-1">
              <Calendar size={16} className="text-primary" />
              <p className="font-bold text-sm text-foreground truncate">
                {form.acceptedDays || "Not Set"}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Designated intake days
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-muted-foreground">Quota Capacities</p>
            <div className="flex items-center gap-2 mt-1">
              <Layers size={16} className="text-primary" />
              <p className="font-bold text-sm text-foreground">
                {form.monthlyLimit}/mo · {form.dailyLimit}/day
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Enforced application limits
            </p>
          </div>
        </div>

        {/* Main Configuration Card */}
        <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <SlidersHorizontal size={17} className="text-primary" />
                Schedule &amp; Quota Configuration
              </h2>
              <p className="text-xs text-muted-foreground">
                Changes take effect immediately on the public notice and citizen/cyber cafe portals.
              </p>
            </div>

            {/* Quick Toggle */}
            <div className="flex items-center gap-3 bg-muted/50 px-3 py-1.5 rounded-lg border">
              <span className="text-xs font-semibold">Active Status:</span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => updateField("isActive", checked)}
                disabled={saving || !authz.isSuperAdmin}
                id="main-active-switch"
              />
              <Label htmlFor="main-active-switch" className="text-xs font-bold cursor-pointer">
                {form.isActive ? (
                  <span className="text-emerald-600 dark:text-emerald-400">ACTIVE</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">DEACTIVATED</span>
                )}
              </Label>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Accepted Days */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" />
                  Accepted Days / Acceptance Schedule
                </Label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground text-[11px]">Presets:</span>
                  <button
                    type="button"
                    onClick={() => updateField("acceptedDays", "first Tuesday & Wednesday of every month")}
                    className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium"
                  >
                    1st Tue &amp; Wed of month
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("acceptedDays", "every Tuesday & Wednesday")}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground text-[11px]"
                  >
                    Every Tue &amp; Wed
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("acceptedDays", "first Monday to Friday of every month")}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground text-[11px]"
                  >
                    1st Week (Mon–Fri)
                  </button>
                </div>
              </div>
              <Input
                value={form.acceptedDays}
                onChange={(e) => updateField("acceptedDays", e.target.value)}
                placeholder="e.g. first Tuesday & Wednesday of every month"
                className="text-xs"
                required
              />
            </div>

            {/* Quota Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Layers size={14} className="text-primary" />
                  Monthly Application Cap (Monthly Quota)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={form.monthlyLimit}
                    onChange={(e) => updateField("monthlyLimit", parseInt(e.target.value, 10) || 0)}
                    className="text-xs"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] text-muted-foreground font-medium">
                    applications / month
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Standard Gram Panchayat cap: 300 applications</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary" />
                  Daily Application Limit (Daily Cap)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={2000}
                    value={form.dailyLimit}
                    onChange={(e) => updateField("dailyLimit", parseInt(e.target.value, 10) || 0)}
                    className="text-xs"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] text-muted-foreground font-medium">
                    applications / day
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Standard daily processing limit: 100/day</p>
              </div>
            </div>

            {/* Schedule Notice Text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Public Announcement Text (Active State)
                </Label>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateText}
                    onChange={(e) => setAutoGenerateText(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span>Auto-sync with above fields</span>
                </label>
              </div>
              <Textarea
                rows={2}
                value={form.scheduleDescription}
                onChange={(e) => {
                  setAutoGenerateText(false);
                  updateField("scheduleDescription", e.target.value);
                }}
                className="text-xs leading-relaxed"
                required
              />
            </div>

            {/* Deactivation Notice */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Deactivation Advisory Notice (Displayed when intake is paused)
              </Label>
              <Textarea
                rows={2}
                value={form.deactivationNotice}
                onChange={(e) => updateField("deactivationNotice", e.target.value)}
                className="text-xs leading-relaxed"
                required
              />
            </div>

            {/* Live Citizen Preview */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Live Public Site Preview
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {form.isActive ? "🟢 Active Notice Preview" : "🟠 Paused Advisory Preview"}
                </Badge>
              </div>

              <div className="rounded-xl border p-5 bg-white/70 dark:bg-card/70 backdrop-blur-sm shadow-sm space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">📢</span>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-semibold text-foreground text-sm">
                        {form.title}
                      </h3>
                      {form.isActive ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-semibold">
                          Accepting Applications
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-semibold">
                          Applications Paused
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {form.isActive ? form.scheduleDescription : form.deactivationNotice}
                    </p>
                    {form.isActive && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="px-2.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold">
                          🗓️ {form.acceptedDays}
                        </span>
                        <span className="px-2.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium">
                          📊 Up to {form.monthlyLimit} applications/month
                        </span>
                        <span className="px-2.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium">
                          ⚡ Limit {form.dailyLimit}/day
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToStandard}
                disabled={saving}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw size={13} />
                <span>Reset to Standard Policy</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={saving || !authz.isSuperAdmin}
                  className="gap-2 font-semibold text-xs"
                >
                  {saving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Save &amp; Apply Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Audit & Legal Reference */}
        <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Info size={14} className="text-primary" />
            <span>Administrative Framework &amp; Regulatory Note</span>
          </div>
          <p>
            Legacy Birth Certificate Digitization (Pre-2016) is governed under Section 12/17 of the Registration of Births and Deaths Act, 1969 and West Bengal SBHI SOP Case-I. The Gram Panchayat Sub-Registrar and Super Admin have full statutory discretion to schedule intake days and limit processing volumes to ensure rigorous ink-and-paper verification against physical Volume Registers.
          </p>
          {form.lastModifiedAt && (
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
              <Clock size={12} />
              <span>Last modified: {new Date(form.lastModifiedAt).toLocaleString("en-IN")} by {form.lastModifiedBy || "Super Admin"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
