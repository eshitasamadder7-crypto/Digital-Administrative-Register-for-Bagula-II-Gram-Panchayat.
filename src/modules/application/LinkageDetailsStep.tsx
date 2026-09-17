import React from "react";
import { Plus, Trash2, ShieldCheck, UserCheck, Vote, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ApplicantInfo, LinkageDetails, LinkageParentElectoralRecord } from "@/modules/application/types";

interface LinkageDetailsStepProps {
  value: LinkageDetails;
  applicant: ApplicantInfo;
  onChange: (value: LinkageDetails) => void;
  readOnly?: boolean;
}

const RELATION_OPTIONS = [
  "Father",
  "Mother",
  "Grandfather",
  "Grandmother",
  "Father-in-law",
  "Mother-in-law",
  "Husband",
  "Guardian / Other",
];

const SPOUSE_RELATION_WORDING_OPTIONS = [
  "Wife of",
  "Daughter-in-law of",
  "Husband of",
  "Dependent of",
];

export default function LinkageDetailsStep({
  value,
  applicant,
  onChange,
  readOnly = false,
}: LinkageDetailsStepProps) {
  const updateField = <K extends keyof LinkageDetails>(key: K, val: LinkageDetails[K]) => {
    onChange({ ...value, [key]: val });
  };

  const handleAddParentRecord = () => {
    const newRecord: LinkageParentElectoralRecord = {
      name: "",
      relation: "Father",
      partNo: "",
      serialNo: "",
      epicNo: "",
      electoralRollYear: "Draft Electoral Roll 2025",
      assemblyConstituency: value.assemblyConstituency || "91 - Ranaghat Uttar Purba (SC)",
    };
    onChange({
      ...value,
      parentElectoralRecords: [...(value.parentElectoralRecords || []), newRecord],
    });
  };

  const handleRemoveParentRecord = (index: number) => {
    const updated = (value.parentElectoralRecords || []).filter((_, i) => i !== index);
    onChange({ ...value, parentElectoralRecords: updated });
  };

  const handleUpdateParentRecord = (
    index: number,
    field: keyof LinkageParentElectoralRecord,
    val: string
  ) => {
    const records = [...(value.parentElectoralRecords || [])];
    if (!records[index]) return;
    records[index] = { ...records[index], [field]: val };
    onChange({ ...value, parentElectoralRecords: records });
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-900">
        <div className="flex items-start gap-3">
          <Vote className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sky-950">
              Linkage Certificate for Election Enrolment
            </h4>
            <p className="text-xs text-sky-800">
              This certificate records voter linkage particulars for election enrolment as a
              beneficiary voter of the relevant Assembly Constituency. Fields correspond to the
              authoritative Gram Panchayat Linkage Certificate format.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: APPLICANT VOTER PARTICULARS */}
      <section className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2 border-b pb-2">
          <UserCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Section A: Applicant Electoral Particulars
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Voter Registration Status</Label>
            <Select
              value={value.voterStatus}
              onValueChange={(val: "registered" | "unregistered") => updateField("voterStatus", val)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unregistered">
                  Unregistered (Intending to be enrolled)
                </SelectItem>
                <SelectItem value="registered">
                  Already Registered (Linkage update / Transfer)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Typically unregistered if seeking fresh enrolment.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Applicant Assembly Constituency</Label>
            <Input
              value={value.assemblyConstituency}
              onChange={(e) => updateField("assemblyConstituency", e.target.value)}
              disabled={readOnly}
              placeholder="e.g. 91 - Ranaghat Uttar Purba (SC)"
            />
          </div>

          {value.voterStatus === "registered" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Applicant Part No.</Label>
                <Input
                  value={value.applicantPartNo}
                  onChange={(e) => updateField("applicantPartNo", e.target.value)}
                  disabled={readOnly}
                  placeholder="e.g. 72"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Applicant Serial No.</Label>
                <Input
                  value={value.applicantSerialNo}
                  onChange={(e) => updateField("applicantSerialNo", e.target.value)}
                  disabled={readOnly}
                  placeholder="e.g. 814"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Applicant EPIC No.</Label>
                <Input
                  value={value.applicantEpicNo}
                  onChange={(e) => updateField("applicantEpicNo", e.target.value.toUpperCase())}
                  disabled={readOnly}
                  placeholder="e.g. WBG1234567"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* SECTION 2: PURPOSE & TARGET CONSTITUENCY */}
      <section className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2 border-b pb-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Section B: Election-Enrolment Purpose
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium">Purpose Statement</Label>
            <Input
              value={value.purpose}
              onChange={(e) => updateField("purpose", e.target.value)}
              disabled={readOnly}
              placeholder="Election enrolment as a beneficiary voter of the Assembly Constituency"
            />
            <p className="text-[11px] text-muted-foreground">
              Official certificate text indicating intent to be enrolled as a beneficiary voter.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Target Assembly Constituency</Label>
            <Input
              value={value.targetAssemblyConstituency}
              onChange={(e) => updateField("targetAssemblyConstituency", e.target.value)}
              disabled={readOnly}
              placeholder="e.g. 91 - Ranaghat Uttar Purba (SC)"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: REPEATABLE PARENT / ANCESTOR ELECTORAL RECORDS */}
      <section className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Section C: Parent / Ancestor Electoral Linkage
            </h3>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddParentRecord}
              className="h-8 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Ancestor Record
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Record the Father, Mother, or Ancestor electoral details against which linkage is established
          in the Draft/Final Electoral Roll.
        </p>

        {(!value.parentElectoralRecords || value.parentElectoralRecords.length === 0) ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            No ancestor electoral records entered yet. Click "Add Ancestor Record" above.
          </div>
        ) : (
          <div className="space-y-3">
            {value.parentElectoralRecords.map((rec, index) => (
              <div
                key={rec.id ?? index}
                className="relative rounded-lg border bg-muted/20 p-3 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    Record #{index + 1}: {rec.relation || "Relative"} Linkage
                  </span>
                  {!readOnly && value.parentElectoralRecords.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveParentRecord(index)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      title="Remove Record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Relative Name</Label>
                    <Input
                      value={rec.name}
                      onChange={(e) => handleUpdateParentRecord(index, "name", e.target.value)}
                      disabled={readOnly}
                      placeholder="e.g. Late Subal Chandra Biswas"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Relationship</Label>
                    <Select
                      value={rec.relation}
                      onValueChange={(val) => handleUpdateParentRecord(index, "relation", val)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATION_OPTIONS.map((rel) => (
                          <SelectItem key={rel} value={rel}>
                            {rel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Part No.</Label>
                    <Input
                      value={rec.partNo}
                      onChange={(e) => handleUpdateParentRecord(index, "partNo", e.target.value)}
                      disabled={readOnly}
                      placeholder="e.g. 72"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Serial No.</Label>
                    <Input
                      value={rec.serialNo}
                      onChange={(e) => handleUpdateParentRecord(index, "serialNo", e.target.value)}
                      disabled={readOnly}
                      placeholder="e.g. 612"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">EPIC No.</Label>
                    <Input
                      value={rec.epicNo}
                      onChange={(e) =>
                        handleUpdateParentRecord(index, "epicNo", e.target.value.toUpperCase())
                      }
                      disabled={readOnly}
                      placeholder="e.g. WBG9876543"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Electoral Roll Source / Year</Label>
                    <Input
                      value={rec.electoralRollYear ?? "Draft Electoral Roll 2025"}
                      onChange={(e) =>
                        handleUpdateParentRecord(index, "electoralRollYear", e.target.value)
                      }
                      disabled={readOnly}
                      placeholder="e.g. Draft Electoral Roll 2025"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 4: MARRIAGE / SPOUSE DETAILS (OPTIONAL / MARRIED WOMEN LINKAGE) */}
      <section className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2 border-b pb-2">
          <UserCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Section D: Marriage &amp; Spouse Particulars (Optional / If Applicable)
          </h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Required for married woman linkage certificates where the applicant is linking from
          parental home to matrimonial residence.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Spouse Name</Label>
            <Input
              value={value.spouseName}
              onChange={(e) => updateField("spouseName", e.target.value)}
              disabled={readOnly}
              placeholder="e.g. Ranjit Biswas"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Relation Wording</Label>
            <Select
              value={value.spouseRelationWording}
              onValueChange={(val) => updateField("spouseRelationWording", val)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relation wording" />
              </SelectTrigger>
              <SelectContent>
                {SPOUSE_RELATION_WORDING_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium">Spouse Parent / Guardian Information</Label>
            <Input
              value={value.spouseParentInfo}
              onChange={(e) => updateField("spouseParentInfo", e.target.value)}
              disabled={readOnly}
              placeholder="e.g. S/O Late Subal Biswas"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Spouse Village</Label>
            <Input
              value={value.spouseVillage}
              onChange={(e) => updateField("spouseVillage", e.target.value)}
              disabled={readOnly}
              placeholder="e.g. Dakshin Bagula"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Spouse Post Office</Label>
            <Input
              value={value.spousePostOffice}
              onChange={(e) => updateField("spousePostOffice", e.target.value)}
              disabled={readOnly}
              placeholder="e.g. Bagula"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Spouse Police Station</Label>
            <Input
              value={value.spousePoliceStation}
              onChange={(e) => updateField("spousePoliceStation", e.target.value)}
              disabled={readOnly}
              placeholder="Hanskhali"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Spouse Gram Panchayat</Label>
            <Input
              value={value.spousePanchayat}
              onChange={(e) => updateField("spousePanchayat", e.target.value)}
              disabled={readOnly}
              placeholder="Bagula II"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
