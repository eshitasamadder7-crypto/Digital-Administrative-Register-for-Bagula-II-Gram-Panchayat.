import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GitBranch,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  Building2,
  CheckCircle2,
  XCircle,
  FileCheck,
  ShieldCheck,
  UserCheck,
  ArrowDown,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface ScRelationTreeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaternalRelation =
  | "father"
  | "brother"
  | "grandfather"
  | "paternal_uncle"
  | "paternal_cousin";

interface RelationConfig {
  label: string;
  bengaliLabel: string;
  generationDiff: string;
  isValid: boolean;
  description: string;
}

const relationConfigs: Record<PaternalRelation, RelationConfig> = {
  father: {
    label: "Father (পিতা)",
    bengaliLabel: "পিতা (সরাসরি রক্তের সম্পর্ক)",
    generationDiff: "1 Generation (Direct Paternal Descent)",
    isValid: true,
    description: "Applicant is direct biological son/daughter of the existing card holder. Highest evidentiary weightage.",
  },
  brother: {
    label: "Real Brother (সহোদর ভাই)",
    bengaliLabel: "সহোদর ভাই (একই পিতা ও মাতার সন্তান)",
    generationDiff: "Same Generation (Collateral Paternal Descent)",
    isValid: true,
    description: "Applicant and cardholder share the exact same biological father and mother. Both born in the same paternal family.",
  },
  grandfather: {
    label: "Paternal Grandfather (ঠাকুরদা / পিতামহ)",
    bengaliLabel: "ঠাকুরদা / পিতামহ (পিতৃবংশীয় ঊর্ধ্বতন পূর্বপুরুষ)",
    generationDiff: "2 Generations (Direct Lineage through Father)",
    isValid: true,
    description: "Grandfather -> Applicant's Father -> Applicant. Two-step direct unbroken paternal descent.",
  },
  paternal_uncle: {
    label: "Real Paternal Uncle (জ্যাঠামশাই / কাকামশাই)",
    bengaliLabel: "বাবার নিজের ভাই (জ্যাঠা / কাকা)",
    generationDiff: "Collateral Paternal (Shared Grandfather)",
    isValid: true,
    description: "Applicant's father and the cardholder are real biological brothers born of the same paternal grandfather.",
  },
  paternal_cousin: {
    label: "Paternal First Cousin (জ্যাঠাতুতো / খুড়তুতো ভাই)",
    bengaliLabel: "জ্যাঠাতুতো বা খুড়তুতো ভাই (একই ঠাকুরদার পৌত্রগণ)",
    generationDiff: "Collateral Paternal (Same Grandfather Lineage)",
    isValid: true,
    description: "Cardholder is the son of applicant's real paternal uncle. Both trace origin to the same paternal grandfather.",
  },
};

export function ScRelationTreeModal({
  open,
  onOpenChange,
}: ScRelationTreeModalProps) {
  const [selectedRelation, setSelectedRelation] = useState<PaternalRelation>("father");
  const [cardHolderName, setCardHolderName] = useState("");
  const [certificateNo, setCertificateNo] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("SDO Ranaghat (রানাঘাট মহকুমা শাসক)");
  const [subCaste, setSubCaste] = useState("Namasudra (নমঃশূদ্র)");
  const [ancestorName, setAncestorName] = useState(""); // common grandfather/father
  const [applicantName, setApplicantName] = useState("");
  const [applicantFather, setApplicantFather] = useState("");
  const [sansadNo, setSansadNo] = useState("Sansad 1");
  const [village, setVillage] = useState("Bathanpara");
  const [copied, setCopied] = useState(false);

  const displayApplicant = applicantName.trim() || "[ Applicant Name / আবেদনকারীর নাম ]";
  const displayFather = applicantFather.trim() || "[ Father's Name / পিতার নাম ]";
  const displayCardHolder = cardHolderName.trim() || "[ Existing SC Cardholder / কার্ডধারীর নাম ]";
  const displayCertNo = certificateNo.trim() || "[ Certificate No. / সনদ নম্বর ]";
  const displayAncestor = ancestorName.trim() || "[ Common Paternal Ancestor / পিতামহ ]";

  const generateVamshabrikshaText = () => {
    return `GOVERNMENT OF WEST BENGAL • BAGULA II GRAM PANCHAYAT
OFFICE OF THE GRAM SANSAD MEMBER • SANSAD NO. ${sansadNo}
HANSKHALI BLOCK, NADIA DISTRICT

PATERNAL RELATIONSHIP LINEAGE & VAMSHABRIKSHA CERTIFICATE
(For SC/ST/OBC Caste Authentication under West Bengal P&RD / WBPMS)

This is to certify that Sri/Smt. ${displayApplicant}, Son/Daughter of Sri ${displayFather}, residing at Village/Para: ${village}, Post Office: Bagula, Police Station: Hanskhali, District: Nadia, PIN: 741502, West Bengal, under ${sansadNo} of Bagula 2 No Gram Panchayat, is personally known to me.

The applicant belongs by birth to the ${subCaste} community, which is recognized as a Scheduled Caste (SC) in the State of West Bengal.

PATERNAL BLOOD RELATIONSHIP LINKAGE:
1. Existing SC Certificate Holder: Sri/Smt. ${displayCardHolder}
2. Existing Certificate No.: ${displayCertNo} (Issued by: ${issuingAuthority})
3. Relationship to Applicant: ${relationConfigs[selectedRelation].label} (${relationConfigs[selectedRelation].bengaliLabel})
4. Lineage Chain Verification:
${
  selectedRelation === "father"
    ? `   • [Existing SC Holder: ${displayCardHolder}] ===(Biological Father)===> [Applicant: ${displayApplicant}]`
    : selectedRelation === "brother"
    ? `   • [Father: ${displayFather}] ===(Common Father)===> Both [Existing SC Holder: ${displayCardHolder}] & [Applicant: ${displayApplicant}] (Real Siblings)`
    : selectedRelation === "grandfather"
    ? `   • [Existing SC Holder: ${displayCardHolder} (Grandfather)] ===> [Father: ${displayFather}] ===> [Applicant: ${displayApplicant}]`
    : selectedRelation === "paternal_uncle"
    ? `   • [Common Grandfather: ${displayAncestor}] ===> 1. [Uncle / SC Holder: ${displayCardHolder}] & 2. [Father: ${displayFather}] ===> [Applicant: ${displayApplicant}]`
    : `   • [Common Grandfather: ${displayAncestor}] ===> [Paternal Uncle] -> [Cousin / SC Holder: ${displayCardHolder}] AND [Father: ${displayFather}] -> [Applicant: ${displayApplicant}]`
}

I have conducted field verification of electoral rolls, municipal/GP assessment records, and community knowledge. I hereby solemnly attest that the applicant and the existing SC certificate holder share an unbroken PATERNAL BLOOD RELATION (পিতৃবংশীয় রক্তের সম্পর্ক) without any interruption.

MANDATORY WBPMS ATTACHMENT RULE:
This certified Vamshabriksha sheet along with a photocopy of the existing SC certificate must be merged into ONE SINGLE PDF file (< 2 MB) before uploading to the WBPMS portal.

Date: ____________________
Place: Bagula, Nadia

___________________________________________________
Signature & Seal of Concerned Gram Sansad Member
Sansad No.: ${sansadNo}, Bagula II Gram Panchayat`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateVamshabrikshaText());
      setCopied(true);
      toast.success("Vamshabriksha & Relationship certificate copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border border-primary/25 shadow-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-accent/10 p-5 border-b border-border/60">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="bg-white/90 border-primary/30 text-primary font-medium text-xs">
              <Building2 size={12} className="mr-1 inline" /> Bagula II Gram Panchayat
            </Badge>
            <Badge className="bg-saffron text-foreground font-bold text-xs">
              <GitBranch size={12} className="mr-1 inline" /> SC/ST Paternal Relation System
            </Badge>
            <Badge variant="secondary" className="text-xs">
              WBPMS SOP Case I
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold font-heading text-foreground">
            SC/ST Paternal Lineage & Relationship Tree (বংশতালিকা)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Official West Bengal SC/ST Identification Act standard: Candidates applying via an existing family SC/ST card holder must explicitly show and substantiate unbroken paternal bloodline linkage.
          </DialogDescription>
        </div>

        <div className="p-5 space-y-6">
          {/* Statutory Rule Banner: Paternal vs Maternal */}
          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3.5 space-y-1 text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={16} /> VALID RELATIONSHIPS (পৈতৃক রক্তের সম্পর্ক)
              </div>
              <p className="text-[11px] leading-relaxed">
                Only relations through the <strong>biological father</strong> are legally admissible: Father, Real Brother, Paternal Grandfather, Real Paternal Uncle (Chacha/Jetha), or Paternal Cousin.
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-3.5 space-y-1 text-red-900 dark:text-red-200">
              <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-300">
                <XCircle size={16} /> INVALID / REJECTED RELATIONS (আইনত অগ্রহণযোগ্য)
              </div>
              <p className="text-[11px] leading-relaxed">
                Mother, Maternal Grandfather (মায়ের বাবা), Maternal Uncle (মামা), Husband, or In-laws are <strong>strictly invalid</strong> under West Bengal Act of 1994. Applications using maternal cards are rejected.
              </p>
            </div>
          </div>

          {/* Relation Selector & Detail Inputs */}
          <div className="gov-card p-4 border space-y-4 bg-muted/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-2">
                <GitBranch size={15} className="text-primary" />
                Select Relationship from Existing SC/ST Card Holder
              </h4>
              <Badge variant="outline" className="text-[11px]">
                {relationConfigs[selectedRelation].generationDiff}
              </Badge>
            </div>

            {/* 5 Paternal Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(relationConfigs) as PaternalRelation[]).map((relKey) => {
                const config = relationConfigs[relKey];
                const isSelected = selectedRelation === relKey;
                return (
                  <button
                    key={relKey}
                    type="button"
                    onClick={() => setSelectedRelation(relKey)}
                    className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                        : "bg-background hover:bg-muted/60 text-foreground border-border"
                    }`}
                  >
                    <span className="text-xs font-bold">{config.label.split("(")[0]}</span>
                    <span
                      className={`text-[10px] mt-1 ${
                        isSelected ? "text-primary-foreground/90" : "text-muted-foreground"
                      }`}
                    >
                      {config.bengaliLabel.split("(")[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground italic bg-background/60 p-2.5 rounded border">
              <strong>Relationship Legal Rule:</strong> {relationConfigs[selectedRelation].description}
            </p>

            {/* Detailed Data Fields */}
            <div className="grid sm:grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <Label className="text-xs font-semibold">Existing SC Cardholder Full Name</Label>
                <Input
                  placeholder="e.g. BIPUL BISWAS"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Existing Certificate Number</Label>
                <Input
                  placeholder="e.g. WB0902SC201800123 / 451/SDO/RNG"
                  value={certificateNo}
                  onChange={(e) => setCertificateNo(e.target.value)}
                  className="h-8 text-xs mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Issuing Authority</Label>
                <select
                  className="w-full h-8 text-xs border rounded px-2 bg-background mt-1"
                  value={issuingAuthority}
                  onChange={(e) => setIssuingAuthority(e.target.value)}
                >
                  <option value="SDO Ranaghat (রানাঘাট মহকুমা শাসক)">SDO Ranaghat (রানাঘাট মহকুমা শাসক)</option>
                  <option value="SDO Kalyani (কল্যাণী মহকুমা)">SDO Kalyani (কল্যাণী মহকুমা)</option>
                  <option value="SDO Krishnanagar Sadar">SDO Krishnanagar Sadar</option>
                  <option value="BDO Hanskhali (হাসখালি বিডিও)">BDO Hanskhali (হাসখালি বিডিও)</option>
                  <option value="Other SDO in West Bengal">Other SDO in West Bengal</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Sub-Caste Community</Label>
                <select
                  className="w-full h-8 text-xs border rounded px-2 bg-background mt-1"
                  value={subCaste}
                  onChange={(e) => setSubCaste(e.target.value)}
                >
                  <option value="Namasudra (নমঃশূদ্র)">Namasudra (নমঃশূদ্র)</option>
                  <option value="Rajbanshi (রাজবংশী)">Rajbanshi (রাজবংশী)</option>
                  <option value="Poundra (পৌণ্ড্র)">Poundra (পৌণ্ড্র)</option>
                  <option value="Bagdi (বাগদী)">Bagdi (বাগদী)</option>
                  <option value="Sunri (শুঁড়ি)">Sunri (শুঁড়ি)</option>
                  <option value="Kaibartta (কৈবর্ত্য)">Kaibartta (কৈবর্ত্য)</option>
                  <option value="Dhobi (ধোপা)">Dhobi (ধোপা)</option>
                  <option value="Muchi / Chamar (মুচি / চামার)">Muchi / Chamar (মুচি / চামার)</option>
                  <option value="Other Recognized SC in WB">Other Recognized SC in WB</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Applicant Name (Applying Citizen)</Label>
                <Input
                  placeholder="e.g. RAKESH BISWAS"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value.toUpperCase())}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Applicant's Biological Father</Label>
                <Input
                  placeholder="Father's name"
                  value={applicantFather}
                  onChange={(e) => setApplicantFather(e.target.value.toUpperCase())}
                  className="h-8 text-xs mt-1"
                />
              </div>

              {(selectedRelation === "grandfather" ||
                selectedRelation === "paternal_uncle" ||
                selectedRelation === "paternal_cousin") && (
                <div className="sm:col-span-2 bg-primary/5 p-2.5 rounded border border-primary/20">
                  <Label className="text-xs font-semibold">
                    Common Paternal Ancestor / Grandfather (ঠাকুরদার নাম)
                  </Label>
                  <Input
                    placeholder="Grandfather's name connecting both branches"
                    value={ancestorName}
                    onChange={(e) => setAncestorName(e.target.value.toUpperCase())}
                    className="h-8 text-xs mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Connects both branches of the paternal bloodline in the official genealogical tree.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold">Village / Para</Label>
                <Input
                  placeholder="e.g. Bathanpara, Bagula"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Sansad Number in Bagula II GP</Label>
                <select
                  className="w-full h-8 text-xs border rounded px-2 bg-background mt-1"
                  value={sansadNo}
                  onChange={(e) => setSansadNo(e.target.value)}
                >
                  {Array.from({ length: 18 }, (_, i) => (
                    <option key={i} value={`Sansad ${i + 1}`}>
                      Sansad {i + 1} ({i + 1} নং সংসদ)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Visual Paternal Lineage Diagram (Dynamic Tree) */}
          <div className="gov-card p-5 border border-primary/30 bg-gradient-to-b from-primary/5 via-background to-primary/5 rounded-xl space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <GitBranch size={15} className="text-primary" /> Visual Paternal Family Tree (বংশতালিকা চার্ট)
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Sub-Caste: {subCaste.split(" ")[0]}
              </span>
            </h4>

            {/* Tree Nodes based on selected relation */}
            <div className="p-4 bg-background rounded-lg border flex flex-col items-center justify-center gap-2">
              {selectedRelation === "father" && (
                <>
                  <div className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs text-center shadow-sm">
                    Existing SC Cardholder (পিতা)
                    <div className="text-[11px] font-normal">{displayCardHolder}</div>
                    <div className="text-[9px] opacity-90 font-mono">Cert: {displayCertNo}</div>
                  </div>
                  <ArrowDown size={18} className="text-primary animate-bounce" />
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Direct Paternal Descent (সরাসরি রক্তের সম্পর্ক)
                  </div>
                  <ArrowDown size={18} className="text-primary" />
                  <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs text-center shadow-sm">
                    Applicant (আবেদনকারী পুত্র/কন্যা)
                    <div className="text-[11px] font-normal">{displayApplicant}</div>
                  </div>
                </>
              )}

              {selectedRelation === "brother" && (
                <>
                  <div className="px-4 py-2 rounded-lg bg-muted border text-foreground font-bold text-xs text-center">
                    Biological Father (পিতা)
                    <div className="text-[11px] font-normal">{displayFather}</div>
                  </div>
                  <ArrowDown size={18} className="text-primary" />
                  <div className="flex items-center gap-4 flex-wrap justify-center">
                    <div className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs text-center shadow-sm">
                      Existing SC Cardholder (সহোদর ভাই)
                      <div className="text-[11px] font-normal">{displayCardHolder}</div>
                      <div className="text-[9px] opacity-90 font-mono">Cert: {displayCertNo}</div>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">↔ Real Siblings ↔</span>
                    <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs text-center shadow-sm">
                      Applicant (আবেদনকারী)
                      <div className="text-[11px] font-normal">{displayApplicant}</div>
                    </div>
                  </div>
                </>
              )}

              {selectedRelation === "grandfather" && (
                <>
                  <div className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs text-center shadow-sm">
                    Existing SC Cardholder (ঠাকুরদা / পিতামহ)
                    <div className="text-[11px] font-normal">{displayCardHolder}</div>
                    <div className="text-[9px] opacity-90 font-mono">Cert: {displayCertNo}</div>
                  </div>
                  <ArrowDown size={16} className="text-primary" />
                  <div className="px-3 py-1.5 rounded bg-muted border text-xs text-center">
                    Son / Applicant's Father: <strong>{displayFather}</strong>
                  </div>
                  <ArrowDown size={16} className="text-primary" />
                  <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs text-center shadow-sm">
                    Applicant (পৌত্র / পৌত্রী)
                    <div className="text-[11px] font-normal">{displayApplicant}</div>
                  </div>
                </>
              )}

              {selectedRelation === "paternal_uncle" && (
                <>
                  <div className="px-4 py-2 rounded-lg bg-muted border text-foreground font-bold text-xs text-center">
                    Common Paternal Grandfather (ঠাকুরদা)
                    <div className="text-[11px] font-normal">{displayAncestor}</div>
                  </div>
                  <ArrowDown size={16} className="text-primary" />
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-300 text-center">
                      <span className="text-[10px] text-emerald-800 font-bold block">Paternal Uncle (কাকা/জ্যাঠা)</span>
                      <strong className="text-xs text-emerald-900">{displayCardHolder}</strong>
                      <div className="text-[9px] text-emerald-700 font-mono mt-0.5">Cert: {displayCertNo}</div>
                    </div>
                    <div className="p-2 rounded bg-muted border text-center">
                      <span className="text-[10px] text-muted-foreground font-bold block">Applicant's Father</span>
                      <strong className="text-xs text-foreground">{displayFather}</strong>
                    </div>
                  </div>
                  <ArrowDown size={16} className="text-primary" />
                  <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs text-center shadow-sm">
                    Applicant: <strong>{displayApplicant}</strong>
                  </div>
                </>
              )}

              {selectedRelation === "paternal_cousin" && (
                <>
                  <div className="px-4 py-2 rounded-lg bg-muted border text-foreground font-bold text-xs text-center">
                    Common Paternal Grandfather (ঠাকুরদা)
                    <div className="text-[11px] font-normal">{displayAncestor}</div>
                  </div>
                  <ArrowDown size={16} className="text-primary" />
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md text-xs">
                    <div className="p-2 rounded bg-muted/60 border text-center space-y-1">
                      <div className="text-[10px] text-muted-foreground">Uncle's Line</div>
                      <ArrowDown size={12} className="mx-auto text-muted-foreground" />
                      <div className="p-1.5 rounded bg-emerald-600 text-white font-bold text-[11px]">
                        Cousin: {displayCardHolder}
                        <div className="text-[8px] opacity-90 font-mono">{displayCertNo}</div>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-muted/60 border text-center space-y-1">
                      <div className="text-[10px] text-muted-foreground">Father: {displayFather}</div>
                      <ArrowDown size={12} className="mx-auto text-muted-foreground" />
                      <div className="p-1.5 rounded bg-primary text-primary-foreground font-bold text-[11px]">
                        Applicant: {displayApplicant}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Printable Official Vamshabriksha Document Sheet */}
          <div className="border-2 border-primary/40 rounded-xl p-6 bg-background shadow-inner space-y-4 print:border-black print:p-8">
            <div className="text-center border-b pb-4">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-1">
                <Building2 size={24} />
              </div>
              <h3 className="font-bold font-heading text-base sm:text-lg text-foreground tracking-wide uppercase">
                Office of the Gram Sansad Member
              </h3>
              <h4 className="text-xs font-bold text-primary">
                BAGULA II GRAM PANCHAYAT • HANSKHALI, NADIA
              </h4>
              <p className="text-[11px] text-muted-foreground">
                P.O. Bagula, P.S. Hanskhali, Dist. Nadia, PIN: 741502, West Bengal
              </p>
              <div className="mt-2 inline-block px-3 py-1 bg-muted rounded-full text-xs font-mono font-bold text-foreground">
                PATERNAL VAMSHABRIKSHA & CASTE RELATIONSHIP CERTIFICATE
              </div>
            </div>

            <div className="text-xs sm:text-sm text-foreground space-y-3 leading-relaxed text-justify pt-1">
              <p>
                This is to certify that <strong>Sri/Smt. {displayApplicant}</strong>, Son/Daughter of{" "}
                <strong>Sri {displayFather}</strong>, is a permanent resident of Village/Para:{" "}
                <strong>{village}</strong>, Post Office: <strong>Bagula</strong>, Police Station:{" "}
                <strong>Hanskhali</strong>, District: <strong>Nadia</strong>, West Bengal, within{" "}
                <strong>{sansadNo}</strong> of Bagula 2 No Gram Panchayat.
              </p>
              <p>
                He/she belongs to the <strong>{subCaste}</strong> community, which is recognized as a Scheduled Caste
                (SC) in the State of West Bengal.
              </p>
              <div className="p-3 bg-muted/40 rounded border space-y-1.5 text-xs">
                <div className="font-bold text-foreground">
                  Paternal Lineage Linkage with Existing Card Holder:
                </div>
                <ul className="space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                  <li>
                    Existing SC Certificate Holder Name: <strong className="text-foreground">{displayCardHolder}</strong>
                  </li>
                  <li>
                    Certificate Number: <strong className="text-foreground font-mono">{displayCertNo}</strong> (Issued by: {issuingAuthority})
                  </li>
                  <li>
                    Exact Paternal Relationship: <strong className="text-primary">{relationConfigs[selectedRelation].label}</strong> ({relationConfigs[selectedRelation].bengaliLabel})
                  </li>
                  <li>
                    Bloodline Verification: Unbroken paternal descent substantiated by local electoral roll & GP genealogical records.
                  </li>
                </ul>
              </div>
              <p className="text-[11px] text-muted-foreground">
                I have verified that the applicant and the certificate holder are of the same paternal lineage
                (পিতৃবংশীয় রক্তের সম্পর্ক) and not through any maternal or in-law relation.
              </p>
            </div>

            {/* Signature Blocks */}
            <div className="pt-8 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Date: ____________________</p>
                <p className="text-muted-foreground mt-1">Place: Bagula, Nadia</p>
                <div className="mt-6 pt-6 border-t border-dashed border-border w-36">
                  <span className="text-[10px] text-muted-foreground">Applicant's Signature</span>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block text-center">
                  <div className="h-14 flex items-center justify-center text-muted-foreground text-[11px] italic">
                    [ Official Seal & Signature ]
                  </div>
                  <div className="border-t border-foreground pt-1 min-w-[210px]">
                    <p className="font-bold text-foreground text-xs">Gram Sansad Member</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{sansadNo}</p>
                    <p className="text-[10px] text-muted-foreground">Bagula II Gram Panchayat</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Critical WBPMS Merge Reminder */}
          <div className="bg-amber-500/10 border border-amber-400/50 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Mandatory WBPMS Upload Protocol for Caste Authentication:</strong>
              <p className="mt-0.5 text-[11px]">
                You must merge the scanned copy of the existing SC card + this signed Gram Sansad Vamshabriksha into{" "}
                <strong>ONE SINGLE PDF FILE (&lt; 2 MB)</strong>. Do not upload them as separate files, as the WBPMS system allows only one document attachment in the family caste proof slot.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>West Bengal SC/ST Identification Act & WBPMS Compliant</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 text-xs h-8"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy Text"}
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs h-8 font-semibold shadow-sm"
              >
                <Printer size={13} /> Print Vamshabriksha Sheet
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
