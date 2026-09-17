import { useState } from "react";
import {
  ExternalLink,
  FileText,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Search,
  FileCheck,
  HelpCircle,
  Check,
  Info,
  ArrowRight,
  UserCheck,
  Building2,
  Sparkles,
  Download,
  Target,
  GitBranch,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { GoBackButton } from "@/components/GoBackButton";
import { ExternalRedirectModal } from "@/components/ExternalRedirectModal";
import { getRedirectGuide, type RedirectGuide } from "@/data/redirectGuides";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UnmarriedDeclarationModal } from "@/components/wbpms/UnmarriedDeclarationModal";
import { ScRelationTreeModal } from "@/components/wbpms/ScRelationTreeModal";
import { CertificatePurposeGuide } from "@/components/wbpms/CertificatePurposeGuide";

interface ServiceItem {
  id: string;
  name: string;
  bengaliName: string;
  guideKey: string;
  icon: string;
  desc: string;
  specificDoc: string;
  bestFor: string;
  tag: string;
  purposes: string[];
}

const services: ServiceItem[] = [
  {
    id: "residential",
    name: "Residential Certificate",
    bengaliName: "আবাসিক শংসাপত্র (বাসস্থানের প্রমাণ)",
    guideKey: "wbpms-residential",
    icon: "🏠",
    desc: "Proof of permanent or ordinary residence within Bagula II Gram Panchayat jurisdiction.",
    specificDoc: "Proof of address (Electricity bill, Ration Card, or Aadhaar) + Gram Sansad member certificate + Land/Tax receipt.",
    bestFor: "School admissions, scholarship schemes, gas connections, voter enlistment.",
    tag: "Most Requested",
    purposes: [
      "School & College Admission under local residential quota",
      "Digital Ration Card (NFSA/RKSY) address update & transfer",
      "Passport Application & Regional Passport Office (RPO) verification",
      "New WBSEDCL domestic/commercial electricity connection",
      "Bank / Post Office Savings Account KYC compliance",
    ],
  },
  {
    id: "character",
    name: "Character Certificate",
    bengaliName: "চারিত্রিক শংসাপত্র",
    guideKey: "wbpms-character",
    icon: "📋",
    desc: "Official attestation of good moral character and conduct issued by the GP Pradhan.",
    specificDoc: "Identity proof (Aadhaar / Voter Card) + Gram Sansad Member character certificate + clear conduct record.",
    bestFor: "Police verification, government job appointments, defense rallies, passport clearance.",
    tag: "Employment",
    purposes: [
      "Police verification & DIB enquiry for State/Central Govt jobs",
      "Indian Army Agniveer, Navy & Air Force open recruitment rally",
      "West Bengal Police (WBPRB) Constable & SI recruitment",
      "Private Security Agency & PSU employment appointment check",
      "State / Central University hostel admission verification",
    ],
  },
  {
    id: "income",
    name: "Income Certificate",
    bengaliName: "বার্ষিক আয়ের শংসাপত্র",
    guideKey: "wbpms-income",
    icon: "💰",
    desc: "Annual family income declaration certificate issued after local Panchayat assessment.",
    specificDoc: "Proof of income (Salary slip, IT return, or income affidavit) + Land record / Tax receipt + Gram Sansad certificate.",
    bestFor: "Oasis, SVMCM, Aikyashree scholarships, fee concessions, welfare schemes.",
    tag: "Scholarships",
    purposes: [
      "Oasis Scholarship (SC/ST/OBC Pre-Matric & Post-Matric)",
      "Swami Vivekananda Merit-cum-Means (SVMCM) scholarship",
      "Aikyashree & Kanyashree K3 financial assistance",
      "Economically Weaker Section (EWS) certificate processing at SDO Ranaghat",
      "Banglar Bari / PMAY rural housing scheme income eligibility",
    ],
  },
  {
    id: "same-person",
    name: "Same Person Certificate",
    bengaliName: "একই ব্যক্তি শংসাপত্র",
    guideKey: "wbpms-same-person",
    icon: "🧑",
    desc: "Official verification that two or more differing names or spelling variations belong to the same person.",
    specificDoc: "Documents showing both name spellings (e.g. Aadhaar vs. Voter Card) + Gram Sansad member attestation.",
    bestFor: "Banking mismatches, land registration, exam board corrections, pension files.",
    tag: "Name Correction",
    purposes: [
      "Aadhaar card spelling vs. EPIC Voter ID name discrepancy",
      "Madhyamik / HS Board Exam Admit Card name correction",
      "Bank Account KYC & deceased legal heir / nominee claim settlement",
      "Land Deed (Dalil) vs. Porcha / RoR mutation title harmonization",
      "Pension Payment Order (PPO) & family pension nominee corrections",
    ],
  },
  {
    id: "distance",
    name: "Distance Certificate",
    bengaliName: "দূরত্বের শংসাপত্র",
    guideKey: "wbpms-distance",
    icon: "📏",
    desc: "Certifies distance in kilometers from residence in Bagula II GP to an educational institution or workplace.",
    specificDoc: "Residential proof + Gram Sansad member certificate specifying distance & route landmarks.",
    bestFor: "Student bus/train travel concessions, school distance quotas, employee travel allowances.",
    tag: "Education & Travel",
    purposes: [
      "Eastern Railway Monthly Season Ticket (MST) student concession at Bagula Station",
      "School & College admission under neighborhood distance radius quota",
      "Employee monthly conveyance allowance / House Rent Allowance (HRA)",
      "Government service transfer application on proximity / travel hardship ground",
    ],
  },
  {
    id: "caste",
    name: "Caste Authentication",
    bengaliName: "জাতিগত প্রমাণীকরণ শংসাপত্র",
    guideKey: "wbpms-caste",
    icon: "🏷️",
    desc: "Preliminary caste verification required before submitting application for SDO/BDO SC/ST/OBC certificate.",
    specificDoc: "MANDATORY: Family members' caste proofs MERGED INTO A SINGLE PDF (<2MB) + Gram Sansad Vamshabriksha.",
    bestFor: "Applying for official digital SC, ST, or OBC certificate through SDO Ranaghat.",
    tag: "Mandatory PDF Merge",
    purposes: [
      "Online application for Digital SC/ST/OBC certificate via castewestbengal.gov.in / SDO Ranaghat",
      "Paternal genealogical linkage (Vamshabriksha) authentication from existing SC/ST card holder",
      "Oasis Scholarship provisional social category authentication",
      "Academic admission quota reservation validation",
    ],
  },
  {
    id: "unmarried",
    name: "Unmarried Certificate",
    bengaliName: "অবিবাহিত শংসাপত্র",
    guideKey: "wbpms-unmarried",
    icon: "💍",
    desc: "Official attestation confirming unmarried/single marital status of the applicant.",
    specificDoc: "Age proof (Class-X Admit Card or Birth Certificate) + Gram Sansad member unmarried declaration.",
    bestFor: "Indian Army Agniveer rallies, paramilitary recruitment, foreign visa documentation.",
    tag: "Defense Recruitment",
    purposes: [
      "Indian Army Agniveer recruitment rally document screening (Barrackpore / Kalyani)",
      "Paramilitary Forces (BSF, CISF, CRPF, SSB, ITBP) recruitment joining",
      "West Bengal Police Constable & Sub-Inspector pre-joining document verification",
      "Rupashree Prakalpa pre-marriage verification under Women & Child Development Dept",
      "Special Marriage Act, 1954 30-day statutory notice publication clearance",
      "Single Status / Bachelorhood affidavit for foreign student/work visas",
    ],
  },
];

const identityDocs = [
  "Aadhaar Card",
  "Passport",
  "Driving License",
  "Election Commission Voter ID Card",
  "Ration Card with address",
  "CGHS/ECHS Card",
  "Certificate of address with photo from Govt. recognized educational institutions (for students only)",
  "Income Tax PAN Card",
  "Current passbook of Post Office/any scheduled bank having photo",
  "Photo Identity Card (of Central Govt./PSU or State Govt./PSU only)",
  "MGNREGA card issued by Govt.",
  "Photo Identity Card issued by Govt. recognized educational institutions (for students only)",
  "Pensioner Card having photo and Address",
  "Kissan Passbook having photo and Address",
  "Current Financial Year Tax receipt",
  "Other Documents related to desired certificate should be followed,may be modified if required!",
];

const applicationSteps = [
  {
    number: "01",
    title: "Document Preparation",
    bengaliTitle: "নথি প্রস্তুত করুন",
    desc: "Prepare 1 passport photograph in JPG (<100 KB) and 2 identity/address documents in PDF (<2 MB each). Obtain local Gram Sansad certificate.",
  },
  {
    number: "02",
    title: "Login via Mobile OTP",
    bengaliTitle: "মোবাইল ওটিপি দিয়ে লগইন",
    desc: "Access wbpms.in/citizen/, enter your active Indian mobile number, and authenticate with the 4-digit SMS OTP.",
  },
  {
    number: "03",
    title: "Select Bagula II GP Jurisdiction",
    bengaliTitle: "বাগুলা ২ নং গ্রাম পঞ্চায়েত নির্বাচন",
    desc: "Choose District: Nadia -> Block: Hanskhali -> Gram Panchayat: Bagula II (বাগুলা ২ নং গ্রাম পঞ্চায়েত) and your Sansad/Ward.",
  },
  {
    number: "04",
    title: "Upload & Receive Acknowledgement",
    bengaliTitle: "আপলোড ও রসিদ সংগ্রহ",
    desc: "Attach your JPG photo and PDFs. Submit the form to receive an official Acknowledgement Slip with a unique Tracking Number.",
  },
  {
    number: "05",
    title: "GP Scrutiny & QR Download",
    bengaliTitle: "যাচাই ও ডিজিটাল সার্টিফিকেট ডাউনলোড",
    desc: "The GP Sub-Registrar / Pradhan verifies your details within 7 working days. Download the QR-enabled certificate online.",
  },
];

export default function WbpmsInfo() {
  const [redirectGuide, setRedirectGuide] = useState<RedirectGuide | null>(null);
  const [redirectModalOpen, setRedirectModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocFilter, setSelectedDocFilter] = useState("");

  // Specialized modals for Unmarried Declaration, SC Relation Tree, and Certificate Purposes
  const [unmarriedModalOpen, setUnmarriedModalOpen] = useState(false);
  const [scRelationModalOpen, setScRelationModalOpen] = useState(false);
  const [purposeGuideOpen, setPurposeGuideOpen] = useState(false);
  const [purposeGuideServiceId, setPurposeGuideServiceId] = useState("residential");

  // File validator state for cyber cafe / citizen pre-check
  const [testFileType, setTestFileType] = useState<"photo" | "doc">("photo");
  const [fileCheckResult, setFileCheckResult] = useState<{
    fileName: string;
    sizeKb: number;
    isValid: boolean;
    format: string;
    message: string;
  } | null>(null);

  const openGuide = (key: string) => {
    setRedirectGuide(getRedirectGuide(key));
    setRedirectModalOpen(true);
  };

  const filteredServices = services.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.bengaliName.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q) ||
      s.bestFor.toLowerCase().includes(q)
    );
  });

  const filteredDocs = identityDocs.filter((doc) =>
    selectedDocFilter ? doc.toLowerCase().includes(selectedDocFilter.toLowerCase()) : true,
  );

  const handleFileTest = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKb = Math.round(file.size / 1024);
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    if (testFileType === "photo") {
      const isJpg = ext === "jpg" || ext === "jpeg";
      const isSizeOk = sizeKb <= 100;
      const isValid = isJpg && isSizeOk;
      let message = "";
      if (!isJpg && !isSizeOk) {
        message = "File is NOT JPG format and exceeds 100 KB limit. WBPMS portal will reject it.";
      } else if (!isJpg) {
        message = "Format must be JPG only. PNG/WebP files will fail submission on WBPMS.";
      } else if (!isSizeOk) {
        message = `File size is ${sizeKb} KB, which exceeds the max 100 KB limit. Please compress it.`;
      } else {
        message = `✓ Perfect! Valid JPG photograph (${sizeKb} KB <= 100 KB limit). Ready for upload on WBPMS.`;
      }

      setFileCheckResult({
        fileName: file.name,
        sizeKb,
        isValid,
        format: ext.toUpperCase(),
        message,
      });
    } else {
      const isPdf = ext === "pdf";
      const isSizeOk = sizeKb <= 2048;
      const isValid = isPdf && isSizeOk;
      let message = "";
      if (!isPdf && !isSizeOk) {
        message = "Document must be PDF format and under 2 MB (2048 KB).";
      } else if (!isPdf) {
        message = "Format must be PDF only. Images or Word files cannot be uploaded in document slots.";
      } else if (!isSizeOk) {
        message = `File size is ${(sizeKb / 1024).toFixed(1)} MB, exceeding the 2 MB limit. Please compress your PDF.`;
      } else {
        message = `✓ Perfect! Valid PDF document (${sizeKb} KB <= 2 MB limit). Ready for WBPMS submission.`;
      }

      setFileCheckResult({
        fileName: file.name,
        sizeKb,
        isValid,
        format: ext.toUpperCase(),
        message,
      });
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-4 py-8">
      <Helmet>
        <title>WBPMS Certificate Services — Bagula II Gram Panchayat</title>
        <meta
          name="description"
          content="Official document requirements, video tutorials, and guidelines for WBPMS certificate services solely for Bagula 2 No Gram Panchayat."
        />
        <link rel="canonical" href="https://deo-workflow-helper.lovable.app/wbpms-info" />
      </Helmet>

      <GoBackButton fallbackUrl="/" className="mb-4 -ml-2" />

      {/* Bagula 2 No Gram Panchayat Jurisdiction & Administrative Authority Banner */}
      <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-background border border-primary/30 rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm font-bold text-lg">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wide">
                  Bagula 2 No GP Authority
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  State: West Bengal • District: Nadia • Block: Hanskhali
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Bagula 2 No Gram Panchayat — WBPMS Citizen e-Services
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                বাগুলা ২ নং গ্রাম পঞ্চায়েত এলাকার সমস্ত বাসিন্দাদের জন্য পঞ্চায়েত ও গ্রামোন্নয়ন দপ্তরের (WBPMS) অনলাইন সার্টিফিকেট নির্দেশিকা
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => openGuide("wbpms-general")}
              className="gap-1.5 text-xs font-semibold h-8"
            >
              Apply on WBPMS <ExternalLink size={13} />
            </Button>
            <a
              href="https://wbpms.in/citizen/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 underline underline-offset-2"
            >
              wbpms.in/citizen <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* 4 Official WBPMS Parameter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-primary/15 text-xs">
          <div className="bg-background/80 rounded-lg p-2.5 border">
            <span className="text-muted-foreground block text-[11px]">Processing Fee</span>
            <span className="font-bold text-emerald-600 text-sm flex items-center gap-1">
              <CheckCircle2 size={13} /> ₹0 (Free of Cost)
            </span>
            <span className="text-[10px] text-muted-foreground">সম্পূর্ণ বিনামূল্যে</span>
          </div>
          <div className="bg-background/80 rounded-lg p-2.5 border">
            <span className="text-muted-foreground block text-[11px]">Processing Timeline</span>
            <span className="font-bold text-foreground text-sm flex items-center gap-1">
              <Clock size={13} className="text-primary" /> ~7 Working Days
            </span>
            <span className="text-[10px] text-muted-foreground">৭ কার্যদিবসের মধ্যে</span>
          </div>
          <div className="bg-background/80 rounded-lg p-2.5 border">
            <span className="text-muted-foreground block text-[11px]">Certificate Validity</span>
            <span className="font-bold text-foreground text-sm flex items-center gap-1">
              <ShieldCheck size={13} className="text-blue-600" /> 6 Months
            </span>
            <span className="text-[10px] text-muted-foreground">QR কোড ও ডিজিটাল সই যুক্ত</span>
          </div>
          <div className="bg-background/80 rounded-lg p-2.5 border">
            <span className="text-muted-foreground block text-[11px]">Issuing Authority</span>
            <span className="font-bold text-foreground text-xs truncate block">
              GP Pradhan / EA
            </span>
            <span className="text-[10px] text-muted-foreground">বাগুলা ২ নং পঞ্চায়েত</span>
          </div>
        </div>
      </div>

      {/* Main Heading */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground border-l-4 border-saffron pl-3">
          WBPMS Certificate Services — Document Requirements
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review requirements, watch step-by-step video tutorials, and prepare documents before applying on the West Bengal Parichay e-Governance Portal.
        </p>
      </div>

      {/* Search Bar for 7 Certificate Services */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground font-heading flex items-center gap-2">
            Available Certificate Services
            <Badge variant="outline" className="text-xs">
              7 Official Certificates
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground">
            Select a certificate to view video tutorial, dedicated checklist, and direct portal application guide
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search certificate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* WBPMS Specialized Tools: Purpose Guide, Unmarried Declaration, SC Paternal Lineage */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {/* Tool 1: Purpose of Each Certificate */}
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 hover:border-primary/60 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                <Target size={15} />
              </div>
              <h3 className="font-bold text-sm text-foreground">Purpose of Each Certificate</h3>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Official recognized purposes for WBPMS application forms. View required evidence and copy exact text to avoid rejection.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1 font-semibold text-primary hover:bg-primary hover:text-white"
            onClick={() => {
              setPurposeGuideServiceId("residential");
              setPurposeGuideOpen(true);
            }}
          >
            <Target size={12} /> Explore All Purposes & Copy Text
          </Button>
        </div>

        {/* Tool 2: Member Declaration for Unmarried */}
        <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 hover:border-emerald-500 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                <UserCheck size={15} />
              </div>
              <h3 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                Member Declaration for Unmarried
              </h3>
            </div>
            <p className="text-[11px] text-emerald-900/80 dark:text-emerald-400 leading-relaxed mb-3">
              Mandatory Gram Sansad Member (Sansad 1–18) declaration certifying bachelorhood/unmarried status for Army rallies & govt posts.
            </p>
          </div>
          <Button
            size="sm"
            className="text-xs h-7 gap-1 font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
            onClick={() => setUnmarriedModalOpen(true)}
          >
            <FileCheck size={12} /> Open & Print Member Declaration
          </Button>
        </div>

        {/* Tool 3: SC/ST Paternal Relation Tree */}
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 hover:border-amber-500 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                <GitBranch size={15} />
              </div>
              <h3 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                SC Relation System (Existing Card)
              </h3>
            </div>
            <p className="text-[11px] text-amber-900/80 dark:text-amber-400 leading-relaxed mb-3">
              Show unbroken paternal bloodline (Father, Grandfather, Brother, Uncle) from existing SC/ST holder with Vamshabriksha sheet.
            </p>
          </div>
          <Button
            size="sm"
            className="text-xs h-7 gap-1 font-semibold bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => setScRelationModalOpen(true)}
          >
            <GitBranch size={12} /> Generate Paternal Relation Tree
          </Button>
        </div>
      </div>

      {/* 7 Services Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {filteredServices.map((s) => (
          <div
            key={s.id}
            className="gov-card p-4 hover:shadow-md transition flex flex-col justify-between group border border-border/80 hover:border-primary/50 relative overflow-hidden"
          >
            {s.tag && (
              <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {s.tag}
              </span>
            )}
            <div>
              <div className="text-3xl mb-2">{s.icon}</div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-1">
                {s.name}
              </h3>
              <p className="text-[11px] font-medium text-primary mb-2">{s.bengaliName}</p>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{s.desc}</p>

              {/* Specific Requirement */}
              <div className="bg-muted/40 rounded p-2.5 text-[11px] space-y-1.5 mb-2.5 border">
                <div className="text-foreground font-semibold flex items-center gap-1 text-[11px]">
                  <FileCheck size={12} className="text-primary shrink-0" /> Specific Requirement:
                </div>
                <p className="text-muted-foreground text-[11px] leading-snug">
                  {s.specificDoc}
                </p>
              </div>

              {/* Official Purposes Block */}
              <div className="bg-primary/5 rounded p-2.5 text-[11px] space-y-1.5 mb-3 border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-semibold flex items-center gap-1 text-[11px]">
                    <Target size={12} className="text-primary shrink-0" /> Purpose of Certificate:
                  </span>
                  <button
                    type="button"
                    className="text-[10px] text-primary hover:underline font-semibold"
                    onClick={() => {
                      setPurposeGuideServiceId(s.id);
                      setPurposeGuideOpen(true);
                    }}
                  >
                    View All & Copy
                  </button>
                </div>
                <ul className="text-muted-foreground text-[10px] space-y-1 pl-3.5 list-disc">
                  {s.purposes.slice(0, 3).map((purp, pIdx) => (
                    <li key={pIdx} className="leading-tight">
                      {purp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 border-t mt-auto flex flex-col gap-2">
              {/* Dedicated action button for Unmarried or Caste */}
              {s.id === "unmarried" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-[11px] h-7 gap-1 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
                  onClick={() => setUnmarriedModalOpen(true)}
                >
                  <UserCheck size={12} /> Member Declaration Form (অবিবাহিত)
                </Button>
              )}

              {s.id === "caste" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-[11px] h-7 gap-1 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 font-semibold"
                  onClick={() => setScRelationModalOpen(true)}
                >
                  <GitBranch size={12} /> SC Relation Tree & Lineage (বংশতালিকা)
                </Button>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-[10px] text-primary hover:underline font-medium text-left truncate max-w-[130px]"
                  onClick={() => {
                    setPurposeGuideServiceId(s.id);
                    setPurposeGuideOpen(true);
                  }}
                >
                  🎯 All Purposes
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition shrink-0"
                  onClick={() => openGuide(s.guideKey)}
                >
                  View Guide <ArrowRight size={12} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Requirements at Submission (Exact WBPMS Technical Specification) */}
      <div className="gov-card p-5 sm:p-6 mb-8 border-t-4 border-t-primary">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="text-lg font-bold text-foreground font-heading flex items-center gap-2">
            <Upload size={20} className="text-primary" /> Upload Requirements at Submission
          </h3>
          <Badge variant="secondary" className="text-xs font-mono">
            WBPMS Technical Standards
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {/* Photograph */}
          <div className="bg-muted/40 rounded-xl p-4 border space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-saffron/20 text-saffron flex items-center justify-center">
                <Camera size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Passport-Size Photograph</h4>
                <span className="text-[11px] text-muted-foreground">পাসপোর্ট সাইজের রঙিন ছবি</span>
              </div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 pt-1">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>• Format: <strong className="text-foreground">JPG</strong> only (JPEG/PNG will be rejected)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>• Maximum size: <strong className="text-foreground">100 KB</strong> (Optimal: 40–80 KB)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>• Recent color photograph with clean face & light background</span>
              </li>
            </ul>
          </div>

          {/* Identity & Address Proofs */}
          <div className="bg-muted/40 rounded-xl p-4 border space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Identity & Address Documents</h4>
                <span className="text-[11px] text-muted-foreground">পরিচয় ও ঠিকানার প্রমাণপত্র</span>
              </div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 pt-1">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>• Upload: <strong className="text-foreground">Any 2 documents</strong> from the accepted list below</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>• Format: <strong className="text-foreground">PDF</strong> only</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>• Maximum size: <strong className="text-foreground">2 MB each</strong> (2048 KB)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Special Requirement: Caste Authentication & Paternal Relation System */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <GitBranch size={22} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-sm text-amber-900 dark:text-amber-300">
                  ⚠️ Special Requirement — Caste Authentication: Paternal Relation System & Merge Rule
                </h4>
                <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-800 dark:text-amber-300">
                  WB SC/ST Act 1994
                </Badge>
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-400 mt-1.5 leading-relaxed">
                Under the West Bengal Scheduled Castes and Scheduled Tribes (Identification) Act, 1994, the <strong>relation system from the existing SC/ST card holder must be shown through an unbroken paternal family tree (বংশতালিকা - Vamshabriksha)</strong>. Only paternal blood relatives (<strong className="text-amber-950 dark:text-amber-200">Father, Real Brother, Paternal Grandfather, Paternal Uncle, or Paternal Cousin</strong>) are legally valid. Maternal bloodlines are strictly invalid and will result in permanent rejection.
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-400 mt-1 leading-relaxed">
                <strong>Mandatory Single PDF Merge:</strong> The existing card copy and the Gram Sansad Member's certified Vamshabriksha must be merged into <strong>ONE single PDF file (&lt;2 MB)</strong> before uploading to WBPMS.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="text-xs h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  onClick={() => setScRelationModalOpen(true)}
                >
                  <GitBranch size={13} /> Open Paternal Relation Tree & Lineage Generator
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 gap-1.5 border-amber-400 text-amber-900 dark:text-amber-300 hover:bg-amber-100"
                  onClick={() => {
                    setPurposeGuideServiceId("caste");
                    setPurposeGuideOpen(true);
                  }}
                >
                  <Target size={13} /> Caste Application Purpose Guide
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate by Gram Sansad Member & Unmarried Declaration */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <UserCheck size={22} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-300">
                  📝 Certificate Issued by Gram Sansad Member (Sansad 1 to 18)
                </h4>
                <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-800 dark:text-emerald-300">
                  Local Ward Endorsement
                </Badge>
              </div>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-400 mt-1.5 leading-relaxed">
                A certificate issued by the concerned Gram Sansad Member (Sansad 1 to 18) is mandatory to verify local residence at the ward level within Bagula II Gram Panchayat.
              </p>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-400 mt-1 leading-relaxed">
                <strong>Member Declaration for Unmarried Certificate:</strong> For unmarried certificates, a specific declaration by the Gram Sansad Member certifying the applicant's age and confirming that they are unmarried (no subsisting or previous marriage) is strictly mandatory for Army rally and defense recruitment verification.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="text-xs h-8 gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                  onClick={() => setUnmarriedModalOpen(true)}
                >
                  <UserCheck size={13} /> Open Unmarried Member Declaration (অবিবাহিত প্রত্যয়ন)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 gap-1.5 border-emerald-400 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100"
                  onClick={() => {
                    setPurposeGuideServiceId("unmarried");
                    setPurposeGuideOpen(true);
                  }}
                >
                  <Target size={13} /> Unmarried Purpose Guide & Text
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Submission File Validator (Cyber Cafe & Citizen Helper) */}
      <div className="gov-card p-5 sm:p-6 mb-8 border border-primary/30 bg-primary/5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Cyber Cafe & Citizen Pre-Check: File Size & Format Validator
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Check your files before uploading to WBPMS portal
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Prevent server upload errors on wbpms.in by validating your photograph (&lt; 100 KB JPG) or identity proof (&lt; 2 MB PDF) right here.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex rounded-md border bg-background p-1 shrink-0">
            <button
              type="button"
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                testFileType === "photo" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
              onClick={() => {
                setTestFileType("photo");
                setFileCheckResult(null);
              }}
            >
              📷 Test Photograph (JPG &lt;100 KB)
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                testFileType === "doc" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
              onClick={() => {
                setTestFileType("doc");
                setFileCheckResult(null);
              }}
            >
              📄 Test Document (PDF &lt;2 MB)
            </button>
          </div>

          <div className="flex-1">
            <label className="cursor-pointer border-2 border-dashed border-primary/40 hover:border-primary rounded-lg px-4 py-2 flex items-center justify-center gap-2 bg-background hover:bg-muted/50 transition text-xs font-medium text-foreground">
              <Upload size={14} className="text-primary" />
              <span>Select {testFileType === "photo" ? "photo (JPG)" : "document (PDF)"} to test</span>
              <input
                type="file"
                className="hidden"
                accept={testFileType === "photo" ? "image/jpeg,image/jpg" : "application/pdf"}
                onChange={handleFileTest}
              />
            </label>
          </div>
        </div>

        {fileCheckResult && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
              fileCheckResult.isValid
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                : "bg-red-50 border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
            }`}
          >
            {fileCheckResult.isValid ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-bold mb-0.5">
                <span className="truncate">{fileCheckResult.fileName}</span>
                <Badge variant={fileCheckResult.isValid ? "outline" : "destructive"} className="text-[10px] h-4">
                  {fileCheckResult.format} • {fileCheckResult.sizeKb} KB
                </Badge>
              </div>
              <p className="text-[11px] leading-relaxed">{fileCheckResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* 16 Accepted Documents for Address & Identity Verification */}
      <div className="gov-card p-5 sm:p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground font-heading">
              📄 Accepted Documents for Address & Identity Verification
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select any <strong>two</strong> of the following 16 documents to upload (PDF, max 2 MB each):
            </p>
          </div>
          <div className="relative w-full sm:w-56">
            <Search size={13} className="absolute left-2.5 top-2 text-muted-foreground" />
            <Input
              placeholder="Filter 16 documents..."
              value={selectedDocFilter}
              onChange={(e) => setSelectedDocFilter(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2.5">
          {filteredDocs.map((doc, i) => {
            const originalIndex = identityDocs.indexOf(doc);
            const isSpecialLast = originalIndex === 15;
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 text-xs py-2 px-3 rounded-lg border transition ${
                  isSpecialLast
                    ? "bg-amber-500/10 border-amber-400/40 text-amber-900 dark:text-amber-200 font-medium sm:col-span-2"
                    : "bg-muted/30 border-border text-foreground hover:bg-muted/50"
                }`}
              >
                <span
                  className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                    isSpecialLast
                      ? "bg-amber-500 text-white"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {originalIndex + 1}
                </span>
                <span className="leading-snug">{doc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step-by-Step Application Process (WBPMS Workflow) */}
      <div className="gov-card p-5 sm:p-6 mb-8">
        <h3 className="text-lg font-bold text-foreground font-heading mb-1">
          🗺️ Step-by-Step Application Workflow on WBPMS Portal
        </h3>
        <p className="text-xs text-muted-foreground mb-6">
          Follow these 5 systematic steps to successfully register, submit, and download your certificate:
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {applicationSteps.map((step, idx) => (
            <div key={idx} className="p-4 rounded-xl border bg-muted/20 relative space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary text-primary-foreground">
                  Step {step.number}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">{step.bengaliTitle}</span>
              </div>
              <h4 className="font-bold text-sm text-foreground">{step.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
          <div className="p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 flex flex-col justify-center items-center text-center space-y-2">
            <CheckCircle2 size={24} className="text-primary" />
            <h4 className="font-bold text-xs text-foreground">Need Physical Verification?</h4>
            <p className="text-[11px] text-muted-foreground">
              Visit Bagula II GP Office with original documents & Application ID for instant counter verification.
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions (FAQ) for Bagula II GP Residents */}
      <div className="gov-card p-5 sm:p-6 mb-8 space-y-4">
        <h3 className="text-lg font-bold text-foreground font-heading flex items-center gap-2">
          <HelpCircle size={19} className="text-primary" /> Frequently Asked Questions (FAQ)
        </h3>

        <div className="space-y-3 text-xs">
          <div className="border rounded-lg p-3 bg-muted/20">
            <h4 className="font-bold text-foreground mb-1">
              Q: Is there any government fee for applying for WBPMS certificates in Bagula II GP?
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              No. Under the rural e-governance mandate of the Department of Panchayats & Rural Development, Government of West Bengal, applying for certificates (Residential, Income, Character, etc.) is <strong>completely free of cost (বিনামূল্যে)</strong>.
            </p>
          </div>

          <div className="border rounded-lg p-3 bg-muted/20">
            <h4 className="font-bold text-foreground mb-1">
              Q: How can I download my certificate once approved by the Bagula II GP Pradhan?
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Visit <a href="https://wbpms.in/citizen/" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">wbpms.in/citizen/</a>, log in with your registered mobile number, click on "Track Application", and click the "Download Certificate" button. The certificate contains a secure QR code and digital signature.
            </p>
          </div>

          <div className="border rounded-lg p-3 bg-muted/20">
            <h4 className="font-bold text-foreground mb-1">
              Q: What should I do if my application is returned or shows "Clarification Required"?
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Log in to the portal to view the specific reason entered by the Bagula II GP Sub-Registrar. You can re-upload legible scanned copies of your documents or visit the GP office during working hours (10:30 AM to 5:00 PM) with your original documents.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA Action Bar */}
      <div className="text-center bg-gradient-to-r from-primary/10 via-background to-primary/10 border rounded-2xl p-6 sm:p-8 space-y-3">
        <h3 className="text-lg sm:text-xl font-bold font-heading text-foreground">
          Ready to Apply on the West Bengal Parichay e-Governance Portal?
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
          Make sure your photograph (JPG &lt;100 KB) and 2 identity proofs (PDF &lt;2 MB) are ready. Click below to launch video instructions and open the official state portal.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={() => openGuide("wbpms-general")}
            className="gap-2 text-sm font-bold shadow-md"
          >
            View Video Guide & Apply on WBPMS <ExternalLink size={16} />
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="text-sm font-semibold"
          >
            <a href="https://wbpms.in/citizen/" target="_blank" rel="noopener noreferrer">
              Direct Portal: wbpms.in <ExternalLink size={14} className="ml-1.5" />
            </a>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Solely for residents of Bagula 2 No Gram Panchayat, Hanskhali Block, Nadia District.
        </p>
      </div>

      {/* Redirect modal showing video guide, checklist, and safe redirect */}
      <ExternalRedirectModal
        guide={redirectGuide}
        open={redirectModalOpen}
        onOpenChange={setRedirectModalOpen}
      />

      {/* Unmarried Member Declaration Generator & Print Modal */}
      <UnmarriedDeclarationModal
        open={unmarriedModalOpen}
        onOpenChange={setUnmarriedModalOpen}
      />

      {/* SC/ST Paternal Lineage & Relation Tree Generator Modal */}
      <ScRelationTreeModal
        open={scRelationModalOpen}
        onOpenChange={setScRelationModalOpen}
      />

      {/* Purpose of Certificate Interactive Guide & Copy Modal */}
      <CertificatePurposeGuide
        open={purposeGuideOpen}
        onOpenChange={setPurposeGuideOpen}
        initialServiceId={purposeGuideServiceId}
      />
    </div>
  );
}
