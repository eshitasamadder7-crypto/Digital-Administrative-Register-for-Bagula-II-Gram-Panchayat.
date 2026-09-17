import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  Building2,
  Users,
  Phone,
  Mail,
  AlertTriangle,
  Stamp,
  ShieldCheck,
} from "lucide-react";
import {
  type AdministrativeAuthoritySettings,
  DEFAULT_AUTHORITY_SETTINGS,
  saveAuthoritySettings,
} from "@/lib/appSettings";
import { useAuthz } from "@/lib/permissions";

interface Props {
  initialSettings: AdministrativeAuthoritySettings;
  onSaved?: () => void;
}

export function AdminAuthorityManager({ initialSettings, onSaved }: Props) {
  const authz = useAuthz();
  const [form, setForm] = useState<AdministrativeAuthoritySettings>(initialSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialSettings);
  }, [initialSettings]);

  const handleSave = async () => {
    if (!authz.isSuperAdmin) {
      toast.error("Permission denied: Only authorized Super Admins can configure administrative authority settings.");
      return;
    }

    if (!form.gramPanchayatName.trim()) {
      toast.error("Gram Panchayat name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const res = await saveAuthoritySettings(form, authz.role);
      if (res.success) {
        toast.success("Administrative authority and GP jurisdiction settings updated & published live!");
        onSaved?.();
      } else {
        throw new Error(res.error || "Failed to save authority settings");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update authority settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset administrative settings to official Bagula-II GP defaults?")) {
      setForm(DEFAULT_AUTHORITY_SETTINGS);
      toast.info("Authority settings reset to defaults in editor. Click 'Save & Publish' to apply.");
    }
  };

  return (
    <div className="space-y-6">
      {/* GP Office Jurisdiction */}
      <section className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-primary" />
          <div>
            <h2 className="text-sm font-bold text-foreground">🏛️ Gram Panchayat Jurisdiction & Legal Identity</h2>
            <p className="text-xs text-muted-foreground">
              Official naming used in certificate letterheads, watermarks, application forms, and receipts.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="gp-name" className="text-xs font-semibold">Gram Panchayat Name</Label>
            <Input
              id="gp-name"
              value={form.gramPanchayatName}
              onChange={(e) => setForm({ ...form, gramPanchayatName: e.target.value })}
              className="text-xs font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="block-name" className="text-xs font-semibold">Development Block</Label>
            <Input
              id="block-name"
              value={form.blockName}
              onChange={(e) => setForm({ ...form, blockName: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="district-name" className="text-xs font-semibold">District</Label>
            <Input
              id="district-name"
              value={form.districtName}
              onChange={(e) => setForm({ ...form, districtName: e.target.value })}
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-border/30">
          <div className="space-y-1.5">
            <Label htmlFor="ps-name" className="text-xs font-semibold">Police Station (P.S.)</Label>
            <Input
              id="ps-name"
              value={form.policeStationName}
              onChange={(e) => setForm({ ...form, policeStationName: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pin-code" className="text-xs font-semibold">Postal PIN Code</Label>
            <Input
              id="pin-code"
              value={form.pinCode}
              onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="state-name" className="text-xs font-semibold">State</Label>
            <Input
              id="state-name"
              value={form.stateName}
              onChange={(e) => setForm({ ...form, stateName: e.target.value })}
              className="text-xs"
            />
          </div>
        </div>
      </section>

      {/* Official Signatories & Authorities */}
      <section className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-foreground">✍️ Issuing Authorities & Key Signatories</h2>
            <p className="text-xs text-muted-foreground">
              Configure current designated office bearers appearing on digital and physical verification stamps.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="pradhan-name" className="text-xs font-semibold">GP Pradhan / Sub-Registrar</Label>
            <Input
              id="pradhan-name"
              value={form.pradhanName}
              onChange={(e) => setForm({ ...form, pradhanName: e.target.value })}
              placeholder="e.g. SUSMITA BISWAS BARMAN"
              className="text-xs font-bold"
            />
            <p className="text-[11px] text-muted-foreground">Primary Issuing Authority under Section 12/17 RBD Act.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ea-name" className="text-xs font-semibold">Executive Assistant (EA)</Label>
            <Input
              id="ea-name"
              value={form.executiveAssistantName}
              onChange={(e) => setForm({ ...form, executiveAssistantName: e.target.value })}
              placeholder="Executive Assistant, Bagula-II GP"
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">Primary administrative reviewer for certificates.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sec-name" className="text-xs font-semibold">GP Secretary</Label>
            <Input
              id="sec-name"
              value={form.secretaryName}
              onChange={(e) => setForm({ ...form, secretaryName: e.target.value })}
              placeholder="Secretary, Bagula-II GP"
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">Keeper of records and volume registers.</p>
          </div>
        </div>
      </section>

      {/* Citizen Helplines & Contact Details */}
      <section className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Phone size={18} className="text-amber-600" />
          <div>
            <h2 className="text-sm font-bold text-foreground">📞 Citizen Contact, Helpline & Digital Seals</h2>
            <p className="text-xs text-muted-foreground">
              Official public helpline phone and email rendered in portal footer and acknowledgement slips.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="helpline-phone" className="text-xs font-semibold">Helpline Telephone / Mobile</Label>
            <Input
              id="helpline-phone"
              value={form.helplinePhone}
              onChange={(e) => setForm({ ...form, helplinePhone: e.target.value })}
              placeholder="+91 3473 272 202"
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-email" className="text-xs font-semibold">Official Contact Email</Label>
            <Input
              id="contact-email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              placeholder="bagula2nogp111@gmail.com"
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Official Seal Stamp Watermark</p>
              <p className="text-[11px] text-muted-foreground">Renders GP official seal watermark on PDF drafts</p>
            </div>
            <Switch
              checked={form.officialStampWatermark}
              onCheckedChange={(val) => setForm({ ...form, officialStampWatermark: val })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Digital Signature Visual Box</p>
              <p className="text-[11px] text-muted-foreground">Renders QR-verified signature panel on certificates</p>
            </div>
            <Switch
              checked={form.digitalSignaturesEnabled}
              onCheckedChange={(val) => setForm({ ...form, digitalSignaturesEnabled: val })}
            />
          </div>
        </div>
      </section>

      {/* Emergency Announcement Banner */}
      <section className="rounded-2xl border border-amber-300 bg-amber-50/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-700" />
            <div>
              <h2 className="text-sm font-bold text-amber-950">📢 Portal Emergency Notice & Citizen Announcement Banner</h2>
              <p className="text-xs text-amber-800">
                Display an authoritative announcement bar across the top of every public portal page.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="emergency-toggle" className="text-xs font-bold text-amber-900 cursor-pointer">
              {form.emergencyNoticeEnabled ? "Banner ACTIVE" : "Banner INACTIVE"}
            </Label>
            <Switch
              id="emergency-toggle"
              checked={form.emergencyNoticeEnabled}
              onCheckedChange={(val) => setForm({ ...form, emergencyNoticeEnabled: val })}
            />
          </div>
        </div>

        {form.emergencyNoticeEnabled && (
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="notice-en" className="text-xs font-semibold text-amber-950">Notice Message (English)</Label>
              <Textarea
                id="notice-en"
                rows={2}
                value={form.emergencyNoticeTextEn}
                onChange={(e) => setForm({ ...form, emergencyNoticeTextEn: e.target.value })}
                placeholder="Important Notice: ..."
                className="text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notice-bn" className="text-xs font-semibold text-amber-950">Notice Message (বাংলা)</Label>
              <Textarea
                id="notice-bn"
                rows={2}
                value={form.emergencyNoticeTextBn}
                onChange={(e) => setForm({ ...form, emergencyNoticeTextBn: e.target.value })}
                placeholder="জরুরি বিজ্ঞপ্তি: ..."
                className="text-xs bg-white font-bengali"
              />
            </div>

            {/* Live Banner Preview */}
            <div className="p-3 bg-amber-600 text-white rounded-xl shadow-sm space-y-1 text-xs">
              <div className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-100">
                <AlertTriangle size={14} /> Live Public Banner Preview:
              </div>
              <p className="font-medium">{form.emergencyNoticeTextEn || "Notice in English..."}</p>
              {form.emergencyNoticeTextBn && (
                <p className="font-bengali text-amber-100 text-[11px] pt-0.5">{form.emergencyNoticeTextBn}</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={saving} className="text-xs">
          <RotateCcw size={14} className="mr-1.5" /> Reset to GP Standard Defaults
        </Button>

        <Button size="sm" onClick={handleSave} disabled={saving} className="px-5">
          <Save size={14} className="mr-1.5" /> {saving ? "Saving…" : "Save & Publish Authority Settings"}
        </Button>
      </div>
    </div>
  );
}
