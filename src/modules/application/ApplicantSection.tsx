import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { JURISDICTION } from "@/lib/masterData";
import { MasterDataService, VillageWithPostOffices } from "@/lib/api/MasterDataService";
import { useEffect, useState, useMemo } from "react";
import type { ApplicantInfo } from "./types";

const RELATIONS = ["S/O", "D/O", "W/O", "C/O"];
const PREFIXES = ["Shri", "Smt.", "Md.", "Mst."];

interface Props {
  value: ApplicantInfo;
  onChange: (next: ApplicantInfo) => void;
  /** Hide contact fields when they were already captured in the duplicate step. */
  hideContact?: boolean;
}

/**
 * Reusable applicant block shared by Warish, Dependent and any future
 * certificate module. Village drives Post Office automatically.
 */
export default function ApplicantSection({ value, onChange, hideContact }: Props) {
  const [villages, setVillages] = useState<VillageWithPostOffices[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchVillages = () => {
      MasterDataService.getActiveVillagesWithPostOffices().then((data) => {
        if (active) {
          setVillages(data);
          setLoading(false);
        }
      });
    };

    fetchVillages();

    const handleUpdate = () => {
      MasterDataService.clearCache();
      fetchVillages();
    };

    window.addEventListener("bagula_master_data_updated", handleUpdate);
    return () => {
      active = false;
      window.removeEventListener("bagula_master_data_updated", handleUpdate);
    };
  }, []);

  const availableVillages = useMemo(() => villages.map(v => v.name), [villages]);

  const availablePostOffices = useMemo(() => {
    if (!value.village || value.village === "Other") return [];
    const selected = villages.find(v => v.name === value.village);
    if (!selected) return [];
    return selected.postOffices.map(po => po.name);
  }, [value.village, villages]);

  const set = (patch: Partial<ApplicantInfo>) => onChange({ ...value, ...patch });

  const onVillage = (v: string) => {
    const selected = villages.find(vil => vil.name === v);
    const autoPo = selected && selected.postOffices.length > 0 ? selected.postOffices[0].name : "";
    const po = v === "Other" ? "" : autoPo;
    set({
      village: v,
      villageManual: v === "Other" ? value.villageManual : "",
      postOffice: po || value.postOffice,
      block: JURISDICTION.block,
      policeStation: JURISDICTION.policeStation.replace(" P.S.", ""),
      district: JURISDICTION.district,
      pin: JURISDICTION.pin,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">👤 Applicant Information</h2>
        <p className="text-sm text-muted-foreground">
          Address fields follow the Gram Panchayat master data — Post Office fills in automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="ap-prefix">Prefix</Label>
          <Select value={value.prefix} onValueChange={(v) => set({ prefix: v })}>
            <SelectTrigger id="ap-prefix"><SelectValue /></SelectTrigger>
            <SelectContent>{PREFIXES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ap-name">Applicant Name <span className="text-destructive">*</span></Label>
          <Input id="ap-name" value={value.name} onChange={(e) => set({ name: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap-rel">Relationship</Label>
          <Select value={value.relationType} onValueChange={(v) => set({ relationType: v })}>
            <SelectTrigger id="ap-rel"><SelectValue /></SelectTrigger>
            <SelectContent>{RELATIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ap-guardian">Guardian / Father / Husband Name</Label>
          <Input id="ap-guardian" value={value.guardianName} onChange={(e) => set({ guardianName: e.target.value })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ap-village">📍 Village <span className="text-destructive">*</span></Label>
          <Select value={value.village} onValueChange={onVillage}>
            <SelectTrigger id="ap-village"><SelectValue placeholder="Select village" /></SelectTrigger>
            <SelectContent>
              {loading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : availableVillages.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          {value.village === "Other" && (
            <Input className="mt-2" placeholder="Type village name" value={value.villageManual}
              onChange={(e) => set({ villageManual: e.target.value })} />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap-po">Post Office (auto)</Label>
          <Select value={value.postOffice} onValueChange={(v) => set({ postOffice: v })}>
            <SelectTrigger id="ap-po"><SelectValue placeholder="Select post office" /></SelectTrigger>
            <SelectContent>
              {availablePostOffices.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          {value.postOffice === "Other" && (
            <Input className="mt-2" placeholder="Type post office" value={value.postOfficeManual}
              onChange={(e) => set({ postOfficeManual: e.target.value })} />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap-ps">Police Station</Label>
          <Input id="ap-ps" value={value.policeStation} onChange={(e) => set({ policeStation: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ap-block">Block</Label>
          <Input id="ap-block" value={value.block} onChange={(e) => set({ block: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ap-district">District</Label>
          <Input id="ap-district" value={value.district} onChange={(e) => set({ district: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ap-pin">PIN</Label>
          <Input id="ap-pin" inputMode="numeric" maxLength={6} value={value.pin}
            onChange={(e) => set({ pin: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ap-epic">🪪 Voter ID (EPIC) No.</Label>
          <Input id="ap-epic" value={value.epicNo}
            onChange={(e) => set({ epicNo: e.target.value.toUpperCase() })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ap-aadhaar">Aadhaar — last 4 digits only</Label>
          <Input id="ap-aadhaar" inputMode="numeric" maxLength={4} placeholder="XXXX"
            value={value.aadhaarLast4}
            onChange={(e) => set({ aadhaarLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          <p className="text-xs text-muted-foreground">Full Aadhaar numbers are never stored.</p>
        </div>
      </div>

      {!hideContact && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ap-mobile">📱 Mobile</Label>
            <Input id="ap-mobile" inputMode="numeric" maxLength={10} value={value.mobile}
              onChange={(e) => set({ mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-email">📧 Email</Label>
            <Input id="ap-email" type="email" value={value.email}
              onChange={(e) => set({ email: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}
