import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import MaskedInput from "@/components/MaskedInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MasterDataService } from "@/lib/api/MasterDataService";
import { BackButton } from "@/components/BackButton";
import {
  getCachedWorkflowRules,
  getCachedAuthoritySettings,
  formatMemoPrefix,
} from "@/lib/appSettings";

// Cache the PDF libraries to avoid repeated dynamic imports
let pdfLibrariesPromise: Promise<[typeof import("html2canvas"), typeof import("jspdf")]> | null = null;
const getPdfLibraries = () => {
  if (!pdfLibrariesPromise) {
    pdfLibrariesPromise = Promise.all([import("html2canvas"), import("jspdf")]);
  }
  return pdfLibrariesPromise;
};


function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const VILLAGES = [
  "Bagula Station Para", "Bagula Puratanpara", "Bagula Madhyapara", "Bagula College Para",
  "Bara Muragacha", "Muragacha Colony", "Muragacha Colony Madhyapara",
  "Milannagar", "Sahapur", "Hatibandha", "Santinagar", "Madna"
];
const POST_OFFICES = ["Bagula", "Muragacha Colony", "Haldipara", "Santinagar", "Hatibandha"];

// Auto-mapping: village -> post office (exact name match, case-insensitive)
const VILLAGE_PO_RULES: { match: RegExp; po: string }[] = [
  { match: /^(bagula station para|bagula puratanpara|bagula madhyapara|bagula college para)$/i, po: "Bagula" },
  { match: /^(bara muragacha|muragacha colony|muragacha colony madhyapara|milannagar)$/i, po: "Muragacha Colony" },
  { match: /^sahapur$/i, po: "Haldipara" },
  { match: /^santinagar$/i, po: "Santinagar" },
  { match: /^hatibandha$/i, po: "Santinagar" },
  { match: /^madna$/i, po: "Hatibandha" },
];

// Date helpers
const todayISO = () => new Date().toISOString().split("T")[0];
const maxDateISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
};

interface Dependent {
  relation: string;
  title: string;
  name: string;
  parentRelType: string;
  parentName: string;
  aadhaar: string;
}

export function DependentCertificateForm({ unrestrictedDate = false }: { unrestrictedDate?: boolean } = {}) {
  const currentWorkflow = getCachedWorkflowRules();
  const currentAuthority = getCachedAuthoritySettings();
  const [memoNo, setMemoNo] = useState(() => {
    return currentWorkflow.dependentMemoPrefix
      ? formatMemoPrefix(currentWorkflow.dependentMemoPrefix)
      : `/BGL-II/${new Date().getFullYear()}`;
  });
  const [certDate, setCertDate] = useState(todayISO());
  const [appTitle, setAppTitle] = useState("Shri");
  const [appName, setAppName] = useState("");
  const [appRelType, setAppRelType] = useState("S/O");
  const [appParentTitle, setAppParentTitle] = useState("Shri");
  const [appParent, setAppParent] = useState("");
  const [appAadhaar, setAppAadhaar] = useState("");
  const [empId, setEmpId] = useState("");
  const [dept, setDept] = useState("Indian Railways");
  const [deptManual, setDeptManual] = useState("");
  const [village, setVillage] = useState("");
  const [villageManual, setVillageManual] = useState("");
  const [poUserOverride, setPoUserOverride] = useState(false);
  const [po, setPo] = useState("");
  const [poManual, setPoManual] = useState("");
  const [ps, setPs] = useState("Hanskhali");
  const [block, setBlock] = useState("Hanskhali");
  const [dependents, setDependents] = useState<Dependent[]>([
    { relation: "Wife", title: "Smt.", name: "", parentRelType: "S/O", parentName: "", aadhaar: "" }
  ]);
  const certRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);

  const MAX_DATE = useMemo(() => maxDateISO(), []);
  const TODAY = useMemo(() => todayISO(), []);

  const [villagesData, setVillagesData] = useState<{ name: string; postOffices: string[] }[]>([]);

  useEffect(() => {
    let active = true;
    const fetchVillages = () => {
      MasterDataService.getActiveVillagesWithPostOffices().then(data => {
        if (active) {
          setVillagesData(data.map(v => ({ name: v.name, postOffices: v.postOffices.map(po => po.name) })));
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

  const activeVillages = villagesData.length > 0 ? villagesData.map(v => v.name) : VILLAGES;
  const activePostOffices = useMemo(() => {
    if (villagesData.length > 0 && village && village !== "Other") {
      const selected = villagesData.find(v => v.name === village);
      return selected ? selected.postOffices : [];
    }
    return POST_OFFICES;
  }, [village, villagesData]);

  const [preparing, setPreparing] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const [certStatus, setCertStatus] = useState("Pending Signature & Memo Registration");
  const [reprintMode, setReprintMode] = useState(false);
  const [reprintStamp, setReprintStamp] = useState<Date | null>(null);
  const isApproved = certStatus === "Approved";

  // Load saved record if ?load=<id>
  useEffect(() => {
    const id = searchParams.get("load");
    if (!id) return;
    const reprint = searchParams.get("reprint") === "1";
    (async () => {
      const { data, error } = await supabase
        .from("dependent_certificates")
        .select("data, verification_id, status, memo_no, issue_date")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) { toast.error("Could not load saved record."); return; }
      const d: any = data.data || {};
      const setters: Record<string, any> = {
        memoNo: setMemoNo, certDate: setCertDate, appTitle: setAppTitle, appName: setAppName,
        appRelType: setAppRelType, appParentTitle: setAppParentTitle, appParent: setAppParent,
        appAadhaar: setAppAadhaar, empId: setEmpId, dept: setDept, deptManual: setDeptManual,
        village: setVillage, villageManual: setVillageManual, po: setPo, poManual: setPoManual,
        ps: setPs, block: setBlock, dependents: setDependents,
      };
      Object.entries(d).forEach(([k, v]) => setters[k]?.(v));
      if (d.po) setPoUserOverride(true);
      if (data.verification_id) setVerificationId(data.verification_id as string);
      if (data.status) setCertStatus(data.status as string);
      if (data.status === "Approved") {
        if (data.memo_no) setMemoNo(data.memo_no as string);
        if (data.issue_date) setCertDate(data.issue_date as string);
      }
      toast.success("Record loaded");
      if (reprint && data.status === "Approved") {
        try {
          await supabase.rpc("log_office_activity", {
            _action_type: "dependent.reprint",
            _target_table: "dependent_certificates",
            _target_id: id,
            _metadata: { verification_id: data.verification_id, memo_no: data.memo_no } as any,
          });
        } catch { /* non-blocking */ }
        setReprintMode(true);
        setReprintStamp(new Date());
        setTimeout(async () => {
          await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
          autoDownloadPDF(`Dependent_Certificate_Reprint_${(d.appName || appName).replace(/\s+/g, "_")}.pdf`);
        }, 800);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoDownloadPDF = async (fileName: string) => {
    try {
      const area = document.querySelector(".certificate-area") as HTMLElement | null;
      if (!area) return;
      const [html2canvasModule, jspdfModule] = await getPdfLibraries();
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jspdfModule;
      const canvas = await html2canvas(area, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = 210, pdfH = 297;
      const imgH = (canvas.height * pdfW) / canvas.width;
      const y = Math.max(0, (pdfH - imgH) / 2);
      pdf.addImage(imgData, "JPEG", 0, y, pdfW, Math.min(imgH, pdfH));
      pdf.save(fileName);
    } catch (e) { console.warn("PDF download failed", e); }
  };

  const saveRecord = async () => {
    if (!appName.trim()) { toast.error("Applicant name is required"); return; }
    setIsSaving(true);
    setPreparing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        toast.error("Sign in as admin to register records.");
        setIsSaving(false); setPreparing(false);
        return;
      }
      const year = new Date().getFullYear();
      let vid: string;
      const { data: vidData, error: vidErr } = await supabase.rpc("generate_verification_id", { _kind: "dependent", _year: year });
      if (!vidErr && vidData) {
        vid = String(vidData);
      } else {
        const rand = Math.floor(10000 + Math.random() * 90000);
        vid = `DEPENDENT-${year}-${rand}`;
      }

      const villageVal = village === "Other" ? villageManual : village;
      // Never persist full Aadhaar numbers — store only the last 4 digits.
      const sanitizedDependents = dependents.map(({ aadhaar, ...rest }) => ({
        ...rest,
        aadhaarLast4: aadhaar ? aadhaar.slice(-4) : null,
      }));
      const data = {
        appTitle, appName, appRelType, appParentTitle, appParent,
        empId, dept, deptManual, village, villageManual, po, poManual,
        ps, block, dependents: sanitizedDependents,
        applicantAadhaarLast4: appAadhaar ? appAadhaar.slice(-4) : null,
      };

      const { error } = await supabase.from("dependent_certificates").insert({
        verification_id: vid,
        memo_no: null,
        cert_date: null,
        status: "Pending Signature & Memo Registration",
        applicant_name: appName,
        village: villageVal || null,
        department: effectiveDept,
        data: data as any,
        created_by: user.id,
      });
      if (error) {
        toast.error(error.message);
        setIsSaving(false); setPreparing(false); return;
      }
      setVerificationId(vid);
      setCertStatus("Pending Signature & Memo Registration");
      toast.success("Registered — Verification ID: " + vid);

      // Preparing… ~3 seconds, then auto-download
      setTimeout(async () => {
        setPreparing(false);
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        autoDownloadPDF(`Dependent_Certificate_${appName.replace(/\s+/g, "_")}.pdf`);
        setIsSaving(false);
      }, 3000);
    } catch (e: any) {
      toast.error(e?.message || String(e));
      setIsSaving(false); setPreparing(false);
    }
  };

  // Effective department value (handles "Other")
  const effectiveDept = dept === "Other" ? (deptManual || "__________") : dept;

  // Auto-map village → post office (unless user manually overrode)
  useEffect(() => {
    if (poUserOverride) return;
    const villageName = village === "Other" ? villageManual : village;
    if (!villageName) return;
    const rule = VILLAGE_PO_RULES.find(r => r.match.test(villageName));
    if (rule) {
      setPo(rule.po);
      setPoManual("");
    }
  }, [village, villageManual, poUserOverride]);

  // Clamp certDate to [today, today+7] unless unrestricted
  const handleCertDateChange = (val: string) => {
    if (!val) { setCertDate(TODAY); return; }
    if (unrestrictedDate) { setCertDate(val); return; }
    if (val < TODAY) { setCertDate(TODAY); return; }
    if (val > MAX_DATE) { setCertDate(MAX_DATE); return; }
    setCertDate(val);
  };

  const getPronoun = useCallback(() => {
    if (appTitle === "Shri") return { obj: "him", poss: "his" };
    if (appTitle === "Smt." || appTitle === "Kumari") return { obj: "her", poss: "her" };
    return { obj: "him/her", poss: "his/her" };
  }, [appTitle]);

  const updateDep = (i: number, field: keyof Dependent, value: string) => {
    setDependents(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-GB");
  };

  const dAppName = useDebounced(appName);
  const dAppAadhaar = useDebounced(appAadhaar);
  const dEmpId = useDebounced(empId);
  const dAppParent = useDebounced(appParent);
  const dDept = useDebounced(effectiveDept);
  const dVillageManual = useDebounced(villageManual);
  const dPoManual = useDebounced(poManual);
  const dPs = useDebounced(ps);
  const dBlock = useDebounced(block);
  const dDependents = useDebounced(dependents);

  const certBody = useMemo(() => {
    const p = getPronoun();
    const name = dAppName || "__________";
    const aadhaar = dAppAadhaar || "__________";
    let appStr = `This is to certify that ${appTitle ? appTitle + " " : ""}<strong>${name}</strong>`;
    if (aadhaar !== "__________") appStr += `, (Aadhaar No: <strong>${aadhaar}</strong>)`;
    if (dEmpId) appStr += `, (Employee ID: <strong>${dEmpId}</strong>)`;
    if (appRelType !== "None") appStr += `, ${appRelType} ${appParentTitle ? appParentTitle + " " : ""}<strong>${dAppParent || "__________"}</strong>`;

    const depPhrases = dDependents.map(dep => {
      let s = `${p.poss} <strong>${dep.relation}</strong>, ${dep.title ? dep.title + " " : ""}<strong>${dep.name || "__________"}</strong>`;
      const brackets: string[] = [];
      if (dep.parentRelType !== "None") brackets.push(`${dep.parentRelType} ${dep.parentName || "__________"}`);
      brackets.push(`Aadhaar No: <strong>${dep.aadhaar || "__________"}</strong>`);
      s += ` (${brackets.join(", ")})`;
      return s;
    });

    const depText = depPhrases.length === 1
      ? `${depPhrases[0]} is`
      : `${depPhrases.slice(0, -1).join("; ")} and ${depPhrases[depPhrases.length - 1]} are`;

    const villageVal = village === "Other" ? (dVillageManual || "__________") : (village || "__________");
    const poVal = po === "Other" ? (dPoManual || "__________") : (po || "__________");

    return `
      <p>${appStr}, resident of Village: <strong>${villageVal}</strong>, P.O.: <strong>${poVal}</strong>, P.S.: <strong>${dPs}</strong>, Block: <strong>${dBlock}</strong>, Dist.: Nadia, West Bengal, working under the <strong>${dDept}</strong>, has submitted a formal declaration regarding family dependents.</p>
      <p style="margin-top:14px">Based on the records produced, it is hereby certified that ${depText} financially and wholly dependent upon <strong>${p.obj}</strong> for maintenance, livelihood, and medical support.</p>
      <p style="margin-top:14px">This certificate is issued upon request to enable them to avail eligible medical facilities and other benefits as admissible under the applicable departmental rules.</p>
      <p style="margin-top:14px;font-size:12px;color:#666;font-style:italic">Certificate issued based on declaration. Gram Panchayat holds no legal liability beyond recorded verification.</p>
      <br><br>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px;gap:10px">
        <div style="text-align:center;min-width:30%">
          <div style="border-top:1px solid #000;padding-top:3px;width:180px">
            <p style="font-weight:bold;margin:0">Concerned Elected Ward Member</p>
          </div>
        </div>
        <div style="text-align:center">
          <div style="border:1px solid #000;padding:3px 6px;font-size:9px;font-family:monospace;background:#fafafa">
            <div style="font-size:7px;opacity:0.7">Verification ID</div>
            <div style="font-weight:bold">${verificationId || "Pending"}</div>
          </div>
        </div>
        <div style="text-align:center;min-width:30%">
          <div style="border-top:1px solid #000;padding-top:3px;width:180px;margin-left:auto">
            <p style="font-weight:bold;margin:0">(Prodhan)</p>
          </div>
        </div>
      </div>
      <div style="margin-top:20px;text-align:center;font-size:11px;color:#333;line-height:1.5;border-top:2px solid #ddd;padding-top:8px">
        This certificate shall ordinarily remain valid up to six (6) months from the Date of Issue.<br />
        To verify this certificate please visit <strong>https://deo-workflow-helper.lovable.app/verify</strong>
        ${reprintMode && reprintStamp ? `<div style="margin-top:6px;font-style:italic;color:#555">Reprinted from the Digital Administrative Register — ${reprintStamp.toLocaleString()}</div>` : ""}
      </div>
    `;
  }, [getPronoun, dAppName, dAppAadhaar, dEmpId, appTitle, appRelType, appParentTitle, dAppParent, dDependents, village, dVillageManual, po, dPoManual, dPs, dBlock, dDept, verificationId, reprintMode, reprintStamp]);



  const isGeneratingRef = useRef(false);

  // Wait for browser to finish layout/paint before capture
  const waitForPaint = () =>
    new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

  const handlePrint = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) return;
    document.body.classList.add("printing-cert");
    await waitForPaint();
    try {
      window.print();
    } finally {
      // Remove after print dialog returns
      setTimeout(() => document.body.classList.remove("printing-cert"), 500);
    }
  };

  const handleDownloadPDF = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!e || !e.isTrusted) return;
    if (e.detail === 0) return;
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    document.body.classList.add("hiding-ui");
    try {
      await waitForPaint();
      const area = document.querySelector(".certificate-area") as HTMLElement;
      if (!area || area.offsetHeight === 0) {
        console.warn("Certificate area not visible for PDF generation");
        return;
      }
      const [html2canvasModule, jspdfModule] = await getPdfLibraries();
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jspdfModule;
      const canvas = await html2canvas(area, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = 190;
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "JPEG", 10, 10, pdfW, pdfH);
      pdf.save("Dependent_Certificate.pdf");
    } finally {
      document.body.classList.remove("hiding-ui");
      isGeneratingRef.current = false;
    }
  };

  const inputCls = "w-full px-3 py-2.5 border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors";
  const selectCls = "px-2 py-2.5 border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/40 transition-colors";
  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-primary/5">
      {preparing && (
        <div className="no-print fixed inset-0 z-[999] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border rounded-xl px-8 py-6 shadow-2xl text-center">
            <div className="text-lg font-semibold text-foreground mb-2">Preparing certificate…</div>
            <div className="text-xs text-muted-foreground">Registering with Verification ID and generating PDF</div>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto px-3 py-6 space-y-6 overflow-x-hidden">
        {isApproved && (
          <div className="gov-card p-4 no-print border-t-4 border-emerald-600">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-emerald-700 font-bold text-base">Approved Dependent Certificate — Read Only</div>
                {verificationId && <div className="font-mono text-xs text-muted-foreground mt-0.5">Verification ID: {verificationId}</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => document.querySelector(".certificate-area")?.scrollIntoView({ behavior: "smooth" })} className="gov-btn-primary text-sm">View Certificate</button>
                <button onClick={async () => { setReprintMode(true); setReprintStamp(new Date()); await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))); autoDownloadPDF(`Dependent_Certificate_Reprint_${appName.replace(/\s+/g,"_")}.pdf`); }} className="gov-btn-secondary text-sm">Reprint Certificate</button>
                <button onClick={() => autoDownloadPDF(`Dependent_Certificate_${appName.replace(/\s+/g,"_")}.pdf`)} className="gov-btn-secondary text-sm">Download PDF</button>
                {verificationId && <a href={`/verify?id=${encodeURIComponent(verificationId)}`} target="_blank" rel="noopener" className="gov-btn-accent text-sm">Verify Online</a>}
                <button onClick={() => toast.info("Modify Request workflow will be enabled in a later update.")} className="gov-btn-accent text-sm">Modify Request</button>
                <button disabled title="Certificate History — coming soon" className="gov-btn-accent text-sm opacity-50 cursor-not-allowed">Certificate History</button>
              </div>
            </div>
          </div>
        )}
        {/* Form */}
        <div className="no-print mb-2">
          <BackButton fallbackUrl="/admin/dashboard" label="⬅️ Back to Dashboard" />
        </div>
        <fieldset disabled={isApproved} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="gov-card p-5 sm:p-6 no-print border-t-4 border-primary">
          <h1 className="text-lg sm:text-xl font-bold text-foreground border-l-4 border-primary pl-3 mb-6 font-heading">🏛️ Staff Dependent Certificate — Bagula II Gram Panchayat</h1>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-1.5">
              <label className={labelCls}>Memo No</label>
              <input value={memoNo} onChange={e => setMemoNo(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Issue Date {unrestrictedDate ? "(any date)" : "(today to +7 days)"}</label>
              <input
                type="date"
                value={certDate}
                min={unrestrictedDate ? undefined : TODAY}
                max={unrestrictedDate ? undefined : MAX_DATE}
                onChange={e => handleCertDateChange(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Employee Details */}
          <fieldset className="border rounded-lg p-4 mb-6 bg-primary/5 border-primary/20">
            <legend className="text-sm font-semibold text-foreground px-2">👤 Employee Details</legend>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Title & Name</label>
                <div className="flex gap-2">
                  <select value={appTitle} onChange={e => setAppTitle(e.target.value)} className={`${selectCls} w-24`}>
                    <option>Shri</option><option>Smt.</option><option>Kumari</option><option value="">None</option>
                  </select>
                  <input value={appName} onChange={e => setAppName(e.target.value)} placeholder="Full Name" className={`flex-1 ${inputCls}`} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Relation & Parent/Spouse</label>
                <div className="flex gap-1">
                  <select value={appRelType} onChange={e => setAppRelType(e.target.value)} className={`${selectCls} w-16`}>
                    <option>S/O</option><option>D/O</option><option>W/O</option><option>C/O</option><option>None</option>
                  </select>
                  <select value={appParentTitle} onChange={e => setAppParentTitle(e.target.value)} className={`${selectCls} w-20`}>
                    <option>Shri</option><option>Smt.</option><option>Late</option><option value="">None</option>
                  </select>
                  <input value={appParent} onChange={e => setAppParent(e.target.value)} placeholder="Name" className={`flex-1 ${inputCls}`} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Aadhaar Number</label>
                <MaskedInput value={appAadhaar} onChange={e => setAppAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="1234 5678 9012" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Employee ID</label>
                <input value={empId} onChange={e => setEmpId(e.target.value)} placeholder="Employee ID (optional)" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Department</label>
                <select value={dept} onChange={e => { setDept(e.target.value); if (e.target.value !== "Other") setDeptManual(""); }} className={inputCls}>
                  <optgroup label="State">
                    <option>Health (State)</option>
                    <option>Education (State)</option>
                    <option>Panchayat & Rural Development (State)</option>
                    <option>Police (State)</option>
                    <option>Agriculture (State)</option>
                  </optgroup>
                  <optgroup label="Central">
                    <option>Indian Railways</option>
                    <option>Postal Department</option>
                    <option>Defence</option>
                    <option>Banking</option>
                    <option>Central Government Services</option>
                  </optgroup>
                  <option value="Other">-- Other --</option>
                </select>
                {dept === "Other" && <input value={deptManual} onChange={e => setDeptManual(e.target.value)} placeholder="Type Department" className={`${inputCls} mt-1.5 border-dashed`} />}
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Village</label>
                <select value={village} onChange={e => { setVillage(e.target.value); setPoUserOverride(false); }} className={inputCls}>
                  <option value="">-- Select --</option>
                  {activeVillages.map(v => <option key={v}>{v}</option>)}
                  <option value="Other">-- Other --</option>
                </select>
                {village === "Other" && <input value={villageManual} onChange={e => { setVillageManual(e.target.value); setPoUserOverride(false); }} placeholder="Type Village" className={`${inputCls} mt-1.5 border-dashed`} />}
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Post Office {!poUserOverride && po && <span className="text-[10px] text-primary normal-case font-normal">(auto)</span>}</label>
                <select value={po} onChange={e => { setPo(e.target.value); setPoUserOverride(true); }} className={inputCls}>
                  <option value="">-- Select --</option>
                  {activePostOffices.map(p => <option key={p}>{p}</option>)}
                  <option value="Other">-- Other --</option>
                </select>
                {po === "Other" && <input value={poManual} onChange={e => { setPoManual(e.target.value); setPoUserOverride(true); }} placeholder="Type PO" className={`${inputCls} mt-1.5 border-dashed`} />}
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Police Station</label>
                <input value={ps} onChange={e => setPs(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Block</label>
                <input value={block} onChange={e => setBlock(e.target.value)} className={inputCls} />
              </div>
            </div>
          </fieldset>

          {/* Dependents */}
          <fieldset className="border rounded-lg p-4 bg-primary/5 border-primary/20">
            <legend className="text-sm font-semibold text-foreground px-2">👪 Dependent Family Members</legend>
            <div className="mb-3">
              <label className={labelCls}>Count: </label>
              <select value={dependents.length} onChange={e => {
                const n = parseInt(e.target.value);
                setDependents(prev => {
                  if (n > prev.length) return [...prev, ...Array(n - prev.length).fill(null).map(() => ({ relation: "Wife", title: "Smt.", name: "", parentRelType: "S/O", parentName: "", aadhaar: "" }))];
                  return prev.slice(0, n);
                });
              }} className={`${selectCls} ml-2`}>
                {[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            {dependents.map((dep, i) => (
              <div key={i} className="bg-card border border-primary/15 rounded-lg p-3 sm:p-4 mb-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className={labelCls}>Relation</label>
                  <select value={dep.relation} onChange={e => updateDep(i, "relation", e.target.value)} className={inputCls}>
                    {["Wife", "Husband", "Mother", "Father", "Son", "Daughter", "Brother", "Sister"].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Title & Name</label>
                  <div className="flex gap-1">
                    <select value={dep.title} onChange={e => updateDep(i, "title", e.target.value)} className={`${selectCls} w-20`}>
                      <option>Shri</option><option>Smt.</option><option>Kumari</option><option>Master</option><option value="">None</option>
                    </select>
                    <input value={dep.name} onChange={e => updateDep(i, "name", e.target.value)} placeholder="Name" className={`flex-1 ${inputCls}`} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Parent/Spouse</label>
                  <div className="flex gap-1">
                    <select value={dep.parentRelType} onChange={e => updateDep(i, "parentRelType", e.target.value)} className={`${selectCls} w-16`}>
                      <option>S/O</option><option>D/O</option><option>W/O</option><option>C/O</option><option>None</option>
                    </select>
                    <input value={dep.parentName} onChange={e => updateDep(i, "parentName", e.target.value)} placeholder="Name" className={`flex-1 ${inputCls}`} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Aadhaar</label>
                  <MaskedInput value={dep.aadhaar} onChange={e => updateDep(i, "aadhaar", e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="Number" className={inputCls} />
                </div>
              </div>
            ))}
          </fieldset>
        </div>
        </fieldset>


        {/* Certificate Preview */}
        <div className="gov-card p-3 sm:p-6 print-preview-wrapper">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 border-l-4 border-primary pl-3 no-print">📄 Certificate Preview</h3>
          <div className="bg-muted/30 p-3 sm:p-8 rounded-lg flex justify-center overflow-x-auto print-preview-inner">
            <div className="certificate-area" style={{ maxWidth: "210mm", marginLeft: "auto", marginRight: "auto" }}>
              <div ref={certRef} className="cert-print-container">
                <div className="certificate-paper" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.12)" }}>
                <div className="cert-inner-border">
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(-45deg)", fontSize: "70px", color: "rgba(0,0,0,0.04)", zIndex: 0, whiteSpace: "nowrap", fontWeight: "bold" }}>
                    বগুলা ২ নং গ্রাম পঞ্চায়েত
                  </div>
                  <div style={{ textAlign: "center", marginBottom: "5px", position: "relative", zIndex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "#666" }}>Office of the</div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", textTransform: "uppercase", color: "#444" }}>BAGULA II GRAM PANCHAYAT</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "#666" }}>(UNDER HANSKHALI PANCHAYAT SAMITY)</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "#666" }}>Vill: Stationpara, P.O.: Bagula, P.S.: Hanskhali, Nadia, W.B.</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "#666" }}>Email: <span style={{ background: "#d9d9d9", padding: "0 5px" }}>bagula2nogp111@gmail.com</span></div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px", borderBottom: "3px double #000", paddingBottom: "10px", position: "relative", zIndex: 1 }}>
                    <div><div style={{ color: "#c55a11", fontWeight: "bold", fontSize: "13px" }}>Smt. Susmita Biswas Barman</div><div style={{ color: "#2e74b5", fontWeight: "bold", fontSize: "13px" }}>Prodhan</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ color: "#c55a11", fontWeight: "bold", fontSize: "13px" }}>Sri Manaranjan Bhowmick</div><div style={{ color: "#2e74b5", fontWeight: "bold", fontSize: "13px" }}>Upa-Prodhan</div></div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", margin: "25px 0", fontSize: "16px", position: "relative", zIndex: 1 }}>
                    <span>Memo No: {certStatus === "Approved" ? memoNo : `________/BGL-II/${new Date().getFullYear()}`}</span>
                    <span>Date: {certStatus === "Approved" && certDate ? formatDate(certDate) : "____/____/________"}</span>
                  </div>
                  <div style={{ textAlign: "center", fontSize: "24px", fontWeight: "bold", textDecoration: "underline", margin: "30px 0", position: "relative", zIndex: 1 }}>To Whom It May Concern</div>
                  <div style={{ fontSize: "18px", lineHeight: 1.7, textAlign: "justify", position: "relative", zIndex: 1 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(certBody, { ALLOWED_TAGS: ["p", "br", "strong", "em", "span", "div"], ALLOWED_ATTR: ["style"] }) }} />
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        {isApproved && (
          <div className="max-w-3xl mx-auto mb-2 rounded-md border border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-900 no-print">
            {verificationId && <div className="font-mono text-xs mb-1">VID: {verificationId}</div>}
            Approved certificate — read only. Editing is disabled. Use <strong>Reprint</strong> or <strong>Modify Request</strong>.
          </div>
        )}
        <div className="flex flex-wrap gap-4 justify-center no-print pb-8">
          <button type="button" onClick={saveRecord} disabled={isSaving || isApproved} className="gov-btn-secondary min-w-[160px] min-h-[48px] text-base disabled:opacity-60">
            {isSaving ? "Saving…" : "💾 Save Record"}
          </button>
          <button type="button" onClick={handlePrint} className="gov-btn-secondary min-w-[160px] min-h-[48px] text-base">🖨️ Print Certificate</button>
          <button type="button" onClick={handleDownloadPDF} className="gov-btn-primary min-w-[160px] min-h-[48px] text-base">📥 Download PDF</button>
        </div>
      </div>
    </div>
  );
}

export default function DependentCertificate() {
  return (
    <>
      <Helmet>
        <title>Dependent Certificate — Bagula II Gram Panchayat</title>
        <meta name="description" content="Issue and manage staff dependent certificates for Bagula II Gram Panchayat employees, Hanskhali Block, Nadia." />
        <link rel="canonical" href="https://deo-workflow-helper.lovable.app/dependent-certificate" />
        <meta property="og:title" content="Dependent Certificate — Bagula II Gram Panchayat" />
        <meta property="og:description" content="Issue and manage staff dependent certificates for Bagula II Gram Panchayat employees." />
        <meta property="og:url" content="https://deo-workflow-helper.lovable.app/dependent-certificate" />
      </Helmet>
      <DependentCertificateForm unrestrictedDate />
    </>
  );
}
