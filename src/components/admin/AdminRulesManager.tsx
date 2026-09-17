import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, RotateCcw, Sliders, Clock, FileText, IndianRupee, ShieldAlert, CheckCircle2 } from "lucide-react";
import {
  type ApplicationWorkflowRules,
  DEFAULT_WORKFLOW_RULES,
  saveWorkflowRules,
  formatMemoPrefix,
} from "@/lib/appSettings";
import { useAuthz } from "@/lib/permissions";

interface Props {
  initialRules: ApplicationWorkflowRules;
  onSaved?: () => void;
}

export function AdminRulesManager({ initialRules, onSaved }: Props) {
  const authz = useAuthz();
  const [form, setForm] = useState<ApplicationWorkflowRules>(initialRules);
  const [saving, setSaving] = useState(false);
  const [previewYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setForm(initialRules);
  }, [initialRules]);

  const handleSave = async () => {
    if (!authz.isSuperAdmin) {
      toast.error("Permission denied: Only authorized Super Admins can configure application rules.");
      return;
    }

    if (form.minHeirs < 1) {
      toast.error("Minimum heirs must be at least 1");
      return;
    }
    if (form.maxHeirs < form.minHeirs) {
      toast.error("Maximum heirs cannot be less than minimum heirs");
      return;
    }

    setSaving(true);
    try {
      const res = await saveWorkflowRules(form, authz.role);
      if (res.success) {
        toast.success("Application rules and workflow settings updated & published live!");
        onSaved?.();
      } else {
        throw new Error(res.error || "Failed to save workflow rules");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update workflow rules");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset all workflow and application rules to standard Bagula-II GP official defaults?")) {
      setForm(DEFAULT_WORKFLOW_RULES);
      toast.info("Rules reset to official defaults in editor. Click 'Save & Publish Rules' to apply.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Certificate Numbering Scheme */}
      <section className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <div>
            <h2 className="text-sm font-bold text-foreground">📜 Certificate Memo Scheme & Serial Numbering</h2>
            <p className="text-xs text-muted-foreground">
              Define the official dispatch memo format for certificates. Use <code className="text-primary font-mono bg-primary/10 px-1 py-0.5 rounded">{"{YEAR}"}</code> as a dynamic token.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="warish-prefix" className="text-xs font-semibold">Warish Memo Prefix Format</Label>
            <Input
              id="warish-prefix"
              value={form.warishMemoPrefix}
              onChange={(e) => setForm({ ...form, warishMemoPrefix: e.target.value })}
              placeholder="/BGL-II/{YEAR}"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Preview: <strong className="text-foreground font-mono">{formatMemoPrefix(form.warishMemoPrefix, previewYear)}</strong> (e.g. 142{formatMemoPrefix(form.warishMemoPrefix, previewYear)})
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dependent-prefix" className="text-xs font-semibold">Dependent Memo Prefix Format</Label>
            <Input
              id="dependent-prefix"
              value={form.dependentMemoPrefix}
              onChange={(e) => setForm({ ...form, dependentMemoPrefix: e.target.value })}
              placeholder="/BGL-II/{YEAR}"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Preview: <strong className="text-foreground font-mono">{formatMemoPrefix(form.dependentMemoPrefix, previewYear)}</strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birth-prefix" className="text-xs font-semibold">Birth Digitization Ref Prefix</Label>
            <Input
              id="birth-prefix"
              value={form.birthDigitizationPrefix}
              onChange={(e) => setForm({ ...form, birthDigitizationPrefix: e.target.value })}
              placeholder="B2GP/BD/{YEAR}/"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Preview: <strong className="text-foreground font-mono">{formatMemoPrefix(form.birthDigitizationPrefix, previewYear)}001</strong>
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/30">
          <div className="space-y-1.5">
            <Label htmlFor="warish-val" className="text-xs font-semibold">Warish Certificate Statutory Validity</Label>
            <div className="flex items-center gap-2">
              <Input
                id="warish-val"
                type="number"
                min={0}
                value={form.warishValidityMonths}
                onChange={(e) => setForm({ ...form, warishValidityMonths: Number(e.target.value) })}
                className="w-28 text-xs font-mono"
              />
              <span className="text-xs text-muted-foreground">
                {form.warishValidityMonths === 0 ? "Months (0 = Lifetime Permanent Validity)" : "Months from issuance date"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dep-val" className="text-xs font-semibold">Dependent Certificate Validity</Label>
            <div className="flex items-center gap-2">
              <Input
                id="dep-val"
                type="number"
                min={1}
                value={form.dependentValidityMonths}
                onChange={(e) => setForm({ ...form, dependentValidityMonths: Number(e.target.value) })}
                className="w-28 text-xs font-mono"
              />
              <span className="text-xs text-muted-foreground">Months (standard railway/medical proof: 6 months)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Succession & Warish Workflow Rules */}
      <section className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Sliders size={18} className="text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-foreground">⚖️ Succession Rules & Heirs Verification Protocol</h2>
            <p className="text-xs text-muted-foreground">
              Define constraints on legal heir entries, affidavit requirements, and endorsement workflows.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="min-heirs" className="text-xs font-semibold">Minimum Successors / Heirs Count</Label>
            <Input
              id="min-heirs"
              type="number"
              min={1}
              max={10}
              value={form.minHeirs}
              onChange={(e) => setForm({ ...form, minHeirs: Number(e.target.value) })}
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">Standard legal minimum: 1 heir.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="max-heirs" className="text-xs font-semibold">Maximum Successors / Heirs Cap</Label>
            <Input
              id="max-heirs"
              type="number"
              min={1}
              max={100}
              value={form.maxHeirs}
              onChange={(e) => setForm({ ...form, maxHeirs: Number(e.target.value) })}
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">Upper cap per single succession certificate (default: 30).</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Require Death Certificate</p>
              <p className="text-[11px] text-muted-foreground">Mandatory digital CRS death certificate</p>
            </div>
            <Switch
              checked={form.requireDeathCertForWarish}
              onCheckedChange={(val) => setForm({ ...form, requireDeathCertForWarish: val })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Strict Court Affidavit</p>
              <p className="text-[11px] text-muted-foreground">Require 1st class magistrate affidavit</p>
            </div>
            <Switch
              checked={form.requireAffidavitForWarish}
              onCheckedChange={(val) => setForm({ ...form, requireAffidavitForWarish: val })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Ward Member Endorsement</p>
              <p className="text-[11px] text-muted-foreground">Elected representative inquiry check</p>
            </div>
            <Switch
              checked={form.requireWardMemberEndorsement}
              onCheckedChange={(val) => setForm({ ...form, requireWardMemberEndorsement: val })}
            />
          </div>
        </div>
      </section>

      {/* Service Intake & Working Hours */}
      <section className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-amber-600" />
          <div>
            <h2 className="text-sm font-bold text-foreground">⏰ Service Intake Controls & Public Limits</h2>
            <p className="text-xs text-muted-foreground">
              Pause or resume online submissions and control maximum pending requests per citizen mobile number.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Warish Intake Active</p>
              <p className="text-[11px] text-muted-foreground">Allow new Warish submissions</p>
            </div>
            <Switch
              checked={form.warishIntakeActive}
              onCheckedChange={(val) => setForm({ ...form, warishIntakeActive: val })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Dependent Intake Active</p>
              <p className="text-[11px] text-muted-foreground">Allow new Dependent submissions</p>
            </div>
            <Switch
              checked={form.dependentIntakeActive}
              onCheckedChange={(val) => setForm({ ...form, dependentIntakeActive: val })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="max-pending" className="text-xs font-semibold">Max Pending per Mobile</Label>
            <Input
              id="max-pending"
              type="number"
              min={1}
              max={10}
              value={form.maxPendingPerMobile}
              onChange={(e) => setForm({ ...form, maxPendingPerMobile: Number(e.target.value) })}
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">Mitigates automated / bulk spam.</p>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border/30">
          <Label htmlFor="working-hours" className="text-xs font-semibold">Office Working Hours / Submission Notice</Label>
          <Input
            id="working-hours"
            value={form.workingHoursDesc}
            onChange={(e) => setForm({ ...form, workingHoursDesc: e.target.value })}
            placeholder="Mon–Fri, 10:00 AM – 5:00 PM"
            className="text-xs"
          />
          <p className="text-[11px] text-muted-foreground">Displayed in the portal footer, helpline, and citizen guides.</p>
        </div>
      </section>

      {/* Statutory Fee Schedule */}
      <section className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <IndianRupee size={18} className="text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-foreground">💰 Statutory Fee Schedule & Service Surcharges</h2>
            <p className="text-xs text-muted-foreground">
              Official Gram Panchayat fees shown on citizen slips and application summary sheets (₹ 0 denotes standard free public service).
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label htmlFor="fee-warish" className="text-xs font-semibold">Warish Application Fee (₹)</Label>
            <Input
              id="fee-warish"
              type="number"
              min={0}
              value={form.warishFeeRupees}
              onChange={(e) => setForm({ ...form, warishFeeRupees: Number(e.target.value) })}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="fee-dep" className="text-xs font-semibold">Dependent Application Fee (₹)</Label>
            <Input
              id="fee-dep"
              type="number"
              min={0}
              value={form.dependentFeeRupees}
              onChange={(e) => setForm({ ...form, dependentFeeRupees: Number(e.target.value) })}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="fee-urgent" className="text-xs font-semibold">Urgent Surcharge (₹)</Label>
            <Input
              id="fee-urgent"
              type="number"
              min={0}
              value={form.urgentProcessingFeeRupees}
              onChange={(e) => setForm({ ...form, urgentProcessingFeeRupees: Number(e.target.value) })}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="fee-reprint" className="text-xs font-semibold">Duplicate Copy Fee (₹)</Label>
            <Input
              id="fee-reprint"
              type="number"
              min={0}
              value={form.reprintSearchFeeRupees}
              onChange={(e) => setForm({ ...form, reprintSearchFeeRupees: Number(e.target.value) })}
              className="text-xs font-mono"
            />
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={saving} className="text-xs">
          <RotateCcw size={14} className="mr-1.5" /> Reset to GP Official Defaults
        </Button>

        <Button size="sm" onClick={handleSave} disabled={saving} className="px-5">
          <Save size={14} className="mr-1.5" /> {saving ? "Saving…" : "Save & Publish Workflow Rules"}
        </Button>
      </div>
    </div>
  );
}
