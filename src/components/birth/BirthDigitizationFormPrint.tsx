import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Printer,
  Download,
  FileText,
  CheckCircle2,
  RefreshCw,
  PenTool,
  Sparkles,
  Building2,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export interface BirthDigitizationFormData {
  applicationDate: string; // e.g. "12 / 05 / 2026"
  relationType: "আমার" | "আমার সন্তানের";
  childName: string;
  gender: "পুরুষ" | "মহিলা" | "";
  fatherName: string;
  fatherId: string;
  motherName: string;
  motherId: string;

  // Present Address
  presentStreet: string;
  presentLocality: string;
  presentVillage: string;
  presentBlock: string;
  presentPanchayat: string;
  presentDistrict: string;
  presentState: string;
  presentPin: string;

  // Mother's address at time of birth
  birthStreet: string;
  birthLocality: string;
  birthVillage: string;
  birthBlock: string;
  birthPanchayat: string;
  birthDistrict: string;
  birthState: string;
  birthPin: string;

  // Birth Registration Details
  oldRegNumber: string;
  oldRegDate: string;
  dateOfBirth: string;
  placeOfBirth: string;

  // Applicant sign & phone
  applicantName: string;
  applicantMobile: string;
}

const emptyFormData: BirthDigitizationFormData = {
  applicationDate: "",
  relationType: "আমার সন্তানের",
  childName: "",
  gender: "",
  fatherName: "",
  fatherId: "",
  motherName: "",
  motherId: "",

  presentStreet: "",
  presentLocality: "Bagula P.O.",
  presentVillage: "Collegepara, Bagula",
  presentBlock: "Hanskhali",
  presentPanchayat: "Bagula II GP",
  presentDistrict: "Nadia",
  presentState: "West Bengal",
  presentPin: "741502",

  birthStreet: "",
  birthLocality: "Bagula P.O.",
  birthVillage: "Collegepara, Bagula",
  birthBlock: "Hanskhali",
  birthPanchayat: "Bagula II GP",
  birthDistrict: "Nadia",
  birthState: "West Bengal",
  birthPin: "741502",

  oldRegNumber: "",
  oldRegDate: "",
  dateOfBirth: "",
  placeOfBirth: "Bagula II GP Area / Home",

  applicantName: "",
  applicantMobile: "",
};

const sampleFormData: BirthDigitizationFormData = {
  applicationDate: new Date().toLocaleDateString("en-GB").replace(/\//g, " / "),
  relationType: "আমার সন্তানের",
  childName: "SUBHAM PRAMANIK",
  gender: "পুরুষ",
  fatherName: "GANESH PRAMANIK",
  fatherId: "XXXX XXXX 4589 (Aadhaar)",
  motherName: "SUMITRA PRAMANIK",
  motherId: "XXXX XXXX 9021 (Aadhaar)",

  presentStreet: "Station Road, Ward No. 3",
  presentLocality: "Bagula Post Office",
  presentVillage: "Muragachha, Bagula",
  presentBlock: "Hanskhali",
  presentPanchayat: "Bagula II Gram Panchayat",
  presentDistrict: "Nadia",
  presentState: "West Bengal",
  presentPin: "741502",

  birthStreet: "Station Road, Ward No. 3",
  birthLocality: "Bagula Post Office",
  birthVillage: "Muragachha, Bagula",
  birthBlock: "Hanskhali",
  birthPanchayat: "Bagula II Gram Panchayat",
  birthDistrict: "Nadia",
  birthState: "West Bengal",
  birthPin: "741502",

  oldRegNumber: "B/142/2004",
  oldRegDate: "15 / 08 / 2004",
  dateOfBirth: "02 / 08 / 2004",
  placeOfBirth: "Bagula Bathanpara (Home)",

  applicantName: "GANESH PRAMANIK",
  applicantMobile: "9876543210",
};

interface BirthDigitizationFormPrintProps {
  initialFillMode?: "blank" | "interactive";
  showControls?: boolean;
}

export default function BirthDigitizationFormPrint({
  initialFillMode = "interactive",
  showControls = true,
}: BirthDigitizationFormPrintProps) {
  const [fillMode, setFillMode] = useState<"blank" | "interactive">(initialFillMode);
  const [formData, setFormData] = useState<BirthDigitizationFormData>(emptyFormData);
  const [editorOpen, setEditorOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setFormData(emptyFormData);
    toast.info("ফর্মের সমস্ত তথ্য ফাঁকা করা হয়েছে (Form reset to blank)");
  };

  const handleLoadSample = () => {
    setFormData(sampleFormData);
    setFillMode("interactive");
    toast.success("নমুনা তথ্য লোড করা হয়েছে (Sample data loaded)");
  };

  const copyPresentToBirthAddress = () => {
    setFormData((prev) => ({
      ...prev,
      birthStreet: prev.presentStreet,
      birthLocality: prev.presentLocality,
      birthVillage: prev.presentVillage,
      birthBlock: prev.presentBlock,
      birthPanchayat: prev.presentPanchayat,
      birthDistrict: prev.presentDistrict,
      birthState: prev.presentState,
      birthPin: prev.presentPin,
    }));
    toast.success("বর্তমান ঠিকানা জন্মের সময় ঠিকানায় কপি করা হয়েছে");
  };

  const updateField = (field: keyof BirthDigitizationFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar (hidden in print) */}
      {showControls && (
        <div className="no-print bg-white/95 backdrop-blur-md border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary text-primary-foreground text-xs font-semibold">
                  📄 অফিশিয়াল আবেদনপত্র · ফরম্যাট A4
                </Badge>
                <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-xs">
                  রেজিস্ট্রার, বগুলা ২ নং গ্রাম পঞ্চায়েত · নদীয়া
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  RBD Act, 1969 & WB SOP Case-I
                </Badge>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mt-1.5 flex items-center gap-2">
                জন্ম নিবন্ধন তথ্য ডিজিটালাইজেশন করার জন্য আবেদন
              </h2>
              <p className="text-xs text-muted-foreground">
                Application for Legacy Birth Certificate Digitization (Pre-2016 Manual Record Verification). Direct print or online fill in forced single-page A4 layout.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <Button
                onClick={handlePrint}
                className="flex-1 sm:flex-initial rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm gap-2 shadow-sm"
              >
                <Printer size={16} />
                <span>Print A4 Form / Download PDF</span>
              </Button>
            </div>
          </div>

          {/* Mode Switcher & Quick Actions */}
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
                <span>ওয়েবসাইটে পূরণ ও এডিট (Fill & Modify Online)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {fillMode === "interactive" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditorOpen(!editorOpen)}
                    className="text-xs h-8 rounded-lg gap-1"
                  >
                    {editorOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    <span>{editorOpen ? "হাইড ফিল্ড প্যানেল" : "দ্রুত ফিল্ড প্যানেল (Quick Panel)"}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs h-8 rounded-lg text-muted-foreground hover:text-destructive gap-1"
                  >
                    <RefreshCw size={12} />
                    <span>Reset</span>
                  </Button>
                </>
              )}
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                <span>Forced 1-Page A4 Ready</span>
              </span>
            </div>
          </div>

          {/* Quick Field Editor Drawer (Collapsible) */}
          {editorOpen && fillMode === "interactive" && (
            <div className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground">দ্রুত তথ্য পূরণ প্যানেল (Quick Field Editor):</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyPresentToBirthAddress}
                  className="h-7 text-[11px] gap-1 text-primary"
                >
                  <Copy size={11} /> কপি বর্তমান ঠিকানা → জন্মের সময় ঠিকানা
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">আবেদনের তারিখ</Label>
                  <Input
                    value={formData.applicationDate}
                    onChange={(e) => updateField("applicationDate", e.target.value)}
                    placeholder="DD / MM / YYYY"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">জন্ম নিবন্ধিত ব্যক্তির নাম</Label>
                  <Input
                    value={formData.childName}
                    onChange={(e) => updateField("childName", e.target.value.toUpperCase())}
                    placeholder="FULL NAME"
                    className="h-8 text-xs bg-white font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">লিঙ্গ (Gender)</Label>
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className="w-full h-8 px-2 text-xs bg-white border border-input rounded-md"
                  >
                    <option value="">-- নির্বাচন করুন --</option>
                    <option value="পুরুষ">পুরুষ (Male)</option>
                    <option value="মহিলা">মহিলা (Female)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">পিতার নাম</Label>
                  <Input
                    value={formData.fatherName}
                    onChange={(e) => updateField("fatherName", e.target.value)}
                    placeholder="পিতার নাম"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">পিতার পরিচয় (Aadhaar / EPIC)</Label>
                  <Input
                    value={formData.fatherId}
                    onChange={(e) => updateField("fatherId", e.target.value)}
                    placeholder="পিতার আধার বা ভোটার নম্বর"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">মাতার নাম</Label>
                  <Input
                    value={formData.motherName}
                    onChange={(e) => updateField("motherName", e.target.value)}
                    placeholder="মাতার নাম"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">মাতার পরিচয় (Aadhaar / EPIC)</Label>
                  <Input
                    value={formData.motherId}
                    onChange={(e) => updateField("motherId", e.target.value)}
                    placeholder="মাতার আধার বা ভোটার নম্বর"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">পুরোনো রেজিস্ট্রেশন নম্বর</Label>
                  <Input
                    value={formData.oldRegNumber}
                    onChange={(e) => updateField("oldRegNumber", e.target.value)}
                    placeholder="রেজিস্ট্রেশন নম্বর"
                    className="h-8 text-xs bg-white font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">মূল নিবন্ধনের তারিখ</Label>
                  <Input
                    value={formData.oldRegDate}
                    onChange={(e) => updateField("oldRegDate", e.target.value)}
                    placeholder="DD / MM / YYYY"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">জন্ম তারিখ</Label>
                  <Input
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                    placeholder="DD / MM / YYYY"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">জন্মস্থান</Label>
                  <Input
                    value={formData.placeOfBirth}
                    onChange={(e) => updateField("placeOfBirth", e.target.value)}
                    placeholder="গ্রাম/হাসপাতাল"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">আবেদনকারীর মোবাইল নম্বর</Label>
                  <Input
                    value={formData.applicantMobile}
                    onChange={(e) => updateField("applicantMobile", e.target.value)}
                    placeholder="10-digit Mobile"
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STYLES FOR FORCED SINGLE-PAGE A4 PRINTING */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 14mm 10mm 14mm !important;
        }
        @media print {
          html, body {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 13.5px !important;
            line-height: 1.42 !important;
            font-family: 'Noto Sans Bengali', 'Times New Roman', serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #birth-digitization-a4-sheet, #birth-digitization-a4-sheet * {
            visibility: visible;
          }
          #birth-digitization-a4-sheet {
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
          .page-break-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          input, select {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            outline: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* A4 PAPER CANVAS WRAPPER */}
      <div className="flex justify-center">
        <div
          id="birth-digitization-a4-sheet"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 rounded-xl shadow-md border border-neutral-300 font-serif relative flex flex-col justify-between"
          style={{
            fontFamily: "'Noto Sans Bengali', 'SolaimanLipi', 'Times New Roman', serif",
            lineHeight: 1.45,
            fontSize: "13.5px",
          }}
        >
          {/* CONTENT BODY */}
          <div className="space-y-4">
            {/* Header: Date (Top Right) & Recipient (Top Left) */}
            <div className="flex justify-between items-start">
              <div className="space-y-0.5 leading-snug">
                <p className="font-semibold">প্রতি</p>
                <p className="font-semibold">রেজিস্ট্রার</p>
                <p className="font-bold">বগুলা ২ নং গ্রাম পঞ্চায়েত</p>
                <p>জেলা – নদীয়া, পশ্চিমবঙ্গ</p>
              </div>

              <div className="text-right whitespace-nowrap pt-1">
                <span className="font-semibold">তারিখ: </span>
                {fillMode === "interactive" ? (
                  <input
                    type="text"
                    value={formData.applicationDate}
                    onChange={(e) => updateField("applicationDate", e.target.value)}
                    placeholder="___ / ___ / ______"
                    className="w-36 text-center border-b border-black outline-none bg-transparent font-medium"
                  />
                ) : (
                  <span className="inline-block border-b border-black w-32 text-center">___ / ___ / ______</span>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="text-center pt-2">
              <h3 className="font-bold text-[15px] sm:text-[16px] underline inline-block">
                বিষয়: জন্ম নিবন্ধন তথ্য ডিজিটালাইজেশন করার জন্য আবেদন।
              </h3>
            </div>

            {/* Salutation and Letter Body */}
            <div className="space-y-2 pt-1 text-justify leading-relaxed">
              <p className="font-semibold">মাননীয়া মহোদয়া,</p>
              <p className="indent-8">
                বিনীত নিবেদন এই যে,{" "}
                {fillMode === "interactive" ? (
                  <span className="font-semibold inline-flex items-center gap-1 bg-amber-50/70 px-1.5 py-0.5 rounded border border-amber-300 print:bg-transparent print:border-none">
                    <button
                      type="button"
                      onClick={() =>
                        updateField("relationType", formData.relationType === "আমার" ? "আমার সন্তানের" : "আমার")
                      }
                      className="cursor-pointer hover:underline"
                    >
                      {formData.relationType}
                    </button>
                    <span className="text-[10px] text-muted-foreground print:hidden">
                      ({formData.relationType === "আমার" ? "ক্লিক করে বদলান" : "ক্লিক করে বদলান"})
                    </span>
                  </span>
                ) : (
                  <span>আমার / আমার সন্তানের</span>
                )}{" "}
                জন্ম সংক্রান্ত তথ্য স্থানীয় নথিতে সংরক্ষিত রয়েছে। বিভিন্ন পরিষেবা গ্রহণের সুবিধার্থে উক্ত তথ্য ডিজিটালিভাবে অন্তর্ভুক্ত করার জন্য এই আবেদন পেশ করা হল।
              </p>
              <p className="indent-8">
                অতএব, নীচে প্রদত্ত তথ্য যাচাই সাপেক্ষে ডিজিটাল রেকর্ড অন্তর্ভুক্তির প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য অনুরোধ জানাচ্ছি।
              </p>
            </div>

            {/* Section 1: Applicant Details */}
            <div className="space-y-1.5 pt-1">
              <p className="font-bold text-[14px] flex items-center gap-1">
                <span>📌</span>
                <span>আবেদনকারীর বিবরণ:</span>
              </p>

              <div className="space-y-1 pl-1">
                {/* 1. Name and Gender */}
                <div className="flex flex-wrap items-baseline gap-1">
                  <span>১. জন্ম নিবন্ধিত ব্যক্তির নাম:</span>
                  <div className="flex-1 min-w-[200px]">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.childName}
                        onChange={(e) => updateField("childName", e.target.value.toUpperCase())}
                        placeholder="এখানে নাম লিখুন (ব্লক অক্ষরে)"
                        className="w-full border-b border-black outline-none font-bold uppercase tracking-wider px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[18px]"></div>
                    )}
                  </div>
                  <span className="whitespace-nowrap">,লিঙ্গ: </span>
                  {fillMode === "interactive" ? (
                    <div className="inline-flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1 font-medium">
                        <input
                          type="radio"
                          name="gender"
                          checked={formData.gender === "পুরুষ"}
                          onChange={() => updateField("gender", "পুরুষ")}
                          className="w-3.5 h-3.5 print:hidden"
                        />
                        <span className={formData.gender === "পুরুষ" ? "font-bold underline" : "text-neutral-700"}>
                          পুরুষ
                        </span>
                      </label>
                      <span>/</span>
                      <label className="cursor-pointer inline-flex items-center gap-1 font-medium">
                        <input
                          type="radio"
                          name="gender"
                          checked={formData.gender === "মহিলা"}
                          onChange={() => updateField("gender", "মহিলা")}
                          className="w-3.5 h-3.5 print:hidden"
                        />
                        <span className={formData.gender === "মহিলা" ? "font-bold underline" : "text-neutral-700"}>
                          মহিলা
                        </span>
                      </label>
                    </div>
                  ) : (
                    <span className="whitespace-nowrap">পুরুষ / মহিলা</span>
                  )}
                </div>

                {/* 2. Father Name & ID */}
                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">২. পিতার নাম:</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.fatherName}
                        onChange={(e) => updateField("fatherName", e.target.value)}
                        placeholder="পিতার নাম"
                        className="w-full border-b border-black outline-none px-1 font-medium bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[18px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 pl-4">
                  <span className="whitespace-nowrap">পরিচয় (পিতার Aadhaar / Voter ID):</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.fatherId}
                        onChange={(e) => updateField("fatherId", e.target.value)}
                        placeholder="পিতার পরিচয়পত্র নম্বর"
                        className="w-full border-b border-black outline-none px-1 font-medium bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[18px]"></div>
                    )}
                  </div>
                </div>

                {/* 3. Mother Name & ID */}
                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">৩. মাতার নাম:</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.motherName}
                        onChange={(e) => updateField("motherName", e.target.value)}
                        placeholder="মাতার নাম"
                        className="w-full border-b border-black outline-none px-1 font-medium bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[18px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 pl-4">
                  <span className="whitespace-nowrap">পরিচয় (মাতার Aadhaar / Voter ID):</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.motherId}
                        onChange={(e) => updateField("motherId", e.target.value)}
                        placeholder="মাতার পরিচয়পত্র নম্বর"
                        className="w-full border-b border-black outline-none px-1 font-medium bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[18px]"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Present Address */}
            <div className="space-y-1 pt-1">
              <p className="font-bold text-[14px] flex items-center gap-1">
                <span>🏠</span>
                <span>ঠিকানা (বর্তমান):</span>
              </p>

              <div className="space-y-1 pl-1">
                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">Street / Lane:</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.presentStreet}
                        onChange={(e) => updateField("presentStreet", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">Locality / Post Office:</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.presentLocality}
                        onChange={(e) => updateField("presentLocality", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">Village / Town (Mouza):</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.presentVillage}
                        onChange={(e) => updateField("presentVillage", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">Block / Municipality:</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.presentBlock}
                        onChange={(e) => updateField("presentBlock", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                  <span className="whitespace-nowrap">,Panchayat:</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.presentPanchayat}
                        onChange={(e) => updateField("presentPanchayat", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">District:</span>
                  <div className="w-56">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.presentDistrict}
                        onChange={(e) => updateField("presentDistrict", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">State:</span>
                  <span className="font-medium">West Bengal</span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">PIN:</span>
                  <div className="w-48">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.presentPin}
                        onChange={(e) => updateField("presentPin", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Mother's Address at time of birth */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-[14px] flex items-center gap-1">
                  <span>🏠</span>
                  <span>মাতার ঠিকানা (সন্তানের জন্মের সময়):</span>
                </p>
                {fillMode === "interactive" && (
                  <button
                    type="button"
                    onClick={copyPresentToBirthAddress}
                    className="no-print text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Copy size={10} /> বর্তমান ঠিকানার অনুরূপ
                  </button>
                )}
              </div>

              <div className="space-y-1 pl-1">
                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">Street / Lane:</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.birthStreet}
                        onChange={(e) => updateField("birthStreet", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">Locality / Post Office:</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.birthLocality}
                        onChange={(e) => updateField("birthLocality", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">Village / Town (Mouza):</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.birthVillage}
                        onChange={(e) => updateField("birthVillage", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">Block / Municipality:</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.birthBlock}
                        onChange={(e) => updateField("birthBlock", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                  <span className="whitespace-nowrap">,Panchayat:</span>
                  <div className="flex-1">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.birthPanchayat}
                        onChange={(e) => updateField("birthPanchayat", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">District:</span>
                  <div className="w-56">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.birthDistrict}
                        onChange={(e) => updateField("birthDistrict", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">State:</span>
                  <span className="font-medium">West Bengal</span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">PIN:</span>
                  <div className="w-48">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.birthPin}
                        onChange={(e) => updateField("birthPin", e.target.value)}
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Birth Registration Details */}
            <div className="space-y-1 pt-1">
              <p className="font-bold text-[14px] flex items-center gap-1">
                <span>📑</span>
                <span>জন্ম নিবন্ধনের বিবরণ:</span>
              </p>

              <div className="space-y-1.5 pl-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="whitespace-nowrap">১. জন্ম নিবন্ধন (Registration) নম্বর:</span>
                  <div className="flex-1 min-w-[140px]">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.oldRegNumber}
                        onChange={(e) => updateField("oldRegNumber", e.target.value)}
                        placeholder="নম্বর লিখুন"
                        className="w-full border-b border-black outline-none px-1 font-bold bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>

                  <span className="whitespace-nowrap pl-2">২. নিবন্ধনের তারিখ:</span>
                  <div className="w-40">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.oldRegDate}
                        onChange={(e) => updateField("oldRegDate", e.target.value)}
                        placeholder="____ / ____ / ________"
                        className="w-full border-b border-black outline-none text-center bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full text-center min-h-[16px]">
                        ____ / ____ / ________
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="whitespace-nowrap">৩. জন্ম তারিখ:</span>
                  <div className="w-36">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.dateOfBirth}
                        onChange={(e) => updateField("dateOfBirth", e.target.value)}
                        placeholder="___ / ___ / ______"
                        className="w-full border-b border-black outline-none text-center font-medium bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full text-center min-h-[16px]">
                        ___ / ___ / ______
                      </div>
                    )}
                  </div>

                  <span className="whitespace-nowrap pl-2">৪. জন্মস্থান:</span>
                  <div className="flex-1 min-w-[180px]">
                    {fillMode === "interactive" ? (
                      <input
                        type="text"
                        value={formData.placeOfBirth}
                        onChange={(e) => updateField("placeOfBirth", e.target.value)}
                        placeholder="হাসপাতাল / গৃহের ঠিকানা"
                        className="w-full border-b border-black outline-none px-1 bg-transparent"
                      />
                    ) : (
                      <div className="border-b border-black w-full min-h-[16px]"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Declaration & Signatures */}
            <div className="pt-2 space-y-2">
              <p className="leading-snug text-justify">
                উপরোক্ত তথ্যাদি সঠিক বলে ঘোষণা করছি এবং প্রয়োজনীয় নথি সংযুক্ত করা হয়েছে।
              </p>

              <div className="flex justify-end pt-1">
                <div className="w-72 space-y-1 text-right">
                  <p className="font-semibold pb-3">ধন্যবাদান্তে,</p>

                  <div className="flex items-baseline justify-end gap-1">
                    <span className="whitespace-nowrap font-medium">আবেদনকারীর স্বাক্ষর:</span>
                    <div className="w-36">
                      {fillMode === "interactive" ? (
                        <input
                          type="text"
                          value={formData.applicantName}
                          onChange={(e) => updateField("applicantName", e.target.value)}
                          placeholder="স্বাক্ষর / নাম"
                          className="w-full border-b border-black outline-none text-center font-medium bg-transparent"
                        />
                      ) : (
                        <div className="border-b border-black w-full min-h-[16px]"></div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-end gap-1">
                    <span className="whitespace-nowrap font-medium">মোবাইল নম্বর: +91</span>
                    <div className="w-36">
                      {fillMode === "interactive" ? (
                        <input
                          type="text"
                          value={formData.applicantMobile}
                          onChange={(e) => updateField("applicantMobile", e.target.value)}
                          placeholder="১০ সংখ্যার নম্বর"
                          className="w-full border-b border-black outline-none text-center font-semibold bg-transparent"
                        />
                      ) : (
                        <div className="border-b border-black w-full min-h-[16px]"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER STATUTORY NOTES */}
          <div className="pt-4 border-t border-neutral-300 space-y-1.5 text-[11px] text-neutral-800 leading-tight">
            <div className="flex items-start gap-1">
              <span className="shrink-0 font-bold">📌 Note (English):</span>
              <p>
                This application is prepared for organizing personal records and does not represent an official certificate.
              </p>
            </div>

            <div className="flex items-start gap-1">
              <span className="shrink-0 font-bold">📌 বিঃদ্রঃ (বাংলা):</span>
              <p>
                এই আবেদনপত্র শুধুমাত্র ব্যক্তিগত তথ্য সংগঠনের জন্য প্রস্তুত করা হয়েছে, এটি কোনো সরকারি সনদ নয়।
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
