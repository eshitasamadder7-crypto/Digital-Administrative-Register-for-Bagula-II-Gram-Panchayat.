import React, { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WarishDetails, WarishHeir } from "./types";
import SuccessorHierarchyDrafting from "@/modules/warish/SuccessorHierarchyDrafting";
import type { WarishSuccessorRecord } from "@/modules/warish/successorModel";
import {
  MasterDataService,
  type VillageWithPostOffices,
  type MasterRelation,
} from "@/lib/api/MasterDataService";
import { Loader2 } from "lucide-react";

interface Props {
  value: WarishDetails;
  onChange: (v: WarishDetails) => void;
  appId?: string | null;
  readOnly?: boolean;
}

export default function WarishDetailsStep({
  value,
  onChange,
  appId,
  readOnly = false,
}: Props) {
  const set = (patch: Partial<WarishDetails>) => onChange({ ...value, ...patch });

  const [villages, setVillages] = useState<VillageWithPostOffices[]>([]);
  const [relations, setRelations] = useState<MasterRelation[]>([]);
  const [loadingMasterData, setLoadingMasterData] = useState(true);

  // Fetch Master Data on Mount
  useEffect(() => {
    let isMounted = true;
    async function loadMasterData() {
      try {
        const [vils, rels] = await Promise.all([
          MasterDataService.getActiveVillagesWithPostOffices(),
          MasterDataService.getActiveRelations(),
        ]);
        if (isMounted) {
          setVillages(vils);
          setRelations(rels);
          setLoadingMasterData(false);

          // If village is set but village_id is missing, sync village_id
          if (value.village && !value.village_id) {
            const matchedVil = vils.find(
              (v) => v.name.toLowerCase() === value.village?.toLowerCase()
            );
            if (matchedVil) {
              const matchedPo = matchedVil.postOffices.find(
                (po) => po.name.toLowerCase() === value.postOffice?.toLowerCase()
              );
              set({
                village_id: matchedVil.id,
                post_office_id: matchedPo ? matchedPo.id : undefined,
              });
            }
          }

          // If applicantRelation is set but applicant_relation_id is missing, sync
          if (value.applicantRelation && !value.applicant_relation_id) {
            const matchedRel = rels.find(
              (r) => r.relation_name.toLowerCase() === value.applicantRelation?.toLowerCase()
            );
            if (matchedRel) {
              set({ applicant_relation_id: matchedRel.id });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load warish master data:", err);
        if (isMounted) setLoadingMasterData(false);
      }
    }
    loadMasterData();

    const handleUpdate = () => {
      MasterDataService.clearCache();
      loadMasterData();
    };

    window.addEventListener("bagula_master_data_updated", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("bagula_master_data_updated", handleUpdate);
    };
  }, []);

  // Filtered Post Offices for selected Village
  const selectedVillageObj = useMemo(() => {
    if (!value.village) return null;
    return (
      villages.find((v) => v.name.toLowerCase() === value.village?.toLowerCase()) ||
      (value.village_id ? villages.find((v) => v.id === value.village_id) : null)
    );
  }, [value.village, value.village_id, villages]);

  const availablePostOffices = useMemo(() => {
    if (!selectedVillageObj) return [];
    return selectedVillageObj.postOffices;
  }, [selectedVillageObj]);

  const handleVillageChange = (selectedVilName: string) => {
    const vilObj = villages.find((v) => v.name === selectedVilName);
    if (!vilObj) {
      set({ village: selectedVilName, village_id: undefined });
      return;
    }

    const validPOs = vilObj.postOffices;
    // Check if currently selected post office is valid for this village
    const currentPoValid = validPOs.some(
      (po) => po.name.toLowerCase() === value.postOffice?.toLowerCase()
    );

    let nextPoName = value.postOffice || "";
    let nextPoId = value.post_office_id;

    if (!currentPoValid) {
      if (validPOs.length === 1) {
        // Auto-select single mapped post office
        nextPoName = validPOs[0].name;
        nextPoId = validPOs[0].id;
      } else {
        // Require explicit selection from filtered list
        nextPoName = "";
        nextPoId = undefined;
      }
    } else {
      const matchedPo = validPOs.find(
        (po) => po.name.toLowerCase() === value.postOffice?.toLowerCase()
      );
      nextPoId = matchedPo?.id;
    }

    set({
      village: vilObj.name,
      village_id: vilObj.id,
      postOffice: nextPoName,
      post_office_id: nextPoId,
    });
  };

  const handlePostOfficeChange = (selectedPoName: string) => {
    const poObj = availablePostOffices.find((po) => po.name === selectedPoName);
    set({
      postOffice: selectedPoName,
      post_office_id: poObj?.id,
    });
  };

  const handleApplicantRelationChange = (selectedRelName: string) => {
    const relObj = relations.find((r) => r.relation_name === selectedRelName);
    set({
      applicantRelation: selectedRelName,
      applicant_relation_id: relObj?.id,
    });
  };

  // Ensure successors list is initialized
  const successors = value.successors || [];

  // If successors is empty but heirs has entries, initialize successors
  useEffect(() => {
    if ((!value.successors || value.successors.length === 0) && value.heirs && value.heirs.length > 0) {
      const converted: WarishSuccessorRecord[] = value.heirs
        .filter((h) => h.name.trim())
        .map((h, i) => {
          const relName = h.relation || "Son";
          const matchedRel = relations.find((r) => r.relation_name.toLowerCase() === relName.toLowerCase());
          return {
            id: `succ-${Date.now()}-${i}`,
            application_id: appId || "",
            parent_successor_id: null,
            serial_code: String(i + 1),
            name: h.name,
            care_of: "",
            relation: relName,
            relation_id: matchedRel ? matchedRel.id : null,
            age: h.age ? parseInt(h.age, 10) : null,
            is_deceased: false,
            has_successors: h.hasLegalSuccessors === "yes",
            depth: 0,
            sort_order: i + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

      if (converted.length > 0) {
        set({
          successors: converted,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relations]);

  const handleSuccessorsChange = (newSuccessors: WarishSuccessorRecord[]) => {
    // Keep heirs in sync for backward compatibility
    const newHeirs: WarishHeir[] = newSuccessors.map((s) => ({
      name: s.name,
      relation: s.relation,
      age: s.age != null ? String(s.age) : "",
      hasLegalSuccessors: s.has_successors ? "yes" : s.is_deceased ? "no" : "",
    }));

    set({
      successors: newSuccessors,
      heirs: newHeirs,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <span>📜 Warish Certificate Details</span>
          <span className="text-xs font-normal text-muted-foreground">/ ওয়ারিশ শংসাপত্রের বিবরণ</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Deceased person information and authoritative legal heir successor drafting hierarchy.
        </p>
      </div>

      {/* SECTION 1: DECEASED PERSON INFORMATION */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="border-b pb-2.5">
          <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
            <span>⚰️ Deceased Person Information / মৃত ব্যক্তির তথ্য</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Required administrative record fields per Bagula II Gram Panchayat Warish Register.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Deceased Name */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="w-deceased" className="text-xs font-medium">
              Full Name of Deceased / মৃত ব্যক্তির নাম <span className="text-destructive">*</span>
            </Label>
            <Input
              id="w-deceased"
              value={value.deceasedName}
              disabled={readOnly}
              placeholder="e.g. Late Gouranga Chakraborty"
              onChange={(e) => set({ deceasedName: e.target.value })}
            />
          </div>

          {/* Date of Death */}
          <div className="space-y-1.5">
            <Label htmlFor="w-dod" className="text-xs font-medium">
              Date of Death / মৃত্যুর তারিখ <span className="text-destructive">*</span>
            </Label>
            <Input
              id="w-dod"
              type="date"
              value={value.dateOfDeath}
              disabled={readOnly}
              onChange={(e) => set({ dateOfDeath: e.target.value })}
            />
          </div>

          {/* Age at Death */}
          <div className="space-y-1.5">
            <Label htmlFor="w-age-death" className="text-xs font-medium">
              Age at Death / মৃত্যুর সময় বয়স
            </Label>
            <Input
              id="w-age-death"
              type="number"
              min="0"
              max="125"
              value={value.ageAtDeath || ""}
              disabled={readOnly}
              placeholder="e.g. 74"
              onChange={(e) => set({ ageAtDeath: e.target.value })}
            />
          </div>

          {/* Father/Husband Information */}
          <div className="space-y-1.5">
            <Label htmlFor="w-fprefix" className="text-xs font-medium">
              Father/Husband Prefix / উপসর্গ
            </Label>
            <Select
              disabled={readOnly}
              value={value.fatherPrefix || "Late"}
              onValueChange={(v) => set({ fatherPrefix: v })}
            >
              <SelectTrigger id="w-fprefix">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Late">Late / স্বর্গীয়</SelectItem>
                <SelectItem value="Shri">Shri / শ্রী</SelectItem>
                <SelectItem value="Mr.">Mr.</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="w-fname" className="text-xs font-medium">
              Father / Husband Name / পিতা বা স্বামীর নাম <span className="text-destructive">*</span>
            </Label>
            <Input
              id="w-fname"
              value={value.fatherName}
              disabled={readOnly}
              placeholder="e.g. Napal Chakraborty"
              onChange={(e) => set({ fatherName: e.target.value })}
            />
          </div>

          {/* Place of Death */}
          <div className="space-y-1.5">
            <Label htmlFor="w-pod" className="text-xs font-medium">
              Place of Death / মৃত্যুর স্থান
            </Label>
            <Input
              id="w-pod"
              value={value.placeOfDeath || ""}
              disabled={readOnly}
              placeholder="e.g. Bagula College Para / Hanskhali BPHC"
              onChange={(e) => set({ placeOfDeath: e.target.value })}
            />
          </div>

          {/* Cause of Death */}
          <div className="space-y-1.5">
            <Label htmlFor="w-cod" className="text-xs font-medium">
              Cause / Circumstance of Death / মৃত্যুর কারণ
            </Label>
            <Input
              id="w-cod"
              value={value.causeOfDeath || ""}
              disabled={readOnly}
              placeholder="e.g. Old age ailments / Cardiac arrest"
              onChange={(e) => set({ causeOfDeath: e.target.value })}
            />
          </div>

          {/* Permanent Address */}
          <div className="space-y-1.5">
            <Label htmlFor="w-addr" className="text-xs font-medium">
              Permanent Address / স্থায়ী ঠিকানা
            </Label>
            <Input
              id="w-addr"
              value={value.permanentAddress || ""}
              disabled={readOnly}
              placeholder="e.g. Vill - College Para, P.O - Bagula"
              onChange={(e) => set({ permanentAddress: e.target.value })}
            />
          </div>

          {/* Controlled Village Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="w-village" className="text-xs font-medium flex items-center justify-between">
              <span>
                Village / গ্রাম <span className="text-destructive">*</span>
              </span>
              {loadingMasterData && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </Label>
            <Select
              disabled={readOnly || loadingMasterData}
              value={value.village || ""}
              onValueChange={handleVillageChange}
            >
              <SelectTrigger id="w-village">
                <SelectValue placeholder="Select Village / গ্রাম নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {villages.map((vil) => (
                  <SelectItem key={vil.id || vil.name} value={vil.name}>
                    {vil.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Controlled master data for Bagula II Gram Panchayat
            </p>
          </div>

          {/* Filtered Post Office Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="w-po" className="text-xs font-medium">
              Post Office / ডাকঘর <span className="text-destructive">*</span>
            </Label>
            <Select
              disabled={readOnly || loadingMasterData || !value.village}
              value={value.postOffice || ""}
              onValueChange={handlePostOfficeChange}
            >
              <SelectTrigger id="w-po">
                <SelectValue
                  placeholder={
                    !value.village
                      ? "Select Village first / প্রথমে গ্রাম নির্বাচন করুন"
                      : "Select Post Office / ডাকঘর নির্বাচন করুন"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availablePostOffices.map((po) => (
                  <SelectItem key={po.id || po.name} value={po.name}>
                    {po.name} {po.pin_code ? `(${po.pin_code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Filtered based on selected village mapping
            </p>
          </div>

          {/* Police Station */}
          <div className="space-y-1.5">
            <Label htmlFor="w-ps" className="text-xs font-medium">
              Police Station / থানা
            </Label>
            <Input
              id="w-ps"
              value={value.policeStation || "Hanskhali"}
              disabled={readOnly}
              onChange={(e) => set({ policeStation: e.target.value })}
            />
          </div>

          {/* District & PIN */}
          <div className="space-y-1.5">
            <Label htmlFor="w-dist" className="text-xs font-medium">
              District / জেলা
            </Label>
            <Input
              id="w-dist"
              value={value.district || "Nadia"}
              disabled={readOnly}
              onChange={(e) => set({ district: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="w-pin" className="text-xs font-medium">
              PIN / পিন কোড
            </Label>
            <Input
              id="w-pin"
              value={value.pin || "741502"}
              disabled={readOnly}
              onChange={(e) => set({ pin: e.target.value })}
            />
          </div>

          {/* Applicant Relation Controlled Dropdown */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="w-arel" className="text-xs font-medium flex items-center justify-between">
              <span>
                Applicant's Relation to Deceased / আবেদনকারীর সাথে সম্পর্ক <span className="text-destructive">*</span>
              </span>
              {loadingMasterData && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </Label>
            <Select
              disabled={readOnly || loadingMasterData}
              value={value.applicantRelation || ""}
              onValueChange={handleApplicantRelationChange}
            >
              <SelectTrigger id="w-arel">
                <SelectValue placeholder="Select Relation to Deceased / সম্পর্ক নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {relations.map((r) => (
                  <SelectItem key={r.id || r.relation_name} value={r.relation_name}>
                    {r.relation_name} {r.relation_name_bn ? `(${r.relation_name_bn})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Official legal heir relation category from Bagula II Master Register
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: SUCCESSOR HIERARCHY DRAFTING */}
      <SuccessorHierarchyDrafting
        deceasedName={value.deceasedName}
        successors={successors}
        onChange={handleSuccessorsChange}
        readOnly={readOnly}
        appId={appId}
        relations={relations}
      />
    </div>
  );
}

