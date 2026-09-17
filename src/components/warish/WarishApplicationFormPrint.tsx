import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Download,
  FileText,
  CheckCircle2,
  RefreshCw,
  Eye,
  PenTool,
  Info,
  ShieldCheck,
  Building2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

export interface HeirRow {
  sl: string;
  name: string;
  guardianName: string;
  relation: string;
  age: string;
}

const defaultRows: HeirRow[] = [
  { sl: "১", name: "", guardianName: "", relation: "", age: "" },
  { sl: "২", name: "", guardianName: "", relation: "", age: "" },
  { sl: "৩", name: "", guardianName: "", relation: "", age: "" },
  { sl: "৪", name: "", guardianName: "", relation: "", age: "" },
  { sl: "৫", name: "", guardianName: "", relation: "", age: "" },
  { sl: "৬", name: "", guardianName: "", relation: "", age: "" },
  { sl: "৭", name: "", guardianName: "", relation: "", age: "" },
  { sl: "৮", name: "", guardianName: "", relation: "", age: "" },
  { sl: "৯", name: "", guardianName: "", relation: "", age: "" },
  { sl: "১০", name: "", guardianName: "", relation: "", age: "" },
];

interface WarishApplicationFormData {
  date: string;
  applicantRelation: "পিতা" | "মাতা" | "স্বামী" | "";
  deceasedName: string;
  deceasedGuardianName: string;
  village: string;
  postOffice: string;
  policeStation: string;
  district: string;
  deathDate: string;
  deathPlace: "বাসভবনে" | "হাসপাতালে" | "";
  deathCause: "বার্ধক্য জনিত" | "দুর্ঘটনা জনিত" | "রোগাগ্রস্ত জনিত" | "";
  deathAge: string;
  heirs: HeirRow[];
  applicantSignature: string;
  applicantMobile: string;
  witnesses: { name: string; fatherName: string; mobile: string }[];
}

const initialFormData: WarishApplicationFormData = {
  date: "",
  applicantRelation: "",
  deceasedName: "",
  deceasedGuardianName: "",
  village: "স্টেশন পাড়া",
  postOffice: "বগুলা",
  policeStation: "হাঁসখালী",
  district: "নদীয়া",
  deathDate: "",
  deathPlace: "",
  deathCause: "",
  deathAge: "",
  heirs: defaultRows,
  applicantSignature: "",
  applicantMobile: "",
  witnesses: [
    { name: "", fatherName: "", mobile: "" },
    { name: "", fatherName: "", mobile: "" },
    { name: "", fatherName: "", mobile: "" },
    { name: "", fatherName: "", mobile: "" },
  ],
};

interface WarishApplicationFormPrintProps {
  initialFillMode?: "blank" | "interactive";
  onBack?: () => void;
  showControls?: boolean;
}

export default function WarishApplicationFormPrint({
  initialFillMode = "blank",
  onBack,
  showControls = true,
}: WarishApplicationFormPrintProps) {
  const [fillMode, setFillMode] = useState<"blank" | "interactive">(initialFillMode);
  const [formData, setFormData] = useState<WarishApplicationFormData>(initialFormData);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setFormData(initialFormData);
    toast.info("ফর্মের সমস্ত তথ্য ফাঁকা করা হয়েছে (Form reset)");
  };

  const updateHeirRow = (index: number, field: keyof HeirRow, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.heirs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, heirs: updated };
    });
  };

  const updateWitness = (index: number, field: "name" | "fatherName" | "mobile", value: string) => {
    setFormData((prev) => {
      const updated = [...prev.witnesses];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, witnesses: updated };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden in print) */}
      {showControls && (
        <div className="no-print bg-card/90 backdrop-blur border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary text-primary-foreground text-xs font-semibold">
                  📄 অফিশিয়াল ফর্ম · ফরম্যাট A4
                </Badge>
                <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                  বগুলা ২নং গ্রাম পঞ্চায়েত · হাঁসখালী, নদীয়া
                </Badge>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mt-1">
                আইনগত উত্তরাধিকার শংসাপত্র প্রদানের জন্য আবেদনপত্র
              </h2>
              <p className="text-xs text-muted-foreground">
                Official Physical Application Form for Warish (Legal Heir) Certificate (Mandatory A4 Format)
              </p>
            </div>

            {/* Print & Download Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <Button
                onClick={handlePrint}
                className="flex-1 sm:flex-initial rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm gap-2 shadow-sm"
              >
                <Printer size={16} />
                <span>Print Form (A4) / Download PDF</span>
              </Button>
            </div>
          </div>

          {/* Mode Switcher & Instructions Bar */}
          <div className="pt-3 border-t border-border/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setFillMode("blank")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  fillMode === "blank"
                    ? "bg-white text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PenTool size={13} />
                <span>হাতে লেখার ফাঁকা ফর্ম (Blank Form)</span>
              </button>
              <button
                type="button"
                onClick={() => setFillMode("interactive")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  fillMode === "interactive"
                    ? "bg-white text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText size={13} />
                <span>কম্পিউটারে টাইপ করে প্রিন্ট (Fill Online)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {fillMode === "interactive" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs h-8 rounded-lg text-muted-foreground hover:text-destructive gap-1"
                >
                  <RefreshCw size={12} />
                  <span>Reset Form</span>
                </Button>
              )}
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                <span>Forced 1-Page A4 Portrait Ready</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STYLES FOR FORCED A4 PRINTING */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 15mm 10mm 15mm !important;
        }
        @media print {
          html, body {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 13.5px !important;
            line-height: 1.35 !important;
            font-family: 'Noto Sans Bengali', 'Times New Roman', serif !important;
          }
          /* Hide everything outside of print container */
          body * {
            visibility: hidden;
          }
          #warish-a4-form-container, #warish-a4-form-container * {
            visibility: visible;
          }
          #warish-a4-form-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          /* Ensure crisp black borders */
          .print-border-black {
            border-color: #000 !important;
          }
          .print-table th, .print-table td {
            border-color: #000 !important;
          }
          /* Prevent page break inside the form */
          .page-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* PAPER CANVAS - STRICT A4 DIMENSIONS & REPLICA OF THE OFFICIAL FORM */}
      <div className="flex justify-center">
        <div
          ref={printAreaRef}
          id="warish-a4-form-container"
          className="w-full max-w-[210mm] bg-white text-black p-6 sm:p-10 md:p-12 shadow-md border border-neutral-300 rounded-sm font-bengali leading-relaxed text-[13.5px] sm:text-[14px]"
          style={{ minHeight: "297mm", boxSizing: "border-box" }}
        >
          {/* HEADER SECTION */}
          <div className="flex justify-between items-start pt-1 pb-3">
            {/* Top Left: Panchayat Designation */}
            <div className="space-y-0.5 leading-snug">
              <p className="font-bold text-[15px]">প্রধান,</p>
              <p className="font-bold text-[15px]">বগুলা ২নং গ্রাম পঞ্চায়েত</p>
              <p className="text-[13.5px]">গ্রাম- স্টেশন পাড়া, ডাকঘর- বগুলা</p>
              <p className="text-[13.5px]">থানা- হাঁসখালী, জেলা- নদীয়া</p>
            </div>

            {/* Top Right: Date */}
            <div className="text-right pt-0.5">
              <div className="flex items-center justify-end gap-1.5 text-[14px]">
                <span className="font-semibold">তারিখ :</span>
                {fillMode === "interactive" ? (
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="border-b border-black outline-none px-1 text-center w-32 text-xs font-sans"
                  />
                ) : (
                  <span className="border-b border-dotted border-black w-36 inline-block tracking-widest text-transparent select-none">
                    ..............................................
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SUBJECT: BOLD AND UNDERLINED */}
          <div className="text-center my-3.5">
            <h1 className="text-[16px] sm:text-[17px] font-extrabold inline-block pb-0.5 border-b-[1.5px] border-black tracking-wide">
              বিষয় : আইনগত উত্তরাধিকার শংসাপত্র প্রদানের জন্য আবেদন
            </h1>
          </div>

          {/* SALUTATION & BODY PARAGRAPHS */}
          <div className="space-y-2 text-justify leading-[1.8] mt-2">
            <p className="font-semibold text-[14.5px]">মহাশয়,</p>

            {/* Paragraph 1 */}
            <p className="indent-6 sm:indent-8">
              আমার পিতা / মাতা / স্বামী{" "}
              {fillMode === "interactive" ? (
                <input
                  type="text"
                  value={formData.deceasedName}
                  onChange={(e) => setFormData({ ...formData, deceasedName: e.target.value })}
                  placeholder="মৃত ব্যক্তির নাম"
                  className="border-b border-black outline-none px-1 font-semibold text-center min-w-[180px] text-[13.5px]"
                />
              ) : (
                <span className="border-b border-dotted border-black inline-block min-w-[200px] text-transparent select-none">
                  .......................................................................
                </span>
              )}
              , তাহার পিতা / স্বামী{" "}
              {fillMode === "interactive" ? (
                <input
                  type="text"
                  value={formData.deceasedGuardianName}
                  onChange={(e) => setFormData({ ...formData, deceasedGuardianName: e.target.value })}
                  placeholder="পিতা বা স্বামীর নাম"
                  className="border-b border-black outline-none px-1 font-semibold text-center min-w-[180px] text-[13.5px]"
                />
              ) : (
                <span className="border-b border-dotted border-black inline-block min-w-[200px] text-transparent select-none">
                  .......................................................................
                </span>
              )}{" "}
              গ্রাম
              {fillMode === "interactive" ? (
                <input
                  type="text"
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  className="border-b border-black outline-none px-1 font-semibold text-center min-w-[120px] text-[13.5px]"
                />
              ) : (
                <span className="border-b border-dotted border-black inline-block min-w-[140px] text-transparent select-none">
                  ......................................................
                </span>
              )}
              , পোস্ট
              {fillMode === "interactive" ? (
                <input
                  type="text"
                  value={formData.postOffice}
                  onChange={(e) => setFormData({ ...formData, postOffice: e.target.value })}
                  className="border-b border-black outline-none px-1 font-semibold text-center min-w-[100px] text-[13.5px]"
                />
              ) : (
                <span className="border-b border-dotted border-black inline-block min-w-[120px] text-transparent select-none">
                  ......................................
                </span>
              )}
              , থানা- হাঁসখালী, জেলা- নদীয়া ঠিকানার স্থায়ী বাসিন্দা ছিলেন।
            </p>

            {/* Paragraph 2: Date & Cause of Death */}
            <p>
              তিনি ইংরাজী{" "}
              {fillMode === "interactive" ? (
                <input
                  type="text"
                  value={formData.deathDate}
                  onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
                  placeholder="মৃত্যুর তারিখ"
                  className="border-b border-black outline-none px-1 text-center min-w-[110px] text-[13px]"
                />
              ) : (
                <span className="border-b border-dotted border-black inline-block min-w-[120px] text-transparent select-none">
                  ......................................
                </span>
              )}{" "}
              তারিখে নিজ বাসভবনে / হাসপাতালে বার্ধক্য জনিত / দুর্ঘটনা জনিত / রোগাগ্রস্ত জনিত কারণে মারা যান। মৃত্যুরকালে তাঁহার বয়স হইয়াছিল{" "}
              {fillMode === "interactive" ? (
                <input
                  type="text"
                  value={formData.deathAge}
                  onChange={(e) => setFormData({ ...formData, deathAge: e.target.value })}
                  placeholder="বয়স"
                  className="border-b border-black outline-none px-1 text-center min-w-[40px] text-[13px]"
                />
              ) : (
                <span className="border-b border-dotted border-black inline-block min-w-[50px] text-transparent select-none">
                  ......................
                </span>
              )}{" "}
              বৎসর।
            </p>

            {/* Paragraph 3: Request Prayer */}
            <p>
              অতএব, মহাশয়ের নিকট আবেদন নিম্নে বর্ণিত ব্যক্তিবর্গের নামে একটি আইনগত উত্তরাধিকার শংসাপত্র প্রদান করিয়া বাধিত করিবেন।
            </p>
          </div>

          {/* TABLE SUBTITLE */}
          <div className="mt-3.5 mb-1.5 text-center font-bold text-[14.5px]">
            মৃত ব্যক্তির উত্তরাধিকারগণের নাম ও বিবরণ নিম্নে প্রদত্ত হইল।
          </div>

          {/* LEGAL HEIRS TABLE (5 Columns, 10 Rows) */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-center text-[12.5px] sm:text-[13px] print-table">
              <thead>
                <tr className="bg-neutral-50/50 font-bold border-b border-black">
                  <th className="border border-black px-1.5 py-1.5 w-12 text-center">ক্রমিক নং</th>
                  <th className="border border-black px-2 py-1.5 text-center">উত্তরাধিকারগণের নাম</th>
                  <th className="border border-black px-2 py-1.5 text-center">উত্তরাধিকারগণের পিতা/স্বামীর নাম</th>
                  <th className="border border-black px-2 py-1.5 w-36 text-center">মৃত ব্যক্তির সহিত সম্পর্ক</th>
                  <th className="border border-black px-1.5 py-1.5 w-24 text-center">বয়স (বর্তমান)</th>
                </tr>
              </thead>
              <tbody>
                {formData.heirs.map((heir, idx) => (
                  <tr key={heir.sl} className="border-b border-black h-7 sm:h-8">
                    <td className="border border-black font-semibold px-1 py-1 text-center">{heir.sl}</td>
                    <td className="border border-black px-2 py-0.5 text-left">
                      {fillMode === "interactive" ? (
                        <input
                          type="text"
                          value={heir.name}
                          onChange={(e) => updateHeirRow(idx, "name", e.target.value)}
                          className="w-full bg-transparent outline-none text-xs"
                          placeholder="উত্তরাধিকারীর নাম"
                        />
                      ) : (
                        <span className="inline-block min-h-[18px]"></span>
                      )}
                    </td>
                    <td className="border border-black px-2 py-0.5 text-left">
                      {fillMode === "interactive" ? (
                        <input
                          type="text"
                          value={heir.guardianName}
                          onChange={(e) => updateHeirRow(idx, "guardianName", e.target.value)}
                          className="w-full bg-transparent outline-none text-xs"
                          placeholder="পিতা / স্বামীর নাম"
                        />
                      ) : (
                        <span className="inline-block min-h-[18px]"></span>
                      )}
                    </td>
                    <td className="border border-black px-2 py-0.5 text-center">
                      {fillMode === "interactive" ? (
                        <input
                          type="text"
                          value={heir.relation}
                          onChange={(e) => updateHeirRow(idx, "relation", e.target.value)}
                          className="w-full bg-transparent outline-none text-center text-xs"
                          placeholder="যেমন: পুত্র / কন্যা / স্ত্রী"
                        />
                      ) : (
                        <span className="inline-block min-h-[18px]"></span>
                      )}
                    </td>
                    <td className="border border-black px-1 py-0.5 text-center">
                      {fillMode === "interactive" ? (
                        <input
                          type="text"
                          value={heir.age}
                          onChange={(e) => updateHeirRow(idx, "age", e.target.value)}
                          className="w-full bg-transparent outline-none text-center text-xs"
                          placeholder="বৎসর"
                        />
                      ) : (
                        <span className="inline-block min-h-[18px]"></span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SOLEMN DECLARATION PARAGRAPH */}
          <div className="mt-3 text-justify text-[12.5px] sm:text-[13px] leading-[1.6]">
            আমি এই মর্মে ঘোষণা করিতেছি যে উপরোক্ত ব্যক্তিবর্গ ব্যতীত তাঁহার আর কোন উত্তরাধিকারী নাই। যদি এই তথ্য ভুল বা মিথ্যা প্রমাণিত হয় তাহা হইলে সরকারী আইনানুসারে যথাবিহিত শাস্তি বিধান হইবে তাহা মানিয়া লইতে বাধ্য থাকিব ও এই বিষয়ে আমি সম্পূর্ণ দায়বদ্ধ থাকিব এবং অন্য কোনো ব্যক্তি বা প্রতিষ্ঠান কোনোভাবেই দায়ী থাকিবে না।
          </div>

          {/* SIGNATURES SECTION */}
          <div className="mt-4 pt-1 space-y-3">
            {/* Top part: Applicant on Right */}
            <div className="flex justify-end text-right">
              <div className="space-y-1 inline-block text-center min-w-[250px]">
                <p className="font-semibold text-right text-[13.5px]">বিনীত,</p>
                <div className="pt-7 pb-1">
                  {fillMode === "interactive" && formData.applicantSignature ? (
                    <p className="font-serif italic font-bold">{formData.applicantSignature}</p>
                  ) : (
                    <p className="border-b border-dotted border-black w-60 mx-auto tracking-widest text-transparent select-none">
                      ........................................................
                    </p>
                  )}
                </div>
                <p className="text-[12.5px] font-semibold text-center">
                  আবেদনকারীর স্বাক্ষর এবং মোবাইল নম্বর
                </p>
                {fillMode === "interactive" && (
                  <input
                    type="text"
                    value={formData.applicantMobile}
                    onChange={(e) => setFormData({ ...formData, applicantMobile: e.target.value })}
                    placeholder="মোবাইল নম্বর লিখুন"
                    className="border-b border-black text-center text-xs outline-none w-44 mt-0.5"
                  />
                )}
              </div>
            </div>

            {/* Bottom Part: Member Counter-signature on Left & 4 Witnesses on Right */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
              {/* Left Column: Gram Panchayat Member Signature */}
              <div className="space-y-1">
                <p className="text-[12.5px] leading-snug">
                  আবেদনকারীর আবেদন আমার
                  <br />
                  জ্ঞান ও বিশ্বাস মতে সম্পূর্ণ সত্য।
                </p>

                <div className="pt-2">
                  <p className="font-bold text-[13px]">প্রতি-স্বাক্ষর</p>
                  <div className="pt-6 pb-1">
                    <p className="border-b border-dotted border-black w-56 tracking-widest text-transparent select-none">
                      ........................................................
                    </p>
                  </div>
                  <p className="font-bold text-[13px] leading-tight">সদস্য / সদস্যা</p>
                  <p className="font-bold text-[13px] leading-tight">বগুলা ২নং গ্রাম পঞ্চায়েত</p>
                </div>
              </div>

              {/* Right Column: 4 Local Witnesses Details */}
              <div className="space-y-1">
                <div className="text-[12px] sm:text-[12.5px] font-bold border-b border-black pb-0.5 flex justify-between">
                  <span>স্থানীয় বাসিন্দার স্বাক্ষর</span>
                  <span>পিতা</span>
                  <span>মোবাইল নম্বর :</span>
                </div>

                <div className="space-y-1.5 text-[12px] pt-1">
                  {[1, 2, 3, 4].map((num, i) => (
                    <div key={num} className="flex items-center justify-between gap-1 text-[11.5px] sm:text-[12px]">
                      <span className="font-semibold">{["১", "২", "৩", "৪"][i]}:</span>
                      {fillMode === "interactive" ? (
                        <>
                          <input
                            type="text"
                            placeholder="স্বাক্ষর / নাম"
                            value={formData.witnesses[i]?.name || ""}
                            onChange={(e) => updateWitness(i, "name", e.target.value)}
                            className="border-b border-black outline-none w-24 text-[11px]"
                          />
                          <input
                            type="text"
                            placeholder="পিতা"
                            value={formData.witnesses[i]?.fatherName || ""}
                            onChange={(e) => updateWitness(i, "fatherName", e.target.value)}
                            className="border-b border-black outline-none w-20 text-[11px]"
                          />
                          <input
                            type="text"
                            placeholder="মোবাইল"
                            value={formData.witnesses[i]?.mobile || ""}
                            onChange={(e) => updateWitness(i, "mobile", e.target.value)}
                            className="border-b border-black outline-none w-24 text-[11px]"
                          />
                        </>
                      ) : (
                        <div className="flex-1 border-b border-dotted border-black tracking-widest text-transparent select-none text-right ml-1">
                          ...........................................................................................
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTNOTE / CHECKLIST (বি: দ্র:-) */}
          <div className="mt-4 pt-2 border-t border-black text-[11.5px] sm:text-[12px] leading-snug">
            <p className="font-bold">
              বি: দ্র:- আবেদনপত্রের সহিত ১. মৃত ব্যক্তির মৃত্যুর প্রমাণপত্র (Death Certificate) ২. প্রথম শ্রেণীর ম্যাজিস্ট্রেটের নিকট ঘোষণাপত্র (Affidavit) (Original) ৩. ট্যাক্সের রসিদের (জেরক্স) ৪. আবেদনকারীর Aadhar এবং Voter Card এর জেরক্স জমা দিতে হবে। (জমা দেওয়া কাগজ কোনো মতে ফেরত হবে না)।
            </p>
          </div>
        </div>
      </div>

      {/* Helpful Instructions Box (Screen Only) */}
      {showControls && (
        <div className="no-print max-w-[210mm] mx-auto bg-muted/40 border border-border/70 rounded-2xl p-4 sm:p-5 text-xs text-muted-foreground space-y-2.5">
          <div className="flex items-center gap-2 text-foreground font-bold">
            <Info size={15} className="text-primary" />
            <span>নাগরিক ও সিএসসি অপারেটরদের জন্য গুরুত্বপূর্ণ নির্দেশিকা (Instructions)</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 leading-relaxed text-[11.5px] sm:text-xs">
            <li>
              <strong>A4 সাইজ বাধ্যতামূলক:</strong> এই আবেদনপত্রটি সম্পূর্ণ A4 মাপের ১টি পৃষ্ঠায় প্রিন্ট করার উপযোগী করে তৈরি করা হয়েছে।
            </li>
            <li>
              <strong>হাতে লেখা বনাম অনলাইন:</strong> আপনি সরাসরি ফাঁকা ফর্ম প্রিন্ট করে হাতে লিখে জমা দিতে পারেন, অথবা ওপরের <em>"কম্পিউটারে টাইপ করে প্রিন্ট"</em> মোড সিলেক্ট করে নাম ও বিবরণ পূরণ করে পরিচ্ছন্ন প্রিন্ট নিতে পারেন।
            </li>
            <li>
              <strong>গ্রাম সংসদ সদস্য প্রতি-স্বাক্ষর:</strong> ফর্মটি পূরণের পর সংশ্লিষ্ট ওয়ার্ডের পঞ্চায়েত সদস্য/সদস্যার সিল ও প্রতি-স্বাক্ষর এবং ৪ জন স্থানীয় বাসিন্দার স্বাক্ষর বাধ্যতামূলক।
            </li>
            <li>
              <strong>প্রয়োজনীয় সংযোজনী:</strong> ১) ডেথ সার্টিফিকেট ২) ফার্স্ট ক্লাস ম্যাজিস্ট্রেট / নোটারি এফিডেভিট ৩) পঞ্চায়েত ট্যাক্স রসিদ ৪) আবেদনকারীর আধার ও ভোটার কার্ডের জেরক্স।
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
