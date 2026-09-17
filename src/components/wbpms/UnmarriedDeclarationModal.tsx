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
  Printer,
  Copy,
  Check,
  Building2,
  FileCheck,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Download,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface UnmarriedDeclarationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sansadList = Array.from({ length: 18 }, (_, i) => `Sansad ${i + 1} (${i + 1} নং সংসদ)`);

const commonPurposes = [
  "Indian Army Agniveer Recruitment Rally",
  "West Bengal Police / Kolkata Police Recruitment",
  "Paramilitary Forces (BSF / CISF / CRPF / ITBP)",
  "State Government Job & Service Verification",
  "Higher Educational Admission / Scholarship",
  "Rupashree Prakalpa Application Scrutiny",
  "Special Marriage Act, 1954 Statutory Notice",
  "Passport / Visa Single Status Clearance",
];

export function UnmarriedDeclarationModal({
  open,
  onOpenChange,
}: UnmarriedDeclarationModalProps) {
  const [applicantName, setApplicantName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [relation, setRelation] = useState<"Son of" | "Daughter of">("Son of");
  const [motherName, setMotherName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [village, setVillage] = useState("Bathanpara");
  const [sansadNo, setSansadNo] = useState("Sansad 1");
  const [purpose, setPurpose] = useState("Indian Army Agniveer Recruitment Rally");
  const [copied, setCopied] = useState(false);

  const displayApplicant = applicantName.trim() || "[ Applicant Full Name / আবেদনকারীর নাম ]";
  const displayGuardian = guardianName.trim() || "[ Father's Name / পিতার নাম ]";
  const displayMother = motherName.trim() || "[ Mother's Name / মাতার নাম ]";
  const displayAge = age.trim() || "[ Age / বয়স ]";
  const displayVillage = village.trim() || "Bagula";

  const englishDeclaration = `TO WHOM IT MAY CONCERN
OFFICE OF THE GRAM SANSAD MEMBER
BAGULA II GRAM PANCHAYAT, HANSKHALI, NADIA, WEST BENGAL

This is to certify that Sri/Smt. ${displayApplicant}, ${relation} Sri ${displayGuardian} and Smt. ${displayMother}, residing at Village/Para: ${displayVillage}, Post Office: Bagula, Police Station: Hanskhali, District: Nadia, PIN: 741502, West Bengal, under ${sansadNo} of Bagula 2 No Gram Panchayat, is personally known to me.

According to my field verification and local enquiry, he/she is approximately ${displayAge} years of age (DOB: ${dob || "As per birth record"}). To the best of my knowledge, he/she has never entered into matrimony and is currently UNMARRIED (অবিবাহিত). There is no past legal marriage recorded or subsisting.

This certificate of Unmarried Status is issued on request for the purpose of: ${purpose}.

I wish him/her all success in future life.

Date: ____________________
Place: Bagula, Nadia

___________________________________________________
Signature & Seal of Concerned Gram Sansad Member
Sansad No.: ${sansadNo}, Bagula II Gram Panchayat`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(englishDeclaration);
      setCopied(true);
      toast.success("Declaration text copied to clipboard!");
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
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border border-primary/25 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-accent/10 p-5 border-b border-border/60">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="bg-white/90 border-primary/30 text-primary font-medium text-xs">
              <Building2 size={12} className="mr-1 inline" /> Bagula II Gram Panchayat
            </Badge>
            <Badge className="bg-emerald-600 text-white text-xs">
              <UserCheck size={12} className="mr-1 inline" /> Gram Sansad Member Declaration
            </Badge>
            <Badge variant="secondary" className="text-xs">
              WBPMS Compliance
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold font-heading text-foreground">
            Gram Sansad Member Declaration for Unmarried Certificate
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            গ্রাম সংসদ সদস্যের অবিবাহিত প্রত্যয়নপত্র — Official format required by Bagula 2 No Gram Panchayat before Pradhan digital signing on WBPMS.
          </DialogDescription>
        </div>

        <div className="p-5 space-y-6">
          {/* Important Guideline Card */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Mandatory Prerequisite for WBPMS Unmarried Certificate:</strong>
              <p className="mt-0.5">
                The Bagula II GP Sub-Registrar / Pradhan requires a signed and stamped declaration from the elected <strong>Gram Sansad Member</strong> of the applicant's residential ward (Sansad 1 to 18). Print this format, get it signed by your local member, and upload the scanned PDF (&lt; 2 MB) to WBPMS along with proof of age and residential proof.
              </p>
            </div>
          </div>

          {/* Interactive Form Fields */}
          <div className="gov-card p-4 border space-y-4 bg-muted/20">
            <h4 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-2">
              <FileCheck size={15} className="text-primary" />
              Applicant & Sansad Details for Declaration (Fill to Customize)
            </h4>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div>
                <Label className="text-xs font-semibold">Applicant Full Name (in Capital)</Label>
                <Input
                  placeholder="e.g. SUBHAJIT BISWAS"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value.toUpperCase())}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Gender & Parentage</Label>
                <div className="flex gap-2 mt-1">
                  <select
                    className="h-8 text-xs border rounded px-2 bg-background"
                    value={relation}
                    onChange={(e) => setRelation(e.target.value as any)}
                  >
                    <option value="Son of">Son of (পিতা)</option>
                    <option value="Daughter of">Daughter of (পিতা/মাতা)</option>
                  </select>
                  <Input
                    placeholder="Father's full name"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value.toUpperCase())}
                    className="h-8 text-xs flex-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Mother's Name</Label>
                <Input
                  placeholder="Mother's name"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value.toUpperCase())}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Age (Completed Years)</Label>
                  <Input
                    placeholder="e.g. 21"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Date of Birth</Label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Village / Para (Within Bagula II GP)</Label>
                <Input
                  placeholder="e.g. Bathanpara / Collegepara / Muragachha"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Concerned Sansad / Ward</Label>
                <select
                  className="w-full h-8 text-xs border rounded px-2 bg-background mt-1"
                  value={sansadNo}
                  onChange={(e) => setSansadNo(e.target.value)}
                >
                  {sansadList.map((s, idx) => (
                    <option key={idx} value={`Sansad ${idx + 1}`}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Purpose of Unmarried Certificate</Label>
                <div className="flex gap-2 mt-1">
                  <select
                    className="h-8 text-xs border rounded px-2 bg-background flex-1"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  >
                    {commonPurposes.map((p, idx) => (
                      <option key={idx} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="Other Government / Statutory Purpose">Other Purpose</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Official Printable Declaration Document Sheet */}
          <div className="border-2 border-primary/40 rounded-xl p-6 bg-background shadow-inner relative space-y-4 print:border-black print:p-8">
            {/* GP Emblem & Watermark Header */}
            <div className="text-center border-b pb-4">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-1">
                <Building2 size={24} />
              </div>
              <h3 className="font-bold font-heading text-base sm:text-lg text-foreground tracking-wide uppercase">
                Office of the Gram Sansad Member
              </h3>
              <h4 className="text-xs font-bold text-primary">
                BAGULA II GRAM PANCHAYAT • HANSKHALI BLOCK
              </h4>
              <p className="text-[11px] text-muted-foreground">
                P.O. Bagula, P.S. Hanskhali, Dist. Nadia, PIN: 741502, West Bengal
              </p>
              <div className="mt-2 inline-block px-3 py-1 bg-muted rounded-full text-xs font-mono font-bold text-foreground">
                DECLARATION OF UNMARRIED STATUS (অবিবাহিত প্রত্যয়নপত্র)
              </div>
            </div>

            {/* Declaration Body */}
            <div className="text-xs sm:text-sm text-foreground space-y-3 leading-relaxed text-justify pt-2">
              <p>
                This is to certify that <strong>Sri/Smt. {displayApplicant}</strong>, {relation}{" "}
                <strong>Sri {displayGuardian}</strong> and Smt. <strong>{displayMother}</strong>, residing at
                Village/Para: <strong>{displayVillage}</strong>, Post Office: <strong>Bagula</strong>, Police Station:{" "}
                <strong>Hanskhali</strong>, District: <strong>Nadia</strong>, PIN: <strong>741502</strong>, West Bengal,
                falling under <strong>{sansadNo}</strong> of Bagula 2 No Gram Panchayat, is personally known to me.
              </p>
              <p>
                According to local field verification, community enquiry, and family records, he/she is approximately{" "}
                <strong>{displayAge}</strong> years of age (Date of Birth:{" "}
                <strong>{dob || "As per submitted age proof"}</strong>).
              </p>
              <p className="bg-primary/5 p-3 rounded border border-primary/20 font-medium">
                To the best of my knowledge and belief, he/she has <strong>never solemnized or registered any marriage</strong>{" "}
                under statutory or customary law and is currently <strong>UNMARRIED (অবিবাহিত)</strong>. He/she maintains
                good moral character in our Panchayat locality.
              </p>
              <p>
                This certificate of Unmarried Status is issued upon prayer of the applicant solely for the purpose of:{" "}
                <strong className="text-primary underline">{purpose}</strong>.
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
                  <div className="border-t border-foreground pt-1 min-w-[200px]">
                    <p className="font-bold text-foreground text-xs">Gram Sansad Member</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{sansadNo}</p>
                    <p className="text-[10px] text-muted-foreground">Bagula II Gram Panchayat</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Ready for Bagula II GP Sansad Member attestation</span>
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
                <Printer size={13} /> Print Declaration Sheet
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
