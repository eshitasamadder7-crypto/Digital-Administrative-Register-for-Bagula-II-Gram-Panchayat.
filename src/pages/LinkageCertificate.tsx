import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";
import {
  Printer,
  Download,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileCheck2,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import { JURISDICTION } from "@/lib/masterData";
import { getCachedAuthoritySettings, getCachedSuperAdminControls } from "@/lib/appSettings";

const getPdfLibraries = async () => {
  const [html2canvas, jspdf] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  return [html2canvas, jspdf] as const;
};

interface ParentElectoralRecord {
  name: string;
  relation: string;
  partNo?: string;
  serialNo?: string;
  epicNo?: string;
  assemblyConstituency?: string;
  electoralRollYear?: string;
}

export default function LinkageCertificate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const certRef = useRef<HTMLDivElement>(null);

  const loadId = searchParams.get("load");
  const isReprint = searchParams.get("reprint") === "1";

  const [loading, setLoading] = useState(Boolean(loadId));
  const [record, setRecord] = useState<Record<string, any> | null>(null);

  // Authority and Theme Settings
  const authority = getCachedAuthoritySettings();
  const controls = getCachedSuperAdminControls();

  // Certificate Fields
  const [verificationId, setVerificationId] = useState("");
  const [memoNo, setMemoNo] = useState("");
  const [certDate, setCertDate] = useState("");
  const [status, setStatus] = useState<string>("Approved");

  const [applicantName, setApplicantName] = useState("");
  const [relationType, setRelationType] = useState("S/O");
  const [guardianName, setGuardianName] = useState("");
  const [village, setVillage] = useState("Bagula");
  const [postOffice, setPostOffice] = useState("Bagula");
  const [policeStation, setPoliceStation] = useState("Hanskhali");
  const [block, setBlock] = useState("Hanskhali");
  const [district, setDistrict] = useState("Nadia");
  const [pinCode, setPinCode] = useState("741502");

  const [assemblyConstituency, setAssemblyConstituency] = useState(
    "91 - Ranaghat Uttar Purba (SC)"
  );
  const [voterStatus, setVoterStatus] = useState("New Voter");
  const [applicantPartNo, setApplicantPartNo] = useState("");
  const [applicantSerialNo, setApplicantSerialNo] = useState("");
  const [applicantEpicNo, setApplicantEpicNo] = useState("");

  const [purpose, setPurpose] = useState(
    "Election Enrolment and Family Lineage Verification"
  );
  const [targetAssemblyConstituency, setTargetAssemblyConstituency] = useState(
    "91 - Ranaghat Uttar Purba (SC)"
  );

  const [spouseName, setSpouseName] = useState("");
  const [spouseRelationWording, setSpouseRelationWording] = useState("");
  const [spouseParentInfo, setSpouseParentInfo] = useState("");
  const [spouseVillage, setSpouseVillage] = useState("");
  const [spousePostOffice, setSpousePostOffice] = useState("");

  const [electoralRecords, setElectoralRecords] = useState<ParentElectoralRecord[]>([]);

  useEffect(() => {
    if (!loadId) return;

    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("linkage_certificates")
          .select("*, linkage_parent_electoral_records(*)")
          .eq("id", loadId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error("Linkage Certificate record not found");
          return;
        }

        if (!active) return;
        setRecord(data);
        setVerificationId(data.verification_id || "");
        setMemoNo(data.memo_no || "");
        setCertDate(data.issue_date || data.cert_date || new Date().toISOString().slice(0, 10));
        setStatus(data.status || "Approved");

        setApplicantName(data.applicant_name || "");
        setRelationType(data.relationship_type || "S/O");
        setGuardianName(data.guardian_name || "");
        setVillage(data.village || "Bagula");
        setAssemblyConstituency(data.assembly_constituency || "91 - Ranaghat Uttar Purba (SC)");
        setVoterStatus(data.voter_status || "New Voter");
        setApplicantPartNo(data.applicant_part_no || "");
        setApplicantSerialNo(data.applicant_serial_no || "");
        setApplicantEpicNo(data.applicant_epic_no || "");
        setPurpose(data.purpose || "Election Enrolment and Family Lineage Verification");
        setTargetAssemblyConstituency(data.target_assembly_constituency || data.assembly_constituency || "91 - Ranaghat Uttar Purba (SC)");

        setSpouseName(data.spouse_name || "");
        setSpouseRelationWording(data.spouse_relation_wording || "");
        setSpouseParentInfo(data.spouse_parent_info || "");
        setSpouseVillage(data.spouse_village || "");
        setSpousePostOffice(data.spouse_post_office || "");

        // Extract wizard data if available
        const rawData = data.data as Record<string, any> | null;
        if (rawData?.__wizard?.applicant) {
          const app = rawData.__wizard.applicant;
          if (app.postOffice) setPostOffice(app.postOffice);
          if (app.policeStation) setPoliceStation(app.policeStation);
          if (app.block) setBlock(app.block);
          if (app.district) setDistrict(app.district);
          if (app.pin) setPinCode(app.pin);
        }

        // Electoral records from joined table or data jsonb
        const joinedRecords = (data as any).linkage_parent_electoral_records;
        if (Array.isArray(joinedRecords) && joinedRecords.length > 0) {
          setElectoralRecords(
            joinedRecords.map((r: any) => ({
              name: r.name,
              relation: r.relation,
              partNo: r.part_no,
              serialNo: r.serial_no,
              epicNo: r.epic_no,
              assemblyConstituency: r.assembly_constituency,
              electoralRollYear: r.electoral_roll_year,
            }))
          );
        } else if (rawData?.__wizard?.linkage?.parentElectoralRecords) {
          setElectoralRecords(rawData.__wizard.linkage.parentElectoralRecords);
        }

        toast.success("Linkage certificate record loaded");

        if (isReprint && (data.status === "Approved" || data.memo_no)) {
          try {
            await (supabase.rpc as any)("log_office_activity", {
              _action_type: "linkage.reprint",
              _target_table: "linkage_certificates",
              _target_id: loadId,
              _metadata: { verification_id: data.verification_id, memo_no: data.memo_no },
            });
          } catch {
            /* non-blocking */
          }
          setTimeout(handleDownloadPDF, 1000);
        }
      } catch (err: any) {
        toast.error("Failed to load linkage certificate: " + (err.message || err));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId, isReprint]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!certRef.current) return;
    const toastId = toast.loading("Generating high-resolution official PDF...");
    try {
      const [html2canvasModule, jspdfModule] = await getPdfLibraries();
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jspdfModule;

      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = 210;
      const pdfH = 297;
      const imgH = (canvas.height * pdfW) / canvas.width;
      const y = Math.max(0, (pdfH - imgH) / 2);

      pdf.addImage(imgData, "JPEG", 0, y, pdfW, Math.min(imgH, pdfH));
      const safeName = (applicantName || "Linkage_Certificate").replace(/\s+/g, "_");
      pdf.save(`Linkage_Certificate_${safeName}_${verificationId || "Draft"}.pdf`);
      toast.success("Official PDF downloaded successfully!", { id: toastId });
    } catch (e: any) {
      console.error("PDF generation failed", e);
      toast.error("Could not generate PDF: " + (e.message || "Unknown error"), { id: toastId });
    }
  };

  const verifyUrl = `${window.location.origin}/verify?id=${encodeURIComponent(
    verificationId || loadId || "PENDING"
  )}`;

  return (
    <div className="min-h-screen bg-slate-100/70 py-6 px-3 sm:px-6 print:p-0 print:bg-white text-slate-900">
      <Helmet>
        <title>Family Linkage Certificate — Bagula II Gram Panchayat</title>
      </Helmet>

      {/* Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <BackButton />
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <Building2 className="h-5 w-5 text-primary" />
              Family Linkage Certificate
            </h1>
            <p className="text-xs text-muted-foreground">
              ভোটার তালিকায় নাম অন্তর্ভুক্তি সংক্রান্ত পারিবারিক সংযোগ শংসাপত্র
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 shadow-sm">
            <Printer className="h-4 w-4" />
            Print Form
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPDF}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Certificate Page (A4 Aspect Ratio Optimized) */}
      <div className="max-w-4xl mx-auto">
        <div
          ref={certRef}
          className="certificate-area bg-white border-2 border-slate-300 shadow-xl rounded-sm p-8 sm:p-12 relative overflow-hidden print:border-none print:shadow-none print:p-6"
          style={{ minHeight: "297mm", boxSizing: "border-box" }}
        >
          {/* Subtle Government Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
            <div className="text-center transform -rotate-45">
              <span className="text-8xl font-black uppercase tracking-widest text-slate-900">
                BAGULA - II GP
              </span>
              <br />
              <span className="text-5xl font-bold uppercase tracking-wider text-slate-900">
                OFFICIAL RECORD
              </span>
            </div>
          </div>

          {/* Certificate Header */}
          <div className="relative z-10 text-center pb-4 border-b-2 border-slate-800">
            {/* Government Emblem / Biswa Bangla Crest */}
            <div className="flex justify-center items-center gap-3 mb-2">
              <div className="h-14 w-14 rounded-full border-2 border-slate-800 flex items-center justify-center p-1 bg-white shadow-sm">
                <span className="text-[10px] font-black tracking-tighter text-slate-800 text-center uppercase leading-none">
                  বিশ্বরূপা
                  <br />
                  WB GOVT
                </span>
              </div>
            </div>

            <div className="text-[11px] tracking-widest uppercase font-semibold text-slate-600">
              GOVERNMENT OF WEST BENGAL
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase mt-0.5">
              OFFICE OF THE {authority.gramPanchayatName.toUpperCase()}
            </h2>
            <p className="text-xs text-slate-700 font-medium">
              P.O. Bagula, P.S. {authority.policeStationName}, Block: {authority.blockName}, District: {authority.districtName}, PIN: {authority.pinCode}
            </p>
            <p className="text-[11px] text-slate-500">
              E-mail: {authority.contactEmail} | Helpline: {authority.helplinePhone}
            </p>
          </div>

          {/* Certificate Metadata (Memo & Date) */}
          <div className="relative z-10 flex flex-wrap justify-between items-center text-xs font-semibold py-3 border-b border-slate-200 gap-2">
            <div>
              <span className="text-slate-500">Memo No: </span>
              <span className="font-mono text-slate-900 text-sm">
                {memoNo || "……/BGL-II/" + new Date().getFullYear() + " (Pending Approval)"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Verification ID: </span>
              <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                {verificationId || "DRAFT-PRE-VERIFICATION"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Date: </span>
              <span className="font-mono text-slate-900">
                {certDate || new Date().toLocaleDateString("en-IN")}
              </span>
            </div>
          </div>

          {/* Certificate Title Banner */}
          <div className="relative z-10 text-center my-6">
            <div className="inline-block border-2 border-slate-800 px-6 py-2 rounded-sm bg-slate-50/50">
              <h3 className="text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                FAMILY LINKAGE CERTIFICATE FOR ELECTION ENROLMENT
              </h3>
              <p className="text-xs font-semibold text-slate-700 font-sans mt-0.5">
                ভোটার তালিকায় অন্তর্ভুক্তি সংক্রান্ত পারিবারিক সংযোগ শংসাপত্র
              </p>
            </div>
          </div>

          {/* Body Certification Statement */}
          <div className="relative z-10 text-xs sm:text-sm leading-relaxed text-slate-800 space-y-4 text-justify">
            <p>
              This is to certify that{" "}
              <strong className="font-bold text-slate-950 uppercase border-b border-dotted border-slate-800">
                {applicantName || "[APPLICANT FULL NAME]"}
              </strong>
              ,{" "}
              <span className="font-medium">
                {relationType === "W/O" ? "Wife of" : relationType === "D/O" ? "Daughter of" : "Son of"}
              </span>{" "}
              <strong className="font-semibold text-slate-950 uppercase">
                {guardianName || "[FATHER / HUSBAND NAME]"}
              </strong>
              , is a permanent / bonafide resident of{" "}
              <span className="font-semibold">Village: {village || "Bagula"}</span>, P.O.:{" "}
              <span className="font-semibold">{postOffice || "Bagula"}</span>, Under Bagula II Gram
              Panchayat, P.S.: {policeStation}, Block: {block}, District: {district}, West Bengal,
              PIN: {pinCode}.
            </p>

            <p>
              The applicant has applied for Family Linkage Certification under{" "}
              <strong>Assembly Constituency: {assemblyConstituency}</strong> for the purpose of:{" "}
              <span className="italic font-medium text-slate-900">"{purpose}"</span>.
              {applicantEpicNo && (
                <span>
                  {" "}The applicant holds Voter EPIC Number:{" "}
                  <strong className="font-mono">{applicantEpicNo}</strong>.
                </span>
              )}
            </p>

            {/* Marriage / Spouse Linkage section if applicable */}
            {spouseName && (
              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs leading-normal">
                <span className="font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Spouse / Marriage Particulars:
                </span>
                <span>
                  Married to <strong>{spouseName}</strong>
                  {spouseParentInfo && <span> ({spouseRelationWording || "child of"} {spouseParentInfo})</span>}
                  {spouseVillage && <span>, hailing from Village {spouseVillage}, P.O. {spousePostOffice || postOffice}</span>}.
                </span>
              </div>
            )}

            {/* Electoral Records / Ancestor Table */}
            <div className="mt-4">
              <div className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Verified Ancestral / Parental Electoral Roll Linkage:</span>
                <span className="text-[11px] font-normal text-slate-500 lowercase">
                  (extracted from official volume registers)
                </span>
              </div>

              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold">
                      <th className="py-1.5 px-2 border-r border-slate-200">#</th>
                      <th className="py-1.5 px-2 border-r border-slate-200">Name of Ancestor / Relative</th>
                      <th className="py-1.5 px-2 border-r border-slate-200">Relation</th>
                      <th className="py-1.5 px-2 border-r border-slate-200">Part No.</th>
                      <th className="py-1.5 px-2 border-r border-slate-200">Serial No.</th>
                      <th className="py-1.5 px-2 border-r border-slate-200">EPIC No.</th>
                      <th className="py-1.5 px-2">Electoral Roll Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {electoralRecords.length > 0 ? (
                      electoralRecords.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2 border-r border-slate-200 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 font-bold uppercase text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200">
                            {item.relation}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 font-mono">
                            {item.partNo || "—"}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 font-mono">
                            {item.serialNo || "—"}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 font-mono font-medium">
                            {item.epicNo || "—"}
                          </td>
                          <td className="py-1.5 px-2 text-[11px]">
                            {item.electoralRollYear || "Draft Roll 2025"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-3 text-center text-slate-500 italic">
                          Parent / Ancestor electoral details verified through field inquiry and manual register.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="mt-4">
              On local inquiry and verification of family records presented, the genealogy and electoral linkage are confirmed to be authentic. To the best of knowledge of this Gram Panchayat, there are no known objections to this linkage certification.
            </p>
          </div>

          {/* Official Signatures & Verification Block */}
          <div className="relative z-10 mt-12 pt-6 border-t border-slate-200 flex flex-wrap items-end justify-between gap-6">
            {/* QR Code & Digital Verification Link */}
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 border-2 border-slate-800 p-1 rounded bg-white flex flex-col items-center justify-center shadow-sm">
                <QrCode className="h-14 w-14 text-slate-900" />
                <span className="text-[8px] font-mono tracking-tighter uppercase">SCAN VERIFY</span>
              </div>
              <div className="text-[11px] leading-tight space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Official Digital Certificate
                </div>
                <div className="text-slate-500 text-[10px] break-all max-w-[220px]">
                  {verifyUrl}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Issue Hash: {verificationId || "SHA256-PENDING"}
                </div>
              </div>
            </div>

            {/* Official Signatory Authority */}
            <div className="text-center min-w-[200px]">
              <div className="h-12 flex items-center justify-center text-slate-400 italic text-xs font-mono">
                [Digitally Signed / Seal of Authority]
              </div>
              <div className="border-t-2 border-slate-800 pt-1">
                <div className="font-black text-xs uppercase tracking-wider text-slate-900">
                  {authority.pradhanName}
                </div>
                <div className="text-[11px] font-semibold text-slate-700">
                  Pradhan / Sub-Registrar
                </div>
                <div className="text-[10px] text-slate-600">
                  Bagula II Gram Panchayat
                </div>
                <div className="text-[9px] text-slate-500">
                  Hanskhali, Nadia, West Bengal
                </div>
              </div>
            </div>
          </div>

          {/* Legal Footnote */}
          <div className="relative z-10 mt-8 pt-3 border-t border-slate-200 text-[9px] text-slate-400 text-center leading-relaxed">
            Issued in accordance with the regulatory facilitation policies of Bagula II Gram Panchayat and the Representation of the People Act guidelines. This certificate is valid only upon successful QR / URL verification on the official verification portal. Tampering or falsification is a punishable offence.
          </div>
        </div>
      </div>
    </div>
  );
}
