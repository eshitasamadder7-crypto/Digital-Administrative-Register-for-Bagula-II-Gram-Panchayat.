import React, { useState, useMemo } from "react";
import {
  Shield,
  FileCheck,
  Search,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Building2,
  Trash2,
  FileText,
  UserCheck,
  UploadCloud,
  FileWarning,
  ExternalLink,
  Info,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import BirthDigitizationFormPrint from "./BirthDigitizationFormPrint";

// Administrative Context (Hardcoded as specified)
export const GP_ADMIN_CONTEXT = {
  state: "West Bengal",
  state_bn: "পশ্চিমবঙ্গ",
  district: "Nadia",
  district_bn: "নদিয়া",
  block: "Hanskhali",
  block_bn: "হাঁসখালি",
  gramPanchayat: "Bagula II",
  gramPanchayat_bn: "বগুলা ২ নং গ্রাম পঞ্চায়েত",
  subRegistrar: "SUSMITA BISWAS BARMAN",
  subRegistrarDesignation: "Pradhan & GP Sub-Registrar (Births & Deaths)",
  regulatoryFramework:
    "Section 12/17 of RBD Act, 1969 & Rule 12/13 of WB RBD Rules, 2000",
  jmtpPortalUrl: "https://janmamrityutathya.wb.gov.in",
};

// Registered Cyber Cafe Nodes in Bagula II
export const CYBER_CAFE_NODES = [
  {
    id: "trust_media",
    name: "Trust Media CSC",
    cscId: "373345540017",
    operatorName: "Samrat Biswas",
    location: "Muraghacha Colony, Bagula, Nadia",
    phone: "+91 97332 41100",
    verified: true,
  },
  {
    id: "nayan_mondal",
    name: "Nayan Mondal CSC",
    cscId: "373345540248",
    operatorName: "Nayan Mondal",
    location: "Bagula-II GP Area, Nadia",
    phone: "+91 94741 85200",
    verified: true,
  },
  {
    id: "joy_guru",
    name: "Joy Guru Cyber Cafe CSC",
    cscId: "373345540912",
    operatorName: "Bappa Sarkar",
    location: "Badkulla-Hanskhali Road, Bagula",
    phone: "+91 98320 63400",
    verified: true,
  },
];

// Historical Register Samples for pg_trgm Fuzzy Match Simulator
const HISTORICAL_VOLUME_REGISTERS = [
  {
    name: "GANESH PRAMANIK",
    name_bn: "গণেশ প্রামাণিক",
    father: "NAGARI PRAMANIK",
    mother: "SITA PRAMANIK",
    dob: "1998-04-12",
    regNo: "B-142/98",
    regDate: "1998-04-20",
    village: "Bagula Collegepara",
    volume: "Volume 1998 (Book 2)",
    folio: "Folio 42",
    status: "Verified in Register",
  },
  {
    name: "NAGARI PRAMANIK",
    name_bn: "নগরী প্রামাণিক",
    father: "RADHAMADHAB PRAMANIK",
    mother: "SARALA PRAMANIK",
    dob: "1974-11-03",
    regNo: "B-89/74",
    regDate: "1974-11-18",
    village: "Bathanpara",
    volume: "Volume 1974 (Book 1)",
    folio: "Folio 18",
    status: "Verified in Register",
  },
  {
    name: "SUBIR BISWAS",
    name_bn: "সুবীর বিশ্বাস",
    father: "AMALENDU BISWAS",
    mother: "REBA BISWAS",
    dob: "2000-08-15",
    regNo: "B-304/2000",
    regDate: "2000-08-25",
    village: "Muraghacha Colony",
    volume: "Volume 2000 (Book 3)",
    folio: "Folio 88",
    status: "Verified in Register",
  },
  {
    name: "ANITA GHOSH",
    name_bn: "অনিতা ঘোষ",
    father: "TARAPADA GHOSH",
    mother: "MIRA GHOSH",
    dob: "1995-02-19",
    regNo: "B-072/95",
    regDate: "1995-03-01",
    village: "Kashipur",
    volume: "Volume 1995 (Book 1)",
    folio: "Folio 31",
    status: "Verified in Register",
  },
  {
    name: "PROSENJIT MAJUMDAR",
    name_bn: "প্রসেনজিৎ মজুমদার",
    father: "DHIRENDRANATH MAJUMDAR",
    mother: "ALPANA MAJUMDAR",
    dob: "2003-06-22",
    regNo: "B-419/2003",
    regDate: "2003-07-05",
    village: "Bagula Bazar",
    volume: "Volume 2003 (Book 4)",
    folio: "Folio 104",
    status: "Verified in Register",
  },
];

// Helper: Calculate trigram similarity (pg_trgm simulator)
function calculateTrigramSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]/g, "");
  const s2 = str2.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]/g, "");

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const getTrigrams = (s: string) => {
    const padded = `  ${s} `;
    const trigrams = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }
    return trigrams;
  };

  const t1 = getTrigrams(s1);
  const t2 = getTrigrams(s2);

  let intersection = 0;
  t1.forEach((tri) => {
    if (t2.has(tri)) intersection++;
  });

  const union = t1.size + t2.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

export default function LegacyBirthDigitizationPortal() {
  // Active Main View
  const [activeTab, setActiveTab] = useState<
    "form" | "summary" | "operator" | "sandbox" | "sop" | "raw_a4"
  >("form");

  // Operator Authentication State
  const [selectedNodeId, setSelectedNodeId] = useState<string>("trust_media");
  const [operatorMobile, setOperatorMobile] = useState<string>("9733241100");
  const [otpValue, setOtpValue] = useState<string>("");
  const [isOtpSent, setIsOtpSent] = useState<boolean>(true);
  const [isOperatorAuthenticated, setIsOperatorAuthenticated] =
    useState<boolean>(true);

  // DPDP Consent State
  const [hasConsent, setHasConsent] = useState<boolean>(true);

  // Digitization Path (SBHI Case-I)
  // path_a: Manual Record Available & Legible
  // path_b: Manual Record Lost/Damaged (Requires Police GD & Secondary Age Proof)
  const [digitizationPath, setDigitizationPath] = useState<"path_a" | "path_b">(
    "path_a"
  );

  // Form Fields
  const [form, setForm] = useState({
    childName: "GANESH PRAMANIK",
    childNameBn: "গণেশ প্রামাণিক",
    gender: "Male",
    dob: "1998-04-12",
    placeOfBirth: "Bagula Collegepara, Nadia",
    // Path A specifics
    oldRegNo: "B-142/98",
    oldRegDate: "1998-04-20",
    // Path B specifics
    policeStation: "Hanskhali Police Station",
    policeGdNo: "GD No. 412/2026",
    policeGdDate: "2026-02-10",
    secondaryAgeProofType: "Class-X WBBSE Admit Card",
    // Mother's Information (Mandatory)
    motherName: "SITA PRAMANIK",
    motherNameBn: "সীতা প্রামাণিক",
    motherIdType: "Aadhaar Card",
    motherIdNumber: "XXXX-XXXX-4812",
    motherMobile: "9832104567",
    // Father's Information (Optional)
    fatherName: "NAGARI PRAMANIK",
    fatherNameBn: "নগরী প্রামাণিক",
    fatherIdType: "Aadhaar Card",
    fatherIdNumber: "XXXX-XXXX-9104",
    // Addresses
    presentAddress: "Vill- Bagula Collegepara, P.O- Bagula, P.S- Hanskhali, Dist- Nadia, PIN- 741502",
    permanentAddress: "Vill- Bagula Collegepara, P.O- Bagula, P.S- Hanskhali, Dist- Nadia, PIN- 741502",
    sameAddress: true,
  });

  // Upload Slots and strict validation
  // Constraints: Old Certificate < 100 KB, ID Proof < 50 KB, Police GD < 200 KB
  const [uploads, setUploads] = useState<{
    oldCertificate?: { name: string; sizeKb: number; valid: boolean; error?: string };
    motherId?: { name: string; sizeKb: number; valid: boolean; error?: string };
    policeGd?: { name: string; sizeKb: number; valid: boolean; error?: string };
    secondaryAgeProof?: { name: string; sizeKb: number; valid: boolean; error?: string };
  }>({
    oldCertificate: { name: "manual_cert_scan_1998.jpg", sizeKb: 78.4, valid: true },
    motherId: { name: "mother_aadhaar_scan.pdf", sizeKb: 42.1, valid: true },
  });

  // Pre-verification Reference generated
  const [verificationRef, setVerificationRef] = useState<string>("BGL2/DIGI/2026/0491");
  const [submissionTime, setSubmissionTime] = useState<string>("2026-09-15 11:30 AM");

  // Fuzzy search sandbox state
  const [searchQuery, setSearchQuery] = useState<string>("Ganesh Pramanik");

  const activeNode = useMemo(() => {
    return (
      CYBER_CAFE_NODES.find((n) => n.id === selectedNodeId) ||
      CYBER_CAFE_NODES[0]
    );
  }, [selectedNodeId]);

  // Handle Uppercase Transformation for Names
  const handleNameChange = (field: "childName" | "motherName" | "fatherName", val: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: val.toUpperCase(),
    }));
  };

  // Zero-Retention Purge (DPDP Rules 2025 compliance)
  const handleZeroRetentionPurge = () => {
    setForm({
      childName: "",
      childNameBn: "",
      gender: "Male",
      dob: "",
      placeOfBirth: "",
      oldRegNo: "",
      oldRegDate: "",
      policeStation: "Hanskhali Police Station",
      policeGdNo: "",
      policeGdDate: "",
      secondaryAgeProofType: "Class-X WBBSE Admit Card",
      motherName: "",
      motherNameBn: "",
      motherIdType: "Aadhaar Card",
      motherIdNumber: "",
      motherMobile: "",
      fatherName: "",
      fatherNameBn: "",
      fatherIdType: "Aadhaar Card",
      fatherIdNumber: "",
      presentAddress: "",
      permanentAddress: "",
      sameAddress: true,
    });
    setUploads({});
    setVerificationRef("");
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    toast.success(
      "🔒 Session Purged! All citizen data and upload caches wiped from browser memory under DPDP Rules 2025."
    );
  };

  // File Upload Handler with size validation
  const handleFileUpload = (
    type: "oldCertificate" | "motherId" | "policeGd" | "secondaryAgeProof",
    file: File | null
  ) => {
    if (!file) return;

    const sizeKb = Number((file.size / 1024).toFixed(1));
    let limitKb = 100;
    let label = "File";

    if (type === "oldCertificate") {
      limitKb = 100;
      label = "Old Handwritten Certificate Scan";
    } else if (type === "motherId") {
      limitKb = 50;
      label = "Mother's Identity Proof";
    } else if (type === "policeGd") {
      limitKb = 200;
      label = "Police GD Loss Report";
    } else if (type === "secondaryAgeProof") {
      limitKb = 150;
      label = "Secondary Age Proof";
    }

    if (sizeKb > limitKb) {
      const errorMsg = `⚠️ File size (${sizeKb} KB) exceeds the statutory ${limitKb} KB limit for ${label}. Please compress before uploading.`;
      setUploads((prev) => ({
        ...prev,
        [type]: { name: file.name, sizeKb, valid: false, error: errorMsg },
      }));
      toast.error(errorMsg);
    } else {
      setUploads((prev) => ({
        ...prev,
        [type]: { name: file.name, sizeKb, valid: true },
      }));
      toast.success(`✅ ${label} accepted (${sizeKb} KB <= ${limitKb} KB)`);
    }
  };

  // Operator Login Simulator
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue === "928374" || otpValue.length === 6) {
      setIsOperatorAuthenticated(true);
      toast.success(
        `Operator authenticated at node: ${activeNode.name} (${activeNode.cscId})`
      );
      setActiveTab("form");
    } else {
      toast.error("Invalid OTP. Enter test OTP: 928374");
    }
  };

  // Form Submission -> Summary
  const handleGenerateSummary = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.childName || !form.dob || !form.motherName) {
      toast.error("Please fill all mandatory fields (Child Name, DOB, Mother's Name)");
      return;
    }

    if (digitizationPath === "path_a" && !form.oldRegNo) {
      toast.error("Old Registration Number is required for Path A");
      return;
    }

    if (digitizationPath === "path_b" && !form.policeGdNo) {
      toast.error("Police GD Report Number is required for Path B");
      return;
    }

    // Check upload validity
    if (digitizationPath === "path_a" && uploads.oldCertificate && !uploads.oldCertificate.valid) {
      toast.error("Please fix file size warning on Old Certificate scan");
      return;
    }

    const newRef = `BGL2/DIGI/2026/${Math.floor(1000 + Math.random() * 9000)}`;
    setVerificationRef(newRef);
    setSubmissionTime(new Date().toLocaleString("en-IN"));
    setActiveTab("summary");
    toast.success("Pre-Verification Summary Sheet generated successfully!");
  };

  // Fuzzy Search Calculations
  const fuzzyResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return HISTORICAL_VOLUME_REGISTERS.map((reg) => {
      const matchScoreEn = calculateTrigramSimilarity(searchQuery, reg.name);
      const matchScoreBn = calculateTrigramSimilarity(searchQuery, reg.name_bn);
      const matchScoreFather = calculateTrigramSimilarity(searchQuery, reg.father);
      const bestScore = Math.max(matchScoreEn, matchScoreBn, matchScoreFather);

      return {
        ...reg,
        matchPercentage: bestScore,
      };
    })
      .filter((item) => item.matchPercentage > 20)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. WEST BENGAL G2C GOVERNMENT HEADER BANNER                               */}
      {/* ========================================================================= */}
      <header className="rounded-2xl bg-[#0B2545] text-white p-5 sm:p-6 shadow-md border-b-4 border-amber-500 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full opacity-10 pointer-events-none flex items-center justify-end pr-6">
          <Building2 size={180} />
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Govt. of West Bengal
              </span>
              <span className="bg-white/10 text-amber-300 text-[11px] font-mono px-2 py-0.5 rounded-md border border-amber-400/30">
                SBHI SOP Case-I Digitization
              </span>
              <span className="text-[11px] text-white/70">
                May 2026 Re-Verification Drive
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{GP_ADMIN_CONTEXT.gramPanchayat} Gram Panchayat</span>
              <span className="text-sm font-normal text-white/80 hidden lg:inline">
                ({GP_ADMIN_CONTEXT.gramPanchayat_bn})
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 font-medium">
              Legacy Birth Certificate Digitization Pre-Verification Portal (Pre-2016 Records)
            </p>
            <p className="text-[11px] text-white/70">
              Jurisdiction: Block {GP_ADMIN_CONTEXT.block} · District {GP_ADMIN_CONTEXT.district} · Sub-Registrar: {GP_ADMIN_CONTEXT.subRegistrar}
            </p>
          </div>

          {/* Active Operator Node Badge & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-2.5 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Shield size={14} />
                <span>Authorized Cyber Node</span>
              </div>
              <div className="text-white font-bold">{activeNode.name}</div>
              <div className="text-[10px] text-white/80 font-mono">
                CSC ID: {activeNode.cscId} ({activeNode.operatorName})
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleZeroRetentionPurge}
              className="rounded-xl text-xs font-semibold h-9 bg-rose-600/90 hover:bg-rose-700 text-white gap-1.5 shadow-xs"
              title="Wipes all form inputs, scan caches and RAM under DPDP Rules 2025"
            >
              <Trash2 size={13} />
              <span>Purge & Logout (DPDP)</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. DPDP RULES 2025 BILINGUAL PRIVACY NOTICE BANNER                        */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5 text-xs text-emerald-950 flex items-start gap-3 shadow-2xs">
        <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
          <Lock size={15} />
        </div>
        <div className="space-y-1 flex-1">
          <div className="font-bold flex items-center gap-2 text-emerald-900">
            <span>DPDP Rules 2025 & West Bengal SBHI Zero-Retention Privacy Safeguard</span>
            <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0">Enforced</Badge>
          </div>
          <p className="text-emerald-800 text-[11px] leading-relaxed">
            <strong>English:</strong> All citizen details and identity proof scans are held strictly in temporary browser memory during this pre-verification session. No data or scans are permanently retained on this cyber cafe terminal. Clicking "Purge & Logout" destroys all cached state immediately.
          </p>
          <p className="text-emerald-900 text-[11px] leading-relaxed font-bengali">
            <strong>বাংলা:</strong> ডিজিটাল ব্যক্তিগত ডেটা সুরক্ষা বিধি (DPDP 2025) অনুযায়ী এই পোর্টালে কাজ করার সময় কোনো নাগরিকের আধার বা নথি সাইবার ক্যাফের কম্পিউটারে সংরক্ষণ করা হয় না। কাজ শেষে "Purge & Logout" করলে সমস্ত তথ্য মুছে যাবে।
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. NAVIGATION TABS                                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <Button
          variant={activeTab === "form" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("form")}
          className={`rounded-xl text-xs gap-1.5 font-semibold ${
            activeTab === "form" ? "bg-[#0B2545] text-white" : ""
          }`}
        >
          <FileText size={14} />
          <span>New Digitization File (Form A)</span>
        </Button>

        <Button
          variant={activeTab === "summary" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("summary")}
          className={`rounded-xl text-xs gap-1.5 font-semibold ${
            activeTab === "summary" ? "bg-[#0B2545] text-white" : ""
          }`}
        >
          <Printer size={14} />
          <span>Pre-Verification Summary & Print</span>
          {verificationRef && (
            <Badge variant="secondary" className="text-[10px] ml-1 bg-amber-100 text-amber-900">
              Ready
            </Badge>
          )}
        </Button>

        <Button
          variant={activeTab === "sandbox" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("sandbox")}
          className={`rounded-xl text-xs gap-1.5 font-semibold ${
            activeTab === "sandbox" ? "bg-[#0B2545] text-white" : ""
          }`}
        >
          <Search size={14} />
          <span>Phonetic Name Search (pg_trgm)</span>
        </Button>

        <Button
          variant={activeTab === "operator" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("operator")}
          className={`rounded-xl text-xs gap-1.5 font-semibold ${
            activeTab === "operator" ? "bg-[#0B2545] text-white" : ""
          }`}
        >
          <UserCheck size={14} />
          <span>Cyber Cafe Node Authentication</span>
        </Button>

        <Button
          variant={activeTab === "sop" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("sop")}
          className={`rounded-xl text-xs gap-1.5 font-semibold ${
            activeTab === "sop" ? "bg-[#0B2545] text-white" : ""
          }`}
        >
          <Info size={14} />
          <span>SOP Guidelines & Statutory Checklist</span>
        </Button>

        <Button
          variant={activeTab === "raw_a4" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("raw_a4")}
          className={`rounded-xl text-xs gap-1.5 font-semibold text-muted-foreground ${
            activeTab === "raw_a4" ? "bg-[#0B2545] text-white" : ""
          }`}
        >
          <Layers size={14} />
          <span>Official Blank Form A4 Sheet</span>
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* 4. TAB 1: NEW DIGITIZATION FILE (FORM A) WITH DUAL PATHS                  */}
      {/* ========================================================================= */}
      {activeTab === "form" && (
        <div className="space-y-6">
          {/* Dual Path Selector (SBHI SOP Case-I) */}
          <div className="bg-muted/40 p-4 rounded-2xl border border-border/60">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
              Select Case-I Digitization Scenario (West Bengal SBHI SOP):
            </Label>
            <div className="grid sm:grid-cols-2 gap-3">
              <div
                onClick={() => setDigitizationPath("path_a")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  digitizationPath === "path_a"
                    ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                    : "border-border/60 bg-background hover:bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                    <span>Path A: Manual Record Available & Legible</span>
                  </div>
                  {digitizationPath === "path_a" && (
                    <Badge className="bg-emerald-600 text-white text-[10px]">Active</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Citizen possesses an intact, readable handwritten birth certificate issued prior to 2016. Direct verification against GP Volume Register.
                </p>
                <div className="mt-2 text-[11px] font-semibold text-emerald-800">
                  Required: Original Certificate Scan (&lt;100 KB) + Mother's ID (&lt;50 KB)
                </div>
              </div>

              <div
                onClick={() => setDigitizationPath("path_b")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  digitizationPath === "path_b"
                    ? "border-amber-600 bg-amber-50/50 shadow-xs"
                    : "border-border/60 bg-background hover:bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" />
                    <span>Path B: Manual Record Lost / Damaged</span>
                  </div>
                  {digitizationPath === "path_b" && (
                    <Badge className="bg-amber-600 text-white text-[10px]">Active</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Citizen's certificate is missing or physically destroyed. Non-Availability search conducted against Volume Register.
                </p>
                <div className="mt-2 text-[11px] font-semibold text-amber-800">
                  Required: Police GD Loss Report (&lt;200 KB) + Secondary Age Proof (&lt;150 KB)
                </div>
              </div>
            </div>
          </div>

          {/* Main Form */}
          <form onSubmit={handleGenerateSummary} className="space-y-6">
            {/* Section 1: Child Information */}
            <div className="p-5 rounded-2xl border border-border/80 bg-background space-y-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 pb-2 border-b border-border/40">
                <span className="bg-primary text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">
                  1
                </span>
                <span>Child & Birth Details / শিশুর তথ্যাবলী</span>
              </h3>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="child-name" className="text-xs font-semibold">
                    Child Full Name (English - Auto Uppercase) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="child-name"
                    value={form.childName}
                    onChange={(e) => handleNameChange("childName", e.target.value)}
                    placeholder="e.g. GANESH PRAMANIK"
                    className="font-mono uppercase font-medium"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Enforces uppercase to prevent spelling mismatches in administrative records.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="child-name-bn" className="text-xs font-semibold">
                    শিশুর নাম (বাংলায় - Bengali)
                  </Label>
                  <Input
                    id="child-name-bn"
                    value={form.childNameBn}
                    onChange={(e) => setForm({ ...form, childNameBn: e.target.value })}
                    placeholder="যেমন: গণেশ প্রামাণিক"
                    className="font-bengali"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="gender" className="text-xs font-semibold">
                    Gender / লিঙ্গ <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="gender"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="Male">Male (পুরুষ)</option>
                    <option value="Female">Female (মহিলা)</option>
                    <option value="Transgender">Transgender (তৃতীয় লিঙ্গ)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="dob" className="text-xs font-semibold">
                    Date of Birth / জন্মতারিখ <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="dob"
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pob" className="text-xs font-semibold">
                    Place of Birth (Bagula II GP) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="pob"
                    value={form.placeOfBirth}
                    onChange={(e) => setForm({ ...form, placeOfBirth: e.target.value })}
                    placeholder="e.g. Bagula Collegepara, Bathanpara"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Path Fields */}
              {digitizationPath === "path_a" ? (
                <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-dashed border-border/60">
                  <div className="space-y-1">
                    <Label htmlFor="old-reg-no" className="text-xs font-semibold">
                      Old Manual Registration Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="old-reg-no"
                      value={form.oldRegNo}
                      onChange={(e) => setForm({ ...form, oldRegNo: e.target.value })}
                      placeholder="e.g. B-142/98 or 84/2001"
                      className="font-mono font-medium"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Found at top/left margin of the handwritten birth certificate.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="old-reg-date" className="text-xs font-semibold">
                      Original Date of Registration
                    </Label>
                    <Input
                      id="old-reg-date"
                      type="date"
                      value={form.oldRegDate}
                      onChange={(e) => setForm({ ...form, oldRegDate: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>Path B: Certificate Missing / Destroyed (Non-Availability Registration)</span>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-amber-950">
                        Old Registration Number
                      </Label>
                      <Input
                        value="NOT_AVAILABLE (NON-AVAILABILITY SEARCH)"
                        readOnly
                        className="bg-amber-100/70 font-mono text-xs cursor-not-allowed font-semibold text-amber-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-amber-950">
                        Police GD Loss Report Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.policeGdNo}
                        onChange={(e) => setForm({ ...form, policeGdNo: e.target.value })}
                        placeholder="e.g. GD No. 412/2026"
                        className="bg-white font-mono text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-amber-950">
                        Police GD Entry Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={form.policeGdDate}
                        onChange={(e) => setForm({ ...form, policeGdDate: e.target.value })}
                        className="bg-white text-xs"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Parents Information (Mother Mandatory) */}
            <div className="p-5 rounded-2xl border border-border/80 bg-background space-y-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 pb-2 border-b border-border/40">
                <span className="bg-primary text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">
                  2
                </span>
                <span>Parental Information (Mother's Identity Mandatory) / পিতা-মাতার বিবরণ</span>
              </h3>

              {/* Mother's Details */}
              <div className="space-y-3 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200/60">
                <div className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-700" />
                  <span>Mother's Details (Mandatory per WB SBHI Rules)</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="mother-name" className="text-xs font-semibold">
                      Mother's Full Name (English - Auto Uppercase) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="mother-name"
                      value={form.motherName}
                      onChange={(e) => handleNameChange("motherName", e.target.value)}
                      placeholder="e.g. SITA PRAMANIK"
                      className="font-mono uppercase"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mother-mobile" className="text-xs font-semibold">
                      Mother's Mobile Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="mother-mobile"
                      value={form.motherMobile}
                      onChange={(e) => setForm({ ...form, motherMobile: e.target.value })}
                      placeholder="10-digit mobile"
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Mother's ID Proof Type</Label>
                    <select
                      value={form.motherIdType}
                      onChange={(e) => setForm({ ...form, motherIdType: e.target.value })}
                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="Aadhaar Card">Aadhaar Card (আধার কার্ড)</option>
                      <option value="EPIC Voter ID">Voter ID / EPIC (ভোটার কার্ড)</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Passport">Passport</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Mother's ID Number (Last 4 digits visible)</Label>
                    <Input
                      value={form.motherIdNumber}
                      onChange={(e) => setForm({ ...form, motherIdNumber: e.target.value })}
                      placeholder="e.g. XXXX-XXXX-4812"
                    />
                  </div>
                </div>
              </div>

              {/* Father's Details (Optional) */}
              <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <div className="font-bold text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info size={13} />
                  <span>Father's Details (Optional / প্রযোজ্য হলে)</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="father-name" className="text-xs font-semibold">
                      Father's Full Name (English - Auto Uppercase)
                    </Label>
                    <Input
                      id="father-name"
                      value={form.fatherName}
                      onChange={(e) => handleNameChange("fatherName", e.target.value)}
                      placeholder="e.g. NAGARI PRAMANIK"
                      className="font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Father's ID Type</Label>
                    <select
                      value={form.fatherIdType}
                      onChange={(e) => setForm({ ...form, fatherIdType: e.target.value })}
                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="EPIC Voter ID">Voter ID / EPIC</option>
                      <option value="PAN Card">PAN Card</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    Mother's Address at Time of Child's Birth <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.presentAddress}
                    onChange={(e) => setForm({ ...form, presentAddress: e.target.value })}
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="same-addr"
                    checked={form.sameAddress}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sameAddress: e.target.checked,
                        permanentAddress: e.target.checked
                          ? form.presentAddress
                          : form.permanentAddress,
                      })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="same-addr" className="text-xs cursor-pointer font-normal">
                    Permanent address is the same as present address
                  </Label>
                </div>

                {!form.sameAddress && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Permanent Address</Label>
                    <Input
                      value={form.permanentAddress}
                      onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Document Uploads with Strict Size Constraints */}
            <div className="p-5 rounded-2xl border border-border/80 bg-background space-y-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 pb-2 border-b border-border/40">
                <span className="bg-primary text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">
                  3
                </span>
                <span>Document Scans & Strict Size Constraints / নথি আপলোড</span>
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Upload 1: Old Certificate (Path A) or Police GD (Path B) */}
                {digitizationPath === "path_a" ? (
                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">
                        Old Handwritten Certificate Scan <span className="text-destructive">*</span>
                      </Label>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Max 100 KB
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Legible color scan of the old paper certificate (PDF/JPG &lt; 100 KB).
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload("oldCertificate", e.target.files?.[0] || null)}
                      className="text-xs cursor-pointer file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:font-semibold"
                    />
                    {uploads.oldCertificate && (
                      <div
                        className={`text-[11px] p-2 rounded-lg flex items-center justify-between ${
                          uploads.oldCertificate.valid
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-destructive/10 text-destructive border border-destructive/20 font-bold"
                        }`}
                      >
                        <span>
                          {uploads.oldCertificate.name} ({uploads.oldCertificate.sizeKb} KB)
                        </span>
                        {uploads.oldCertificate.valid ? (
                          <CheckCircle2 size={13} className="text-emerald-600" />
                        ) : (
                          <AlertTriangle size={13} className="text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-amber-950">
                        Police GD Loss Report Scan <span className="text-destructive">*</span>
                      </Label>
                      <Badge variant="outline" className="text-[10px] font-mono border-amber-400 text-amber-900">
                        Max 200 KB
                      </Badge>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Official stamped copy of Police Station General Diary report of lost certificate.
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload("policeGd", e.target.files?.[0] || null)}
                      className="text-xs cursor-pointer file:rounded-md file:border-0 file:bg-amber-100 file:text-amber-900 file:font-semibold"
                    />
                    {uploads.policeGd && (
                      <div
                        className={`text-[11px] p-2 rounded-lg flex items-center justify-between ${
                          uploads.policeGd.valid
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-destructive/10 text-destructive border border-destructive/20 font-bold"
                        }`}
                      >
                        <span>
                          {uploads.policeGd.name} ({uploads.policeGd.sizeKb} KB)
                        </span>
                        {uploads.policeGd.valid ? (
                          <CheckCircle2 size={13} className="text-emerald-600" />
                        ) : (
                          <AlertTriangle size={13} className="text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Upload 2: Mother's ID Proof (Strict < 50 KB) */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">
                      Mother's Identity Proof Scan <span className="text-destructive">*</span>
                    </Label>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Max 50 KB
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Aadhaar / Voter ID front & back scan (PDF/JPG &lt; 50 KB).
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload("motherId", e.target.files?.[0] || null)}
                    className="text-xs cursor-pointer file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:font-semibold"
                  />
                  {uploads.motherId && (
                    <div
                      className={`text-[11px] p-2 rounded-lg flex items-center justify-between ${
                        uploads.motherId.valid
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-destructive/10 text-destructive border border-destructive/20 font-bold"
                      }`}
                    >
                      <span>
                        {uploads.motherId.name} ({uploads.motherId.sizeKb} KB)
                      </span>
                      {uploads.motherId.valid ? (
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={13} className="text-destructive" />
                      )}
                    </div>
                  )}
                </div>

                {/* Upload 3: Secondary Age Proof for Path B */}
                {digitizationPath === "path_b" && (
                  <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/40 space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-amber-950">
                        Secondary Age Proof (Admit Card / Marksheet / School TC) <span className="text-destructive">*</span>
                      </Label>
                      <Badge variant="outline" className="text-[10px] font-mono border-amber-400 text-amber-900">
                        Max 150 KB
                      </Badge>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Mandated by state rules to establish identity linkage for lost certificates.
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload("secondaryAgeProof", e.target.files?.[0] || null)}
                      className="text-xs cursor-pointer file:rounded-md file:border-0 file:bg-amber-100 file:text-amber-900 file:font-semibold"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Submission Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield size={14} className="text-emerald-600" />
                <span>Zero-Retention Verification: Session files held solely in volatile RAM</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleZeroRetentionPurge}
                  className="rounded-xl text-xs"
                >
                  Clear Form
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl bg-[#0B2545] hover:bg-[#07192f] text-white text-xs font-bold px-6 h-10 gap-2 shadow-sm"
                >
                  <FileCheck size={16} />
                  <span>Generate Pre-Verification Summary Sheet →</span>
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB 2: PRE-VERIFICATION SUMMARY REPORT & PRINT OPTIMIZATION            */}
      {/* ========================================================================= */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* Print Controls Header (Hidden on Print) */}
          <div className="no-print bg-muted/40 p-4 rounded-2xl border border-border/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Pre-Verification Sheet Generated (Form A Standard)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Reference ID: <code className="font-mono font-bold text-primary">{verificationRef}</code> · Issued at Cyber Cafe Node: <strong>{activeNode.name}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("form")}
                className="rounded-xl text-xs"
              >
                ← Edit Form Details
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="rounded-xl bg-primary text-primary-foreground text-xs font-bold gap-1.5 h-9 shadow-xs"
              >
                <Printer size={15} />
                <span>Print Pre-Verification Sheet (A4)</span>
              </Button>
            </div>
          </div>

          {/* =================================================================== */}
          {/* OFFICIAL PRE-VERIFICATION SHEET (CSS PRINT OPTIMIZED)               */}
          {/* =================================================================== */}
          <div className="print-area bg-white text-black p-6 sm:p-8 rounded-2xl border border-gray-300 shadow-sm max-w-4xl mx-auto space-y-6">
            {/* Government Official Header */}
            <div className="text-center border-b-2 border-black pb-4 space-y-1">
              <div className="text-xs uppercase tracking-widest font-semibold text-gray-700">
                Government of West Bengal · Directorate of Health Services & Panchayats
              </div>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight">
                OFFICE OF THE GRAM PANCHAYAT SUB-REGISTRAR (BIRTHS & DEATHS)
              </h2>
              <h3 className="text-base sm:text-lg font-bold text-emerald-900 uppercase">
                {GP_ADMIN_CONTEXT.gramPanchayat.toUpperCase()} GRAM PANCHAYAT, HANSKHALI, NADIA
              </h3>
              <div className="text-xs font-medium">
                Under Section 12/17 of RBD Act, 1969 & Rule 12/13 of West Bengal RBD Rules, 2000
              </div>
              <div className="inline-block bg-black text-white text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wide mt-1">
                Case-I Legacy Birth Certificate Digitization — Pre-Verification Summary Sheet (Form A)
              </div>
            </div>

            {/* Reference Header & Path Badge */}
            <div className="flex items-center justify-between text-xs border-b border-gray-200 pb-2">
              <div>
                <strong>Pre-Verification Ref No:</strong>{" "}
                <span className="font-mono font-bold text-sm">{verificationRef}</span>
              </div>
              <div>
                <strong>Digitization Path:</strong>{" "}
                <span className="font-bold">
                  {digitizationPath === "path_a"
                    ? "PATH A: Original Handwritten Certificate Available"
                    : "PATH B: Lost/Damaged Record (Non-Availability Search & Police GD)"}
                </span>
              </div>
              <div>
                <strong>Generated Date:</strong> {submissionTime}
              </div>
            </div>

            {/* Form A Table of Data */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider bg-gray-100 p-1.5 border border-gray-300">
                1. Digitized Record Particulars (Form A Standard)
              </h4>
              <table className="w-full text-xs border border-gray-300 border-collapse">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="w-1/3 p-2 font-semibold bg-gray-50 border-r border-gray-300">
                      Child Full Name
                    </td>
                    <td className="p-2 font-bold font-mono">
                      {form.childName || "—"}{" "}
                      {form.childNameBn && (
                        <span className="font-bengali font-normal text-gray-700">
                          ({form.childNameBn})
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50 border-r border-gray-300">
                      Gender & Date of Birth
                    </td>
                    <td className="p-2">
                      <strong>Gender:</strong> {form.gender} &nbsp;|&nbsp;{" "}
                      <strong>DOB:</strong> {form.dob || "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50 border-r border-gray-300">
                      Place of Birth
                    </td>
                    <td className="p-2">{form.placeOfBirth || "Bagula II GP Area"}</td>
                  </tr>

                  {digitizationPath === "path_a" ? (
                    <tr className="border-b border-gray-300 bg-emerald-50/40">
                      <td className="p-2 font-semibold bg-gray-50 border-r border-gray-300">
                        Manual Registration Details
                      </td>
                      <td className="p-2">
                        <strong>Reg No:</strong>{" "}
                        <span className="font-mono font-bold">{form.oldRegNo || "—"}</span>{" "}
                        &nbsp;|&nbsp; <strong>Reg Date:</strong> {form.oldRegDate || "—"}
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-b border-gray-300 bg-amber-50/40">
                      <td className="p-2 font-semibold bg-gray-50 border-r border-gray-300">
                        Lost Record Verification
                      </td>
                      <td className="p-2">
                        <strong>Police GD No:</strong>{" "}
                        <span className="font-mono font-bold">{form.policeGdNo || "—"}</span>{" "}
                        &nbsp;|&nbsp; <strong>GD Date:</strong> {form.policeGdDate || "—"} (
                        {form.policeStation})
                      </td>
                    </tr>
                  )}

                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50 border-r border-gray-300">
                      Mother's Name & Identity
                    </td>
                    <td className="p-2">
                      <strong>{form.motherName}</strong> ({form.motherIdType}: {form.motherIdNumber || "Verified"} | Mobile: {form.motherMobile})
                    </td>
                  </tr>

                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-semibold bg-gray-50 border-r border-gray-300">
                      Father's Name & Identity
                    </td>
                    <td className="p-2">
                      {form.fatherName ? (
                        <span>
                          <strong>{form.fatherName}</strong> ({form.fatherIdType}: {form.fatherIdNumber || "Provided"})
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">Not Provided</span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-2 font-semibold bg-gray-50 border-r border-gray-300">
                      Address at Birth
                    </td>
                    <td className="p-2">{form.presentAddress}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Physical Checklist for Citizen Visit */}
            <div className="space-y-2 border-2 border-dashed border-gray-400 p-4 rounded-xl bg-gray-50">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-black">
                <CheckCircle2 size={15} className="text-emerald-700" />
                <span>Physical Documents Citizen Must Carry to Bagula II GP Office:</span>
              </h4>
              <ul className="text-xs space-y-1.5 list-disc pl-5">
                {digitizationPath === "path_a" ? (
                  <li className="font-semibold">
                    Original handwritten paper birth certificate (for ink and paper verification against Volume Register by Sub-Registrar).
                  </li>
                ) : (
                  <li className="font-semibold text-amber-900">
                    Original stamped copy of Police General Diary (GD) Loss Report from Hanskhali Police Station.
                  </li>
                )}
                <li>
                  Original Aadhaar card / Voter ID of Mother (Mandatory).
                </li>
                {form.fatherName && <li>Original Aadhaar card / Voter ID of Father.</li>}
                {digitizationPath === "path_b" && (
                  <li>
                    Secondary Age Proof: Original Class-X Admit Card / Marksheet / School Leaving Certificate.
                  </li>
                )}
                <li>
                  Two (2) colored passport size photographs of the applicant.
                </li>
                <li>
                  This Pre-Verification Sheet (duly signed by Cyber Cafe Operator and Informant).
                </li>
              </ul>
            </div>

            {/* Authorized Signatures & Seal Section */}
            <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="border-t border-black pt-2">
                <div className="h-10" />
                <div className="font-bold">Signature of Informant / Citizen</div>
                <div className="text-[10px] text-gray-600">Date: _______________</div>
              </div>

              <div className="border-t border-black pt-2">
                <div className="h-10" />
                <div className="font-bold">{activeNode.operatorName}</div>
                <div className="text-[10px] text-gray-700 font-semibold">{activeNode.name}</div>
                <div className="text-[10px] text-gray-600 font-mono">CSC ID: {activeNode.cscId}</div>
              </div>

              <div className="border-t border-black pt-2">
                <div className="h-10" />
                <div className="font-bold">{GP_ADMIN_CONTEXT.subRegistrar}</div>
                <div className="text-[10px] text-gray-700 font-semibold">
                  GP Sub-Registrar & Pradhan
                </div>
                <div className="text-[10px] text-gray-600">Bagula II Gram Panchayat</div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-[10px] text-gray-500 text-center border-t border-gray-200 pt-3">
              This is a decentralized pre-verification summary sheet under the West Bengal Directorate of Health Services SBHI SOP Case-I. Final digital signature and JMTP entry are exclusively performed by the Bagula II GP Sub-Registrar.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB 3: BENGALI PHONETIC NAME SEARCH SANDBOX (pg_trgm FUZZY SIMULATOR)  */}
      {/* ========================================================================= */}
      {activeTab === "sandbox" && (
        <div className="p-5 rounded-2xl border border-border/80 bg-background space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Search size={16} className="text-primary" />
              <span>Historical Manual Register Fuzzy Search Sandbox (PostgreSQL pg_trgm)</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Simulates how the Gram Panchayat Sub-Registrar searches legacy handwritten paper volumes (1970–2015) using trigram fuzzy phonetic matching. Test English or Bengali spellings to find historical matches.
            </p>
          </div>

          {/* Search Box */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search citizen or parent name (e.g. Ganesh Pramanik, গণেশ প্রামাণিক, Subir Biswas)..."
                className="pl-9 h-11 text-sm font-medium"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setSearchQuery("Nagari Pramanik")}
              variant="outline"
              className="text-xs"
            >
              Test "Nagari Pramanik"
            </Button>
            <Button
              size="sm"
              onClick={() => setSearchQuery("সুবীর বিশ্বাস")}
              variant="outline"
              className="text-xs font-bengali"
            >
              বাংলায় পরীক্ষা
            </Button>
          </div>

          {/* Results Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Matching Historical Register Entries for: <strong>"{searchQuery}"</strong>
              </span>
              <span>{fuzzyResults.length} potential volume records found</span>
            </div>

            {fuzzyResults.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/60">
                No phonetic match found above threshold (20%). Try typing a variation of the name.
              </div>
            ) : (
              <div className="grid gap-3">
                {fuzzyResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-border/80 bg-muted/10 hover:bg-muted/20 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {result.name}
                        </span>
                        <span className="font-bengali text-xs text-muted-foreground">
                          ({result.name_bn})
                        </span>
                        <Badge
                          className={`text-[10px] ${
                            result.matchPercentage >= 80
                              ? "bg-emerald-600 text-white"
                              : result.matchPercentage >= 50
                              ? "bg-amber-600 text-white"
                              : "bg-slate-600 text-white"
                          }`}
                        >
                          {result.matchPercentage}% Phonetic Match
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <strong>Father:</strong> {result.father} · <strong>Mother:</strong>{" "}
                        {result.mother} · <strong>DOB:</strong> {result.dob}
                      </div>
                      <div className="text-[11px] text-primary/80 font-mono">
                        Village: {result.village} · Manual Reg: {result.regNo} (Dated: {result.regDate})
                      </div>
                    </div>

                    <div className="bg-background p-3 rounded-lg border border-border/60 text-xs text-right space-y-1 shrink-0">
                      <div className="font-bold text-emerald-800">
                        {result.volume}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {result.folio}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            childName: result.name,
                            childNameBn: result.name_bn,
                            fatherName: result.father,
                            motherName: result.mother,
                            dob: result.dob,
                            oldRegNo: result.regNo,
                            oldRegDate: result.regDate,
                            placeOfBirth: `${result.village}, Nadia`,
                          }));
                          setActiveTab("form");
                          toast.success(
                            `Pre-filled Form A from ${result.volume} (${result.folio})`
                          );
                        }}
                        className="text-[10px] h-7 px-2.5 mt-1"
                      >
                        Copy to Form A →
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB 4: CYBER CAFE NODE AUTHENTICATION SIMULATOR                        */}
      {/* ========================================================================= */}
      {activeTab === "operator" && (
        <div className="max-w-xl mx-auto p-6 rounded-2xl border border-border/80 bg-background space-y-6 shadow-xs">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <Shield size={24} />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Cyber Cafe Node & Operator Login
            </h3>
            <p className="text-xs text-muted-foreground">
              Decentralized pre-verification terminal for authorized Bagula-II cyber cafes.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Registered Cyber Cafe Node</Label>
              <select
                value={selectedNodeId}
                onChange={(e) => {
                  setSelectedNodeId(e.target.value);
                  const node = CYBER_CAFE_NODES.find((n) => n.id === e.target.value);
                  if (node) {
                    setOperatorMobile(node.phone.replace(/\D/g, "").slice(-10));
                  }
                }}
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm font-medium"
              >
                {CYBER_CAFE_NODES.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name} (CSC ID: {node.cscId} — {node.operatorName})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Registered Operator Mobile</Label>
              <Input
                value={operatorMobile}
                onChange={(e) => setOperatorMobile(e.target.value)}
                placeholder="10-digit mobile"
                maxLength={10}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Operator 6-Digit OTP</Label>
                <button
                  type="button"
                  onClick={() => {
                    setOtpValue("928374");
                    toast.success("Test OTP auto-filled: 928374");
                  }}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Quick Fill Test OTP (928374)
                </button>
              </div>
              <Input
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                placeholder="Enter 6-digit OTP (e.g. 928374)"
                maxLength={6}
                className="font-mono text-center tracking-widest text-lg font-bold"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-[#0B2545] hover:bg-[#07192f] text-white text-xs font-bold rounded-xl"
            >
              Authenticate Node Session
            </Button>
          </form>

          {/* Current Node Metadata */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/60 text-xs space-y-2">
            <div className="font-bold text-foreground">Node Details:</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <strong>Operator:</strong> {activeNode.operatorName}
              </div>
              <div>
                <strong>CSC ID:</strong> <code className="font-mono">{activeNode.cscId}</code>
              </div>
              <div className="col-span-2">
                <strong>Location:</strong> {activeNode.location}
              </div>
              <div className="col-span-2">
                <strong>Contact:</strong> {activeNode.phone}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TAB 5: SOP GUIDELINES & STATUTORY CHECKLIST                            */}
      {/* ========================================================================= */}
      {activeTab === "sop" && (
        <div className="p-6 rounded-2xl border border-border/80 bg-background space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              West Bengal SBHI Case-I Digitization SOP & Statutory Guidelines
            </h3>
            <p className="text-xs text-muted-foreground">
              Guidelines issued by the Directorate of Health Services, Government of West Bengal for legacy birth records.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 text-xs leading-relaxed">
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <h4 className="font-bold text-sm text-foreground">
                Path A: Legible Manual Record Flow
              </h4>
              <p>
                1. <strong>Verification of Physical Certificate:</strong> Operator checks physical copy for paper watermark, ink consistency, registration number, and official seal of Bagula II GP.
              </p>
              <p>
                2. <strong>Field Mapping:</strong> All names must match official spelling on parents' Aadhaar.
              </p>
              <p>
                3. <strong>File Size Caps:</strong> Certificate scan cannot exceed 100 KB; Mother's ID cannot exceed 50 KB.
              </p>
              <p>
                4. <strong>Office Visit:</strong> Citizen submits summary sheet and original certificate to GP office.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 space-y-2 text-amber-950">
              <h4 className="font-bold text-sm text-amber-900">
                Path B: Lost / Damaged Record Flow
              </h4>
              <p>
                1. <strong>Police General Diary (GD):</strong> Informant must lodge a General Diary at Hanskhali Police Station citing loss of handwritten certificate.
              </p>
              <p>
                2. <strong>Non-Availability Search:</strong> Registration number is marked "Not Available", prompting the Sub-Registrar to verify against manual paper volume registers.
              </p>
              <p>
                3. <strong>Secondary Age Proof:</strong> School admit card, marksheet, or hospital discharge record is required.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-blue-900">
              <Info size={15} />
              <span>May 2026 State Re-Verification Mandate</span>
            </h4>
            <p>
              Under active government guidelines, all digitized manual records issued prior to 2016 are subject to physical register re-verification. The citizen must present the physical summary sheet at the Gram Panchayat office so the Sub-Registrar can pull up the record, match the ink, and digitally sign the QR-enabled certificate on the official state portal (janmamrityutathya.wb.gov.in).
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. TAB 6: OFFICIAL BLANK / RAW A4 PRINT COMPONENT                         */}
      {/* ========================================================================= */}
      {activeTab === "raw_a4" && (
        <div className="space-y-4">
          <div className="bg-muted/40 p-4 rounded-xl border border-border/60 flex items-center justify-between">
            <div className="text-xs">
              <div className="font-bold">Official Form A Blank / Fillable Sheet</div>
              <p className="text-muted-foreground">
                You can print blank A4 copies for walk-in citizens or physical counter filling.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl bg-primary text-primary-foreground text-xs font-bold gap-1.5"
            >
              <Printer size={14} />
              <span>Print Sheet</span>
            </Button>
          </div>

          <BirthDigitizationFormPrint />
        </div>
      )}
    </div>
  );
}
