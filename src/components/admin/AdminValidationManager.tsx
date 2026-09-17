import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  XCircle,
  Smartphone,
  FileType,
  HardDrive,
  Info,
} from "lucide-react";
import {
  type ApplicationValidationRules,
  DEFAULT_VALIDATION_RULES,
  saveValidationRules,
} from "@/lib/appSettings";
import { useAuthz } from "@/lib/permissions";

interface Props {
  initialRules: ApplicationValidationRules;
  onSaved?: () => void;
}

export function AdminValidationManager({ initialRules, onSaved }: Props) {
  const authz = useAuthz();
  const [form, setForm] = useState<ApplicationValidationRules>(initialRules);
  const [saving, setSaving] = useState(false);
  const [extensionsText, setExtensionsText] = useState(initialRules.allowedExtensions.join(", "));

  // Live test sandbox states
  const [testPhone, setTestPhone] = useState("9876543210");
  const [testFileSizeKb, setTestFileSizeKb] = useState(1500);

  useEffect(() => {
    setForm(initialRules);
    setExtensionsText(initialRules.allowedExtensions.join(", "));
  }, [initialRules]);

  const handleSave = async () => {
    if (!authz.isSuperAdmin) {
      toast.error("Permission denied: Only authorized Super Admins can configure validation rules.");
      return;
    }

    if (form.maxGeneralDocSizeKb < 50) {
      toast.error("General document max size must be at least 50 KB");
      return;
    }

    // Validate regex syntax
    try {
      new RegExp(form.mobileRegex);
    } catch {
      toast.error("Invalid regular expression syntax for mobile validation.");
      return;
    }

    const cleanExts = extensionsText
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0)
      .map((e) => (e.startsWith(".") ? e : `.${e}`));

    const updatedRules: ApplicationValidationRules = {
      ...form,
      allowedExtensions: cleanExts.length > 0 ? cleanExts : [".pdf", ".jpg", ".jpeg", ".png"],
    };

    setSaving(true);
    try {
      const res = await saveValidationRules(updatedRules, authz.role);
      if (res.success) {
        toast.success("Validation logic and file constraints updated & published live!");
        onSaved?.();
      } else {
        throw new Error(res.error || "Failed to save validation rules");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update validation rules");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset validation logic to official GP standard defaults?")) {
      setForm(DEFAULT_VALIDATION_RULES);
      setExtensionsText(DEFAULT_VALIDATION_RULES.allowedExtensions.join(", "));
      toast.info("Validation rules reset to defaults in editor. Click 'Save & Publish' to apply.");
    }
  };

  // Test regex helper
  let phoneTestValid = false;
  try {
    const rx = new RegExp(form.mobileRegex);
    phoneTestValid = rx.test(testPhone.trim());
  } catch {
    phoneTestValid = false;
  }

  const fileTestValid = testFileSizeKb <= form.maxGeneralDocSizeKb;

  return (
    <div className="space-y-6">
      {/* File Upload Constraints */}
      <section className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <HardDrive size={18} className="text-primary" />
          <div>
            <h2 className="text-sm font-bold text-foreground">📁 File Upload Constraints & Size Limits</h2>
            <p className="text-xs text-muted-foreground">
              Define strict file limits enforced across citizen document uploads to prevent server bottlenecks and maintain fast page loads.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="max-general" className="text-xs font-semibold">General Document Max Size</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="max-general"
                type="number"
                min={50}
                max={10240}
                value={form.maxGeneralDocSizeKb}
                onChange={(e) => setForm({ ...form, maxGeneralDocSizeKb: Number(e.target.value) })}
                className="font-mono text-xs"
              />
              <span className="text-xs text-muted-foreground font-medium">KB</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {(form.maxGeneralDocSizeKb / 1024).toFixed(1)} MB limit for Court Affidavits, RoR, Deeds.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="max-photo" className="text-xs font-semibold">Applicant Photo / ID Size</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="max-photo"
                type="number"
                min={20}
                max={1024}
                value={form.maxPhotoIdSizeKb}
                onChange={(e) => setForm({ ...form, maxPhotoIdSizeKb: Number(e.target.value) })}
                className="font-mono text-xs"
              />
              <span className="text-xs text-muted-foreground font-medium">KB</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Standard identity proof size (default: 100 KB).</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="max-birth" className="text-xs font-semibold">Manual Birth Scan Size</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="max-birth"
                type="number"
                min={20}
                max={2048}
                value={form.maxBirthCertScanSizeKb}
                onChange={(e) => setForm({ ...form, maxBirthCertScanSizeKb: Number(e.target.value) })}
                className="font-mono text-xs"
              />
              <span className="text-xs text-muted-foreground font-medium">KB</span>
            </div>
            <p className="text-[11px] text-muted-foreground">SBHI SOP Case-I manual cert limit (100 KB).</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="max-gd" className="text-xs font-semibold">Police GD Loss Report Size</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="max-gd"
                type="number"
                min={20}
                max={2048}
                value={form.maxPoliceGdSizeKb}
                onChange={(e) => setForm({ ...form, maxPoliceGdSizeKb: Number(e.target.value) })}
                className="font-mono text-xs"
              />
              <span className="text-xs text-muted-foreground font-medium">KB</span>
            </div>
            <p className="text-[11px] text-muted-foreground">FIR / GD scan document limit (200 KB).</p>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border/30">
          <Label htmlFor="allowed-exts" className="text-xs font-semibold">Permitted File Extensions (Comma Separated)</Label>
          <Input
            id="allowed-exts"
            value={extensionsText}
            onChange={(e) => setExtensionsText(e.target.value)}
            placeholder=".pdf, .jpg, .jpeg, .png"
            className="text-xs font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Enforced in HTML file inputs and upload drag-and-drop dropzones.
          </p>
        </div>
      </section>

      {/* Field Validation & Verification Rules */}
      <section className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-foreground">🔍 Field Validation Rules & Data Hygiene</h2>
            <p className="text-xs text-muted-foreground">
              Configure input restrictions, phone number pattern enforcement, and data normalization toggles.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="mobile-regex" className="text-xs font-semibold">Indian Mobile Regex Pattern</Label>
            <Input
              id="mobile-regex"
              value={form.mobileRegex}
              onChange={(e) => setForm({ ...form, mobileRegex: e.target.value })}
              placeholder="^[6-9]\d{9}$"
              className="text-xs font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Standard 10-digit mobile starting with 6, 7, 8, or 9: <code className="text-primary font-mono">^[6-9]\d&#123;9&#125;$</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="min-age" className="text-xs font-semibold">Minimum Applicant Age Requirement</Label>
            <div className="flex items-center gap-2">
              <Input
                id="min-age"
                type="number"
                min={14}
                max={30}
                value={form.minApplicantAge}
                onChange={(e) => setForm({ ...form, minApplicantAge: Number(e.target.value) })}
                className="w-24 text-xs font-mono"
              />
              <span className="text-xs text-muted-foreground">Years old (statutory adult age: 18)</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Minors must have their application submitted by a legal guardian.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Force Uppercase Names</p>
              <p className="text-[11px] text-muted-foreground">Auto-converts English names to uppercase</p>
            </div>
            <Switch
              checked={form.forceUppercaseNames}
              onCheckedChange={(val) => setForm({ ...form, forceUppercaseNames: val })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Strict GP Village Restriction</p>
              <p className="text-[11px] text-muted-foreground">Only allow approved Bagula-II villages</p>
            </div>
            <Switch
              checked={form.strictVillageOnly}
              onCheckedChange={(val) => setForm({ ...form, strictVillageOnly: val })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Mandatory Tax Receipt</p>
              <p className="text-[11px] text-muted-foreground">Requires GP tax clearance for Warish</p>
            </div>
            <Switch
              checked={form.requireTaxReceipt}
              onCheckedChange={(val) => setForm({ ...form, requireTaxReceipt: val })}
            />
          </div>
        </div>
      </section>

      {/* Live Validation Sandbox */}
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileCheck size={18} className="text-primary" />
          <div>
            <h2 className="text-sm font-bold text-foreground">🧪 Live Rule Sandbox Tester</h2>
            <p className="text-xs text-muted-foreground">
              Test your mobile number regex and file size limits against live inputs right now.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3 bg-white rounded-xl border border-border/40 space-y-2">
            <Label htmlFor="test-phone" className="text-xs font-medium flex items-center justify-between">
              <span>Test Citizen Mobile:</span>
              <span className={`text-[11px] font-bold flex items-center gap-1 ${phoneTestValid ? "text-emerald-600" : "text-destructive"}`}>
                {phoneTestValid ? <><CheckCircle2 size={12} /> Valid Pattern</> : <><XCircle size={12} /> Invalid Pattern</>}
              </span>
            </Label>
            <Input
              id="test-phone"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="text-xs font-mono"
            />
          </div>

          <div className="p-3 bg-white rounded-xl border border-border/40 space-y-2">
            <Label htmlFor="test-file-size" className="text-xs font-medium flex items-center justify-between">
              <span>Test Upload Size ({testFileSizeKb} KB):</span>
              <span className={`text-[11px] font-bold flex items-center gap-1 ${fileTestValid ? "text-emerald-600" : "text-destructive"}`}>
                {fileTestValid ? <><CheckCircle2 size={12} /> Size Accepted</> : <><XCircle size={12} /> Size Exceeded ({testFileSizeKb} &gt; {form.maxGeneralDocSizeKb} KB)</>}
              </span>
            </Label>
            <Input
              id="test-file-size"
              type="number"
              value={testFileSizeKb}
              onChange={(e) => setTestFileSizeKb(Number(e.target.value))}
              className="text-xs font-mono"
            />
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={saving} className="text-xs">
          <RotateCcw size={14} className="mr-1.5" /> Reset to GP Standard Defaults
        </Button>

        <Button size="sm" onClick={handleSave} disabled={saving} className="px-5">
          <Save size={14} className="mr-1.5" /> {saving ? "Saving…" : "Save & Publish Validation Rules"}
        </Button>
      </div>
    </div>
  );
}
