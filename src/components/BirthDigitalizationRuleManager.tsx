import React, { useState, useEffect } from "react";
import {
  type BirthDigitalizationRule,
  DEFAULT_BIRTH_DIGITALIZATION_RULE,
  saveBirthDigitalizationRule,
} from "@/lib/birthDigitalizationRule";
import { useAuthz } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  SlidersHorizontal,
  Power,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface BirthDigitalizationRuleManagerProps {
  currentRule: BirthDigitalizationRule;
  onRuleUpdated?: (updated: BirthDigitalizationRule) => void;
  triggerButton?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BirthDigitalizationRuleManager({
  currentRule,
  onRuleUpdated,
  triggerButton,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: BirthDigitalizationRuleManagerProps) {
  const authz = useAuthz();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

  const [form, setForm] = useState<BirthDigitalizationRule>(currentRule);
  const [autoGenerateText, setAutoGenerateText] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(currentRule);
  }, [currentRule, isOpen]);

  // Handle auto-generation of description when values change
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
    toast.info("Reset to standard Panchayat policy (1st Tue & Wed, 300/mo, 100/day). Click Save to apply.");
  };

  const handleToggleActiveDirect = async (newActiveState: boolean) => {
    if (!authz.isSuperAdmin) {
      toast.error("Only Super Admin can deactivate or modify this rule.");
      return;
    }

    const updated: BirthDigitalizationRule = {
      ...form,
      isActive: newActiveState,
    };
    setForm(updated);

    setSaving(true);
    try {
      const res = await saveBirthDigitalizationRule(updated, authz.email);
      if (res.success) {
        toast.success(
          newActiveState
            ? "Birth Digitalization schedule ACTIVATED. Now accepting applications."
            : "Birth Digitalization schedule DEACTIVATED. Public intake is now paused."
        );
        onRuleUpdated?.(updated);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update state");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!authz.isSuperAdmin) {
      toast.error("Permission denied: Super Admin authorization required.");
      return;
    }

    if (!form.acceptedDays.trim()) {
      toast.error("Please enter accepted days / schedule.");
      return;
    }

    if (form.monthlyLimit <= 0 || form.dailyLimit <= 0) {
      toast.error("Limits must be greater than 0.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveBirthDigitalizationRule(form, authz.email);
      if (res.success) {
        toast.success("Birth Certificate Digitalization settings updated successfully!");
        onRuleUpdated?.(form);
        setIsOpen(false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error saving rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {triggerButton !== undefined ? (
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 border-primary/40 hover:bg-primary/5 text-xs font-semibold">
            <SlidersHorizontal size={13} className="text-primary" />
            <span>Modify / Deactivate (Super Admin)</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">📢</span>
              <DialogTitle className="text-lg font-bold text-foreground">
                Birth Certificate Digitalization Rule
              </DialogTitle>
            </div>
            <Badge variant="outline" className="border-red-500/40 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-semibold gap-1 text-[11px]">
              <ShieldCheck size={12} />
              Super Admin Authority
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure application acceptance schedule, monthly/daily quota caps, or temporarily deactivate intake.
          </DialogDescription>
        </DialogHeader>

        {/* Master Active/Deactive Banner */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            form.isActive
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
              : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Power size={16} className={form.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
                <span>Application Intake Status: {form.isActive ? "ACTIVE (Accepting)" : "DEACTIVATED (Paused)"}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {form.isActive
                  ? "Citizens and cyber cafes can see the schedule and submit pre-verification files."
                  : "Application intake is paused. Public notice informs citizens of the administrative hold."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => handleToggleActiveDirect(checked)}
                disabled={saving || !authz.isSuperAdmin}
                id="digitalization-active-switch"
              />
              <Label htmlFor="digitalization-active-switch" className="text-xs font-semibold cursor-pointer">
                {form.isActive ? "Active" : "Paused"}
              </Label>
            </div>
          </div>
        </div>

        {/* Modification Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Accepted Days */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Calendar size={13} className="text-primary" />
                  Accepted Days / Acceptance Schedule
                </Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => updateField("acceptedDays", "first Tuesday & Wednesday of every month")}
                    className="text-[10px] text-primary hover:underline"
                  >
                    1st Tue &amp; Wed
                  </button>
                  <span className="text-muted-foreground text-[10px]">·</span>
                  <button
                    type="button"
                    onClick={() => updateField("acceptedDays", "every Tuesday & Wednesday")}
                    className="text-[10px] text-primary hover:underline"
                  >
                    Every Tue &amp; Wed
                  </button>
                </div>
              </div>
              <Input
                value={form.acceptedDays}
                onChange={(e) => updateField("acceptedDays", e.target.value)}
                placeholder="e.g., first Tuesday & Wednesday of every month"
                className="text-xs"
                required
              />
            </div>

            {/* Monthly Limit */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Layers size={13} className="text-primary" />
                Monthly Application Cap
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={5000}
                  value={form.monthlyLimit}
                  onChange={(e) => updateField("monthlyLimit", parseInt(e.target.value, 10) || 0)}
                  className="text-xs"
                  required
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-muted-foreground">apps / month</span>
              </div>
            </div>

            {/* Daily Limit */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles size={13} className="text-primary" />
                Daily Application Limit
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={form.dailyLimit}
                  onChange={(e) => updateField("dailyLimit", parseInt(e.target.value, 10) || 0)}
                  className="text-xs"
                  required
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-muted-foreground">apps / day</span>
              </div>
            </div>

            {/* Public Schedule Description */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Notice Schedule Text (shown on Public Portal)
                </Label>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateText}
                    onChange={(e) => setAutoGenerateText(e.target.checked)}
                    className="rounded text-primary text-xs"
                  />
                  <span>Auto-compose from schedule &amp; limits</span>
                </label>
              </div>
              <Textarea
                rows={2}
                value={form.scheduleDescription}
                onChange={(e) => {
                  setAutoGenerateText(false);
                  updateField("scheduleDescription", e.target.value);
                }}
                placeholder="Applications accepted on..."
                className="text-xs leading-relaxed"
                required
              />
            </div>

            {/* Deactivation Notice (when paused) */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Deactivation Advisory Notice (shown when paused)
              </Label>
              <Textarea
                rows={2}
                value={form.deactivationNotice}
                onChange={(e) => updateField("deactivationNotice", e.target.value)}
                placeholder="Notice displayed when digitalization intake is paused..."
                className="text-xs leading-relaxed"
                required
              />
            </div>
          </div>

          {/* Live Preview Section */}
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Public Portal Live Preview
              </p>
              <Badge variant="outline" className="text-[10px]">
                {form.isActive ? "🟢 Active Preview" : "🟠 Paused Preview"}
              </Badge>
            </div>

            <div className="rounded-xl border p-4 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-xs space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{form.icon || "📢"}</span>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <h4 className="font-bold text-sm text-foreground">{form.title}</h4>
                    {form.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-medium">
                        Accepting Applications
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-medium">
                        Intake Paused
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {form.isActive ? form.scheduleDescription : form.deactivationNotice}
                  </p>
                  {form.isActive && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                        🗓️ {form.acceptedDays}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                        📊 Monthly Cap: {form.monthlyLimit}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                        ⚡ Daily Limit: {form.dailyLimit}/day
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToStandard}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw size={12} />
              Reset Standard Policy
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={saving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !authz.isSuperAdmin}
                className="text-xs font-semibold gap-1.5"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Save &amp; Apply Changes</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
