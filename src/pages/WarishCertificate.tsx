import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MaskedInput from "@/components/MaskedInput";
import { supabase } from "@/integrations/supabase/client";
import { MasterDataService } from "@/lib/api/MasterDataService";
import { BackButton } from "@/components/BackButton";
import {
  getCachedWorkflowRules,
  getCachedAuthoritySettings,
  getCachedValidationRules,
  formatMemoPrefix,
} from "@/lib/appSettings";

type Lang = "en" | "bn";
const T: Record<string, Record<Lang, string>> = {
  title: { en: "📜 Warish Certificate", bn: "📜 ওয়ারিশ সনদপত্র" },
  memoPrefix: { en: "Memo Prefix", bn: "মেমো উপসর্গ" },
  year: { en: "Year", bn: "বছর" },
  certDate: { en: "Certificate Date", bn: "সনদপত্রের তারিখ" },
  deceased: { en: "⚰️ Deceased Person", bn: "⚰️ মৃত ব্যক্তি" },
  nameDeceased: { en: "Name of Deceased", bn: "মৃত ব্যক্তির নাম" },
  fatherPrefix: { en: "Father/Husband Prefix", bn: "পিতা/স্বামীর উপসর্গ" },
  fatherName: { en: "Father/Husband Name", bn: "পিতা/স্বামীর নাম" },
  village: { en: "Village", bn: "গ্রাম" },
  postOffice: { en: "Post Office", bn: "ডাকঘর" },
  district: { en: "District", bn: "জেলা" },
  pin: { en: "PIN", bn: "পিন" },
  applicant: { en: "📝 Applicant", bn: "📝 আবেদনকারী" },
  fullName: { en: "Full Name", bn: "পুরো নাম" },
  relation: { en: "Relation with Deceased", bn: "মৃত ব্যক্তির সাথে সম্পর্ক" },
  guardianName: { en: "Guardian Name", bn: "অভিভাবকের নাম" },
  mobile: { en: "Mobile (10 digits)", bn: "মোবাইল (১০ সংখ্যা)" },
  aadhaar: { en: "Aadhaar (optional, 12 digits)", bn: "আধার (ঐচ্ছিক, ১২ সংখ্যা)" },
  heirs: { en: "👪 Warish Details (Successors)", bn: "👪 ওয়ারিশ বিবরণ (উত্তরসূরি)" },
  prefix: { en: "Prefix", bn: "উপসর্গ" },
  name: { en: "Name", bn: "নাম" },
  carePrefix: { en: "Care Prefix", bn: "কেয়ার উপসর্গ" },
  careName: { en: "Care Name", bn: "কেয়ার নাম" },
  relationLabel: { en: "Relation", bn: "সম্পর্ক" },
  age: { en: "Age", bn: "বয়স" },
  addHeir: { en: "+ Add Heir", bn: "+ উত্তরাধিকারী যোগ করুন" },
  verification: { en: "✅ Verification", bn: "✅ যাচাইকরণ" },
  withAffidavit: { en: "With Affidavit", bn: "হলফনামা সহ" },
  withoutAffidavit: { en: "Without Affidavit", bn: "হলফনামা ছাড়া" },
  court: { en: "Court", bn: "আদালত" },
  magistrateType: { en: "Magistrate Type", bn: "ম্যাজিস্ট্রেট ধরন" },
  serialNo: { en: "Serial No", bn: "ক্রমিক নং" },
  affidavitDate: { en: "Affidavit Date", bn: "হলফনামার তারিখ" },
  neighbourSig: { en: "Number of Neighbour Signatures", bn: "প্রতিবেশীর স্বাক্ষর সংখ্যা" },
  wardSection: { en: "🏘️ Ward Member & Verification", bn: "🏘️ ওয়ার্ড সদস্য ও যাচাইকরণ" },
  wardMember: { en: "Ward Member (Internal)", bn: "ওয়ার্ড সদস্য (অভ্যন্তরীণ)" },
  verifiedByLabel: { en: "Verified By (optional, appears on certificate)", bn: "যাচাইকারী (ঐচ্ছিক, সনদে দেখা যাবে)" },
  generate: { en: "📜 Generate Certificate", bn: "📜 সনদপত্র তৈরি করুন" },
  saveDraft: { en: "💾 Save Draft", bn: "💾 খসড়া সংরক্ষণ" },
  loadDraft: { en: "📂 Load Draft", bn: "📂 খসড়া লোড" },
  exportJSON: { en: "📤 Export JSON", bn: "📤 JSON রপ্তানি" },
  importJSON: { en: "📥 Import JSON", bn: "📥 JSON আমদানি" },
  print: { en: "🖨️ Print", bn: "🖨️ মুদ্রণ" },
  closePreview: { en: "✕ Close Preview", bn: "✕ প্রিভিউ বন্ধ করুন" },
  specifyRelation: { en: "Specify relation", bn: "সম্পর্ক উল্লেখ করুন" },
  subHeir: { en: "Sub-Heir", bn: "উপ-উত্তরাধিকারী" },
  of: { en: "of", bn: "এর" },
  remove: { en: "✕ Remove", bn: "✕ মুছুন" },
  courtName: { en: "Court name", bn: "আদালতের নাম" },
  langToggle: { en: "বাংলা", bn: "English" },
  daughterCareOption: { en: "Daughter Care Of", bn: "কন্যার কেয়ার অফ" },
  useFather: { en: "Use Father (Deceased)", bn: "পিতা (মৃত) ব্যবহার করুন" },
  useHusband: { en: "Enter Husband Name", bn: "স্বামীর নাম লিখুন" },
  deceasedLabel: { en: "Deceased", bn: "মৃত" },
  addSubHeirs: { en: "+ Add Sub-Heirs", bn: "+ উপ-উত্তরাধিকারী যোগ করুন" },
};

const VILLAGES = [
  "Milannagar", "Bara Muragacha", "Muragacha Colony", "Muragacha Colony Madhyapara",
  "Bagula Puratanpara", "Bagula Madhyapara", "Bagula Station Para", "Bagula College Para",
  "Sahapur", "Hatibandha", "Santinagar", "Madna"
];
const POST_OFFICES = ["Bagula", "Muragacha Colony", "Haldipara", "Santinagar"];
const RELATIONS = ["Son", "Daughter", "Wife", "Husband", "Father", "Mother", "Brother", "Sister", "Other"];
const PREFIXES = ["Sri", "Smt", "Mr.", "Late", "Kumari", "Master", ""];
const CARE_PREFIXES = ["Mr.", "Sri", "Late", ""]; // "None" is empty
const WARD_MEMBERS = [
  "NANDINI BISWAS", "KUSUM BAIRAGI", "ITI BISWAS SANNYASI", "SUPRIYA BISWAS", "UJJAL BISWAS",
  "SABITA BISWAS DAS", "NIBADITA DUTTA ROY", "AKHIL KUMAR BISWAS", "SIMA TIKADAR", "KOUSHALLYA MRIDHA",
  "SUSMITA BISWAS BARMAN", "BANDANA BARMAN", "GOBINDA GHOSH", "GAUTAM BISWAS", "TANUSHREE BISWAS",
  "RABINDRA NATH GHOSH", "ITI MAJUMDER", "SUKHEN MONDAL", "CHANI BISWAS", "RANI DUTTA",
  "SOMA BISWAS", "RAKESH BISWAS", "KANAK BISWAS", "SUJOY BISWAS", "CHAMPA SIKDER",
  "SWAPAN KUMAR SARKAR", "APARNA PODDAR", "SHARAT MINJI", "FIROJ MANDAL", "MANORANJAN BHOWMICK"
];

interface Heir {
  prefix: string; name: string; carePrefix: string; careName: string;
  relation: string; age: string; deceased: boolean;
  subHeirs: SubHeir[];
  /** Only asked when the successor is deceased. Sub-successors stay optional. */
  hasLegalSuccessors?: "yes" | "no" | null;
  daughterCareMode?: "father" | "husband";
  husbandName?: string;
}
interface SubHeir {
  prefix: string; name: string; carePrefix: string; careName: string;
  relation: string; age: string;
}

let html2canvasPromise: Promise<typeof import("html2canvas")> | null = null;
let jsPdfPromise: Promise<typeof import("jspdf")> | null = null;

function WarishCertificateForm() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const currentWorkflow = getCachedWorkflowRules();
  const currentAuthority = getCachedAuthoritySettings();
  const currentValidation = getCachedValidationRules();

  const [memoPrefix, setMemoPrefix] = useState(() => {
    return currentWorkflow.warishMemoPrefix ? formatMemoPrefix(currentWorkflow.warishMemoPrefix) : "/BGL-II/";
  });
  const [memoYear, setMemoYear] = useState(() => String(new Date().getFullYear()));
  const [certDate, setCertDate] = useState(new Date().toISOString().split("T")[0]);

  const [activeRelations, setActiveRelations] = useState(RELATIONS);
  const [activePrefixes, setActivePrefixes] = useState(PREFIXES);
  const [villagesData, setVillagesData] = useState<{name: string, postOffices: string[]}[]>([]);

  useEffect(() => {
    let active = true;
    const loadData = () => {
      MasterDataService.getActiveVillagesWithPostOffices().then(data => {
        if (active) setVillagesData(data.map(v => ({ name: v.name, postOffices: v.postOffices.map(po => po.name) })));
      });
      MasterDataService.getActiveMasterData('relation').then(data => {
        if (active && data && data.length > 0) setActiveRelations(data.map((d: any) => d.label));
      });
      MasterDataService.getActiveMasterData('prefix').then(data => {
        if (active && data && data.length > 0) setActivePrefixes(data.map((d: any) => d.label));
      });
    };
    loadData();

    const handleUpdate = () => {
      MasterDataService.clearCache();
      loadData();
    };

    window.addEventListener("bagula_master_data_updated", handleUpdate);
    return () => {
      active = false;
      window.removeEventListener("bagula_master_data_updated", handleUpdate);
    };
  }, []);


  const [deceasedName, setDeceasedName] = useState("Nityananda Biswas");
  const [fatherPrefix, setFatherPrefix] = useState("Late");
  const [fatherName, setFatherName] = useState("Shib Charan Biswas");
  const [village, setVillage] = useState("Bara Muragacha");

  const activeVillages = villagesData.length > 0 ? villagesData.map(v => v.name) : VILLAGES;
  const activePostOffices = React.useMemo(() => {
    if (villagesData.length > 0 && village && village !== "Other") {
      const selected = villagesData.find(v => v.name === village);
      return selected ? selected.postOffices : [];
    }
    return POST_OFFICES;
  }, [village, villagesData]);
  const [postOffice, setPostOffice] = useState("Bagula");
  const [district, setDistrict] = useState("Nadia");
  const [pin, setPin] = useState("741502");
  const [applicantName, setApplicantName] = useState("Nitish Biswas");
  const [applicantRelation, setApplicantRelation] = useState("Son");
  const [applicantRelOther, setApplicantRelOther] = useState("");
  const [guardianName, setGuardianName] = useState("Late Nityananda Biswas");
  const [mobile, setMobile] = useState("9876543210");
  const [aadhaar, setAadhaar] = useState("123456789012");
  const [verificationType, setVerificationType] = useState<"affidavit" | "without">("affidavit");
  const [court, setCourt] = useState("Ranaghat Court");
  const [courtOther, setCourtOther] = useState("");
  const [magistrateType, setMagistrateType] = useState("1st Class Judicial Magistrate");
  const [serialNo, setSerialNo] = useState("4536");
  const [affidavitDate, setAffidavitDate] = useState(new Date().toISOString().split("T")[0]);
  const [numNeighbours, setNumNeighbours] = useState(2);
  const [wardMember, setWardMember] = useState("NANDINI BISWAS");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [verificationId, setVerificationId] = useState<string>("");
  const [certStatus, setCertStatus] = useState<string>("Pending Signature & Memo Registration");
  const [reprintMode, setReprintMode] = useState<boolean>(false);
  const [reprintStamp, setReprintStamp] = useState<Date | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const t = (key: string) => T[key]?.[lang] || key;
  const isApproved = certStatus === "Approved";

  const [heirs, setHeirs] = useState<Heir[]>([
    { prefix: "Smt", name: "Sabita Biswas", carePrefix: "Late", careName: "Nityananda Biswas", relation: "Wife", age: "55", deceased: false, subHeirs: [] },
    { prefix: "Smt", name: "Jharna Biswas", carePrefix: "Late", careName: "Nityananda Biswas", relation: "Daughter", age: "32", deceased: false, subHeirs: [], daughterCareMode: "father" },
    { prefix: "Sri", name: "Anadi Biswas", carePrefix: "Late", careName: "Nityananda Biswas", relation: "Son", age: "28", deceased: false, subHeirs: [] },
    { prefix: "Sri", name: "Nitish Biswas", carePrefix: "Late", careName: "Nityananda Biswas", relation: "Son", age: "25", deceased: false, subHeirs: [] },
    {
      prefix: "Late", name: "Samir Biswas", carePrefix: "Late", careName: "Nityananda Biswas", relation: "Son", age: "", deceased: true,
      subHeirs: [
        { prefix: "Smt", name: "Debika Biswas", carePrefix: "Late", careName: "Samir Biswas", relation: "Wife", age: "60" },
        { prefix: "Smt", name: "Shreya Biswas", carePrefix: "Late", careName: "Samir Biswas", relation: "Daughter", age: "30" },
        { prefix: "Sri", name: "Debargho Biswas", carePrefix: "Late", careName: "Samir Biswas", relation: "Son", age: "24" },
      ]
    },
  ]);

  const certRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  /** Loaded/imported data may omit subHeirs — normalise so renders never hit undefined.map(). */
  const setHeirsSafe = (val: any) =>
    setHeirs(
      (Array.isArray(val) ? val : []).map((h: any) => ({
        ...h,
        subHeirs: Array.isArray(h?.subHeirs) ? h.subHeirs : [],
      })) as Heir[]
    );


  useEffect(() => {
    const id = searchParams.get("load");
    if (!id) return;
    const reprint = searchParams.get("reprint") === "1";
    (async () => {
      const { data, error } = await supabase
        .from("warish_certificates")
        .select("data, verification_id, status, memo_no, issue_date")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        alert("Could not load saved certificate.");
        return;
      }
      const d: any = data.data || {};
      const setters: Record<string, any> = { memoPrefix: setMemoPrefix, memoYear: setMemoYear, certDate: setCertDate, deceasedName: setDeceasedName, fatherPrefix: setFatherPrefix, fatherName: setFatherName, village: setVillage, postOffice: setPostOffice, district: setDistrict, pin: setPin, applicantName: setApplicantName, applicantRelation: setApplicantRelation, applicantRelOther: setApplicantRelOther, guardianName: setGuardianName, verificationType: setVerificationType, court: setCourt, courtOther: setCourtOther, magistrateType: setMagistrateType, serialNo: setSerialNo, affidavitDate: setAffidavitDate, numNeighbours: setNumNeighbours, wardMember: setWardMember, verifiedBy: setVerifiedBy, heirs: setHeirsSafe };
      Object.entries(d).forEach(([k, v]) => setters[k]?.(v));
      if (data.verification_id) setVerificationId(data.verification_id as string);
      if (data.status) setCertStatus(data.status as string);
      // For approved certificates, override memoPrefix/memoYear/certDate from authoritative DB values
      if (data.status === "Approved" && data.memo_no) {
        // memo_no format: "<serial>/BGL-II/<year>" — reuse the prefix + year segmentation the renderer expects
        const m = /^(.*\/)(\d{4})$/.exec(data.memo_no as string);
        if (m) { setMemoPrefix(m[1]); setMemoYear(m[2]); }
        if (data.issue_date) setCertDate(data.issue_date as string);
      }
      setShowPreview(true);
      if (reprint && data.status === "Approved") {
        // Log the reprint (best-effort) and auto-download after paint
        try {
          await supabase.rpc("log_office_activity", {
            _action_type: "warish.reprint",
            _target_table: "warish_certificates",
            _target_id: id,
            _metadata: { verification_id: data.verification_id, memo_no: data.memo_no } as any,
          });
        } catch { /* non-blocking */ }
        setReprintMode(true);
        setReprintStamp(new Date());
        setTimeout(async () => {
          await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
          autoDownloadPDF(`Warish_Certificate_Reprint_${(d.deceasedName || deceasedName).replace(/\s+/g, "_")}.pdf`);
        }, 800);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Note: prefix/carePrefix are always respected as administrator selected.
  // No auto-Late is inserted for any relation, including Daughter → W/O.
  const applyRelationLogic = (heir: Heir, relation: string): Heir => {
    return { ...heir, relation };
  };

  const updateHeir = (i: number, field: keyof Heir, value: any) => {
    setHeirs(prev => prev.map((h, idx) => {
      if (idx !== i) return h;
      if (field === "relation") {
        return applyRelationLogic(h, value as string);
      }
      if (field === "deceased" && !value) {
        if (h.subHeirs.length > 0) {
          const confirmed = window.confirm("Unchecking 'Deceased' will remove all sub-heirs. Continue?");
          if (!confirmed) return h;
        }
        return { ...h, deceased: false, subHeirs: [], hasLegalSuccessors: null };
      }
      if (field === "deceased" && value) {
        // Ask the question first; do not assume sub-successors are required.
        return { ...h, deceased: true, hasLegalSuccessors: h.hasLegalSuccessors ?? null };
      }
      if (field === "hasLegalSuccessors") {
        if (value === "no") {
          if (h.subHeirs.length > 0) {
            const confirmed = window.confirm("Answering 'No' will remove the sub-successors already added. Continue?");
            if (!confirmed) return h;
          }
          return { ...h, hasLegalSuccessors: "no", subHeirs: [] };
        }
        return { ...h, hasLegalSuccessors: "yes" };
      }
      if (field === "daughterCareMode") {
        // Do not auto-force "Late" — administrator sets carePrefix explicitly.
        if (value === "father") {
          return { ...h, daughterCareMode: "father", careName: deceasedName };
        } else {
          return { ...h, daughterCareMode: "husband", careName: h.husbandName || "" };
        }
      }
      if (field === "husbandName") {
        return { ...h, husbandName: value, careName: value };
      }
      return { ...h, [field]: value };
    }));
  };

  const addHeir = () => {
    setHeirs(prev => [...prev, { prefix: "Sri", name: "", carePrefix: "Late", careName: deceasedName, relation: "Son", age: "", deceased: false, subHeirs: [] }]);
  };

  const removeHeir = (i: number) => setHeirs(prev => prev.filter((_, idx) => idx !== i));

  const addSubHeir = (i: number) => {
    setHeirs(prev => prev.map((h, idx) => idx === i ? {
      ...h,
      subHeirs: [...h.subHeirs, { prefix: "Sri", name: "", carePrefix: "Late", careName: h.name, relation: "Son", age: "" }]
    } : h));
  };

  const removeSubHeir = (hi: number, si: number) => {
    setHeirs(prev => prev.map((h, idx) => idx === hi ? { ...h, subHeirs: h.subHeirs.filter((_, j) => j !== si) } : h));
  };

  const updateSubHeir = (hi: number, si: number, field: keyof SubHeir, value: string) => {
    setHeirs(prev => prev.map((h, idx) => {
      if (idx !== hi) return h;
      const updatedSubs = h.subHeirs.map((s, j) => {
        if (j !== si) return s;
        const updated = { ...s, [field]: value };
        // Only auto-fill careName; never auto-force "Late". Administrator controls carePrefix.
        if (field === "relation") {
          if (value === "Son" || value === "Wife" || value === "Mother") {
            updated.careName = h.name;
          }
        }
        return updated;
      });
      return { ...h, subHeirs: updatedSubs };
    }));
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "";
  const isProdhan = wardMember === currentAuthority.pradhanName || wardMember === "SUSMITA BISWAS BARMAN";
  const courtName = court === "Other" ? courtOther : court;

  // Count total living heirs (non-deceased main + all sub-heirs)
  const totalLivingHeirs = heirs.reduce((count, h) => {
    if (!h.deceased) return count + 1;
    return count + h.subHeirs.length;
  }, 0);

  const getDeclarationText = () => {
    const name = applicantName || "the applicant";
    const heirWord = totalLivingHeirs === 1 ? "is the sole Successor" : "are the Successors";
    const successorWord = totalLivingHeirs === 1 ? "successor" : "successors";

    if (verificationType === "affidavit") {
      if (isProdhan) {
        return [
          `This certificate is issued on the basis of an affidavit sworn before a ${magistrateType} at ${courtName}, bearing Serial No. ${serialNo} dated ${formatDate(affidavitDate)}, which has been submitted by ${name} before the office of Bagula II Gram Panchayat. The contents and particulars mentioned in the said affidavit have been declared by ${name} to be true and correct to the best of his/her knowledge and belief.`,
          `The above-named ${successorWord} ${heirWord} of Late ${deceasedName}. The statement of succession has been placed on record on the basis of the information furnished by the applicant along with supporting documents and declarations. Bagula II Gram Panchayat has recorded the said declaration as presented before the office for administrative reference only.`
        ];
      }
      return [
        `This certificate is issued on the basis of an affidavit sworn before a ${magistrateType} at ${courtName}, bearing Serial No. ${serialNo} dated ${formatDate(affidavitDate)}, submitted by ${name} before Bagula II Gram Panchayat. The claim of succession mentioned herein has been declared by ${name} in the said affidavit.`,
        `The above-named ${successorWord} ${heirWord} of Late ${deceasedName}. The application and supporting affidavit have been placed before the concerned elected ward member of Bagula II Gram Panchayat, who has verified the statement and endorsed the application in good faith based on the declaration furnished by the applicant.`
      ];
    } else {
      if (isProdhan) {
        return [
          `This certificate is issued on the basis of a written application submitted by ${name} before the office of Bagula II Gram Panchayat along with supporting signatures of local neighbours of the deceased person affirming the statement made by ${name}. The information regarding the legal ${successorWord} of the deceased has been declared by ${name} in the said application.`,
          `The above-named ${successorWord} ${heirWord} of Late ${deceasedName}. The Gram Panchayat has recorded the particulars of succession as furnished by the applicant and supported by the local declarations submitted along with the application.`
        ];
      }
      return [
        `This certificate is issued on the basis of a written application submitted by ${name} before the office of Bagula II Gram Panchayat along with supporting signatures of local neighbours of the deceased person. The claim of succession stated in the application has been declared by ${name} and placed before the concerned elected ward member.`,
        `The above-named ${successorWord} ${heirWord} of Late ${deceasedName}. The concerned elected ward member of Bagula II Gram Panchayat has verified and signed the application in good faith on the basis of the declarations and local attestations submitted along with the application.`
      ];
    }
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!deceasedName.trim()) errors.push("Deceased name is required");
    if (!fatherName.trim()) errors.push("Father/Husband name is required");
    if (!applicantName.trim()) errors.push("Applicant name is required");
    if (!guardianName.trim()) errors.push("Guardian name is required");

    // Dynamic phone validation
    let phoneRx: RegExp;
    try {
      phoneRx = new RegExp(currentValidation.mobileRegex || "^[6-9]\\d{9}$");
    } catch {
      phoneRx = /^[6-9]\d{9}$/;
    }
    if (!phoneRx.test(mobile)) {
      errors.push("Mobile number must be a valid 10-digit Indian mobile number");
    }

    if (currentValidation.requireAadhaar && !aadhaar.trim()) {
      errors.push("Applicant Aadhaar number is mandatory under current GP validation rules");
    } else if (aadhaar && aadhaar.length !== 12) {
      errors.push("Aadhaar must be exactly 12 digits");
    }
    
    const validHeirs = heirs.filter(h => h.name.trim());
    const minHeirs = currentWorkflow.minHeirs || 1;
    const maxHeirs = currentWorkflow.maxHeirs || 30;
    if (validHeirs.length < minHeirs) {
      errors.push(`At least ${minHeirs} heir(s) with a name is required`);
    }
    if (validHeirs.length > maxHeirs) {
      errors.push(`Total heirs count cannot exceed the configured cap of ${maxHeirs}`);
    }
    
    // Check heir names
    heirs.forEach((h, i) => {
      if (!h.name.trim()) errors.push(`Heir #${i + 1}: Name is required`);
      // Sub-successors are optional. Only ask that the deceased-successor
      // question has been answered, and that any listed sub-successor is named.
      if (h.deceased && !h.hasLegalSuccessors) {
        errors.push(`Heir #${i + 1} (${h.name}): Answer whether this deceased successor has legal successors to include`);
      }
      h.subHeirs.forEach((s, j) => {
        if (!s.name.trim()) errors.push(`Heir #${i + 1}, Sub-heir #${j + 1}: Name is required`);
      });
    });

    if (verificationType === "affidavit") {
      if (!serialNo.trim()) errors.push("Affidavit serial number is required");
      if (new Date(affidavitDate) > new Date()) errors.push("Affidavit date cannot be in the future");
    }
    return errors;
  };

  // Auto-download the currently rendered certificate as PDF
  const autoDownloadPDF = async (fileName: string) => {
    try {
      const area = document.querySelector(".certificate-area") as HTMLElement | null;
      if (!area) return;

      if (!html2canvasPromise) html2canvasPromise = import("html2canvas");
      if (!jsPdfPromise) jsPdfPromise = import("jspdf");

      const html2canvas = (await html2canvasPromise).default;
      const { jsPDF } = await jsPdfPromise;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageEls = Array.from(area.querySelectorAll<HTMLElement>(".print-page"));
      const targets = pageEls.length > 0 ? pageEls : [area];
      for (let i = 0; i < targets.length; i++) {
        const canvas = await html2canvas(targets[i], { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdfW = 210, pdfH = 297;
        const imgH = (canvas.height * pdfW) / canvas.width;
        const y = Math.max(0, (pdfH - imgH) / 2);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, y, pdfW, Math.min(imgH, pdfH));
      }
      pdf.save(fileName);
    } catch (e) {
      console.warn("PDF download failed", e);
    }
  };

  const handleGenerate = async () => {
    const errors = validate();
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setIsSaving(true);
    setPreparing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        setPreparing(false);
        setIsSaving(false);
        toast.error("You must sign in to register a certificate.");
        navigate("/admin");
        return;
      }

      // 1. Reserve a permanent, unique Verification ID
      const year = new Date().getFullYear();
      let vid: string;
      const { data: vidData, error: vidErr } = await supabase.rpc("generate_verification_id", {
        _kind: "warish", _year: year,
      });
      if (!vidErr && vidData) {
        vid = String(vidData);
      } else {
        const rand = Math.floor(10000 + Math.random() * 90000);
        vid = `WARISH-${year}-${rand}`;
      }

      // 2. Sanitize PII and persist as Pending
      const sanitizedHeirs = Array.isArray(heirs)
        ? heirs.map((h: any) => {
            if (!h || typeof h !== "object") return h;
            const { aadhaar: _a, mobile: _m, ...rest } = h;
            return rest;
          })
        : heirs;
      const sanitizedData = { deceasedName, fatherPrefix, fatherName, village, postOffice, district, pin, applicantName, applicantRelation, applicantRelOther, guardianName, verificationType, court, courtOther, magistrateType, serialNo, affidavitDate, numNeighbours, wardMember, verifiedBy, heirs: sanitizedHeirs, applicantAadhaarLast4: aadhaar ? aadhaar.slice(-4) : null };

      const { error } = await supabase.from("warish_certificates").insert({
        verification_id: vid,
        memo_no: null,
        cert_date: null,
        status: "Pending Signature & Memo Registration",
        deceased_name: deceasedName,
        applicant_name: applicantName,
        village,
        data: sanitizedData as any,
        created_by: user.id,
      });
      if (error) {
        setPreparing(false); setIsSaving(false);
        alert(`Could not save to backend: ${error.message}`);
        return;
      }
      setVerificationId(vid);
      setCertStatus("Pending Signature & Memo Registration");
    } catch (e: any) {
      setPreparing(false); setIsSaving(false);
      alert(`Error registering certificate: ${e?.message || e}`);
      return;
    }

    // 3. Show "Preparing certificate..." for ~3s, then reveal & auto-download
    setShowPreview(true);
    setTimeout(async () => {
      setPreparing(false);
      setIsSaving(false);
      // wait one paint so the preview is mounted
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      autoDownloadPDF(`Warish_Certificate_${deceasedName.replace(/\s+/g, "_")}.pdf`);
    }, 3000);
  };


  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const handleSaveDraft = () => {
    // Strip sensitive PII (Aadhaar, mobile) from heirs to avoid persisting it in localStorage
    const sanitizedHeirs = Array.isArray(heirs)
      ? heirs.map((h: any) => {
          if (!h || typeof h !== "object") return h;
          const { aadhaar: _a, mobile: _m, ...rest } = h;
          return rest;
        })
      : heirs;
    // Exclude applicant Aadhaar and mobile from the draft entirely
    const data = { memoPrefix, memoYear, certDate, deceasedName, fatherPrefix, fatherName, village, postOffice, district, pin, applicantName, applicantRelation, applicantRelOther, guardianName, verificationType, court, courtOther, magistrateType, serialNo, affidavitDate, numNeighbours, wardMember, verifiedBy, heirs: sanitizedHeirs };
    const payload = { savedAt: Date.now(), data };
    try {
      localStorage.setItem("warish_draft", JSON.stringify(payload));
      alert("Draft saved! Note: Aadhaar and mobile numbers are NOT saved — please re-enter them.");
    } catch {
      alert("Could not save draft.");
    }
  };

  const handleLoadDraft = () => {
    const raw = localStorage.getItem("warish_draft");
    if (!raw) { alert("No draft found"); return; }
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.removeItem("warish_draft");
      alert("Saved draft was corrupted and has been cleared.");
      return;
    }
    // Support legacy drafts (no savedAt wrapper)
    const savedAt: number | undefined = parsed?.savedAt;
    const data = parsed?.data ?? parsed;
    if (savedAt && Date.now() - savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem("warish_draft");
      alert("Saved draft has expired and was cleared.");
      return;
    }
    Object.entries(data).forEach(([key, val]) => {
      const setters: Record<string, any> = { memoPrefix: setMemoPrefix, memoYear: setMemoYear, certDate: setCertDate, deceasedName: setDeceasedName, fatherPrefix: setFatherPrefix, fatherName: setFatherName, village: setVillage, postOffice: setPostOffice, district: setDistrict, pin: setPin, applicantName: setApplicantName, applicantRelation: setApplicantRelation, applicantRelOther: setApplicantRelOther, guardianName: setGuardianName, verificationType: setVerificationType, court: setCourt, courtOther: setCourtOther, magistrateType: setMagistrateType, serialNo: setSerialNo, affidavitDate: setAffidavitDate, numNeighbours: setNumNeighbours, wardMember: setWardMember, verifiedBy: setVerifiedBy, heirs: setHeirsSafe };
      if (setters[key]) setters[key](val);
    });
    alert("Draft loaded. Please re-enter Aadhaar and mobile numbers.");
  };

  const handleExportJSON = () => {
    const sanitizedHeirs = Array.isArray(heirs)
      ? heirs.map((h: any) => {
          if (!h || typeof h !== "object") return h;
          const { aadhaar: _a, mobile: _m, ...rest } = h;
          return rest;
        })
      : heirs;
    // Mirror draft-save: strip applicant Aadhaar/mobile and heir PII from exports
    const data = { memoPrefix, memoYear, certDate, deceasedName, fatherPrefix, fatherName, village, postOffice, district, pin, applicantName, applicantRelation, applicantRelOther, guardianName, verificationType, court, courtOther, magistrateType, serialNo, affidavitDate, numNeighbours, wardMember, verifiedBy, heirs: sanitizedHeirs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Warish_Data_${deceasedName.replace(/\s+/g, "_")}.json`;
    a.click();
    alert("Export saved. Note: Aadhaar and mobile numbers were NOT included for privacy. Re-enter them after import.");
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.heirs) {
            Object.entries(data).forEach(([key, val]) => {
              const setters: Record<string, any> = { memoPrefix: setMemoPrefix, memoYear: setMemoYear, certDate: setCertDate, deceasedName: setDeceasedName, fatherPrefix: setFatherPrefix, fatherName: setFatherName, village: setVillage, postOffice: setPostOffice, district: setDistrict, pin: setPin, applicantName: setApplicantName, applicantRelation: setApplicantRelation, applicantRelOther: setApplicantRelOther, guardianName: setGuardianName, mobile: setMobile, aadhaar: setAadhaar, verificationType: setVerificationType, court: setCourt, courtOther: setCourtOther, magistrateType: setMagistrateType, serialNo: setSerialNo, affidavitDate: setAffidavitDate, numNeighbours: setNumNeighbours, wardMember: setWardMember, verifiedBy: setVerifiedBy, heirs: setHeirsSafe };
              if (setters[key]) setters[key](val);
            });
            alert("Data imported!");
          }
        } catch { alert("Invalid JSON file"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Certificate Rendering
  const HEIRS_PER_PAGE = 15;
  const pages: Heir[][] = [];
  for (let i = 0; i < heirs.length; i += HEIRS_PER_PAGE) {
    pages.push(heirs.slice(i, i + HEIRS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  const deceasedHeirs = heirs.filter(h => h.deceased && (h.subHeirs ?? []).length > 0);
  const declaration = getDeclarationText();

  const renderHeader = () => (
    <>
      <div style={{ background: `linear-gradient(to right, #FF9933 33.33%, white 33.33% 66.66%, #2E7D32 66.66%)`, height: "4px", marginBottom: "10px" }} />
      <div style={{ textAlign: "center", marginBottom: "5px" }}>
        <div style={{ fontSize: "12px", color: "#666" }}>Office of the</div>
        <div style={{ fontSize: "24px", fontWeight: "bold", textTransform: "uppercase", color: "#1A237E" }}>BAGULA II GRAM PANCHAYAT</div>
        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>(UNDER HANSKHALI PANCHAYAT SAMITY)</div>
        <div style={{ fontSize: "11px", color: "#666" }}>Vill: Stationpara, P.O.: Bagula, P.S.: Hanskhali, Block: Hanskhali</div>
        <div style={{ fontSize: "11px", color: "#666" }}>Dist.: Nadia, West Bengal</div>
        <div style={{ fontSize: "11px", color: "#666" }}>E-mail:- <span style={{ background: "#d9d9d9", padding: "0 3px" }}>bagula2nogp111@gmail.com</span></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingBottom: "6px" }}>
        <div><div style={{ color: "#c55a11", fontWeight: "bold", fontSize: "12px" }}>Smt. Susmita Biswas Barman</div><div style={{ color: "#2e74b5", fontWeight: "bold", fontSize: "12px" }}>Prodhan</div></div>
        <div style={{ textAlign: "right" }}><div style={{ color: "#c55a11", fontWeight: "bold", fontSize: "12px" }}>Sri Manaranjan Bhowmick</div><div style={{ color: "#2e74b5", fontWeight: "bold", fontSize: "12px" }}>Upa-Prodhan</div></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", margin: "10px 0", fontSize: "13px", borderTop: "2px solid #000", paddingTop: "8px" }}>
        <span>Memo No: {certStatus === "Approved" ? `${memoPrefix}${memoYear}` : `________/BGL-II/${new Date().getFullYear()}`}</span>
        <span>Date: {certStatus === "Approved" && certDate ? formatDate(certDate) : "____/____/________"}</span>
      </div>
      <div style={{ textAlign: "center", fontSize: "20px", fontWeight: "bold", textDecoration: "underline", margin: "15px 0", color: "#1A237E" }}>WARISH CERTIFICATE</div>
      <div style={{ fontSize: "12px", lineHeight: 1.6, textAlign: "justify", marginBottom: "10px" }}>
        This is to certify that the following {totalLivingHeirs === 1 ? "individual is" : "individuals are"} declared as the {totalLivingHeirs === 1 ? "successor" : "successors"} of Late <strong>{deceasedName}</strong>, {fatherPrefix === "Late" ? "LT." : fatherPrefix} <strong>{fatherName}</strong>, who was a resident of Vill: <strong>{village}</strong> PO: <strong>{postOffice}</strong> under the jurisdiction of Bagula 2 No. Gram Panchayat, Post Office: <strong>{postOffice}</strong>, District: <strong>{district}</strong>, West Bengal, PIN – <strong>{pin}</strong>.
      </div>
    </>
  );

  const renderTable = (pageHeirs: Heir[], startIdx: number) => {
    let prevCare = "";
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "10px", textAlign: "center" }}>
        <thead>
          <tr style={{ background: "#1A237E", color: "white" }}>
            <th style={{ border: "1px solid #333", padding: "4px", width: "30px", textAlign: "center" }}>S/L</th>
            <th style={{ border: "1px solid #333", padding: "4px", textAlign: "center" }}>Name</th>
            <th style={{ border: "1px solid #333", padding: "4px", textAlign: "center" }}>Care of</th>
            <th style={{ border: "1px solid #333", padding: "4px", width: "70px", textAlign: "center" }}>Relation</th>
            <th style={{ border: "1px solid #333", padding: "4px", width: "40px", textAlign: "center" }}>Age</th>
          </tr>
        </thead>
        <tbody>
          {pageHeirs.map((h, i) => {
            const idx = startIdx + i + 1;
            const careStr = `${h.carePrefix} ${h.careName}`;
            const displayCare = careStr === prevCare ? "Do" : careStr;
            prevCare = careStr;
            return (
              <tr key={i} style={{ background: h.deceased ? "#fff3e0" : (i % 2 === 0 ? "#f9f9f9" : "white") }}>
                <td style={{ border: "1px solid #999", padding: "4px", textAlign: "center" }}>{idx}</td>
                <td style={{ border: "1px solid #999", padding: "4px", textAlign: "center" }}>{h.deceased && h.prefix !== "Late" ? "LT. " : ""}{h.prefix} {h.name}</td>
                <td style={{ border: "1px solid #999", padding: "4px", textAlign: "center" }}>{displayCare}</td>
                <td style={{ border: "1px solid #999", padding: "4px", textAlign: "center" }}>{h.relation}</td>
                <td style={{ border: "1px solid #999", padding: "4px", textAlign: "center" }}>{h.age || "---"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const inputClass = "w-full px-3 py-2 border rounded-lg bg-background text-foreground text-sm";
  const labelClass = "text-xs font-semibold text-foreground";

  return (
    <div className="min-h-screen bg-saffron/10">
      <div className="max-w-[1200px] mx-auto p-4">
      {isApproved && (
        <div className="gov-card p-4 mb-4 no-print border-t-4 border-emerald-600">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-emerald-700 font-bold text-base">Approved Warish Certificate — Read Only</div>
              {verificationId && <div className="font-mono text-xs text-muted-foreground mt-0.5">Verification ID: {verificationId}</div>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setShowPreview(true); setTimeout(() => document.querySelector(".certificate-area")?.scrollIntoView({ behavior: "smooth" }), 50); }} className="gov-btn-primary text-sm">View Certificate</button>
              <button onClick={async () => { setReprintMode(true); setReprintStamp(new Date()); setShowPreview(true); await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))); autoDownloadPDF(`Warish_Certificate_Reprint_${deceasedName.replace(/\s+/g,"_")}.pdf`); }} className="gov-btn-secondary text-sm">Reprint Certificate</button>
              <button onClick={() => autoDownloadPDF(`Warish_Certificate_${deceasedName.replace(/\s+/g,"_")}.pdf`)} className="gov-btn-secondary text-sm">Download PDF</button>
              {verificationId && <a href={`/verify?id=${encodeURIComponent(verificationId)}`} target="_blank" rel="noopener" className="gov-btn-accent text-sm">Verify Online</a>}
              <button onClick={() => alert("Modify Request workflow will be enabled in a later update.")} className="gov-btn-accent text-sm">Modify Request</button>
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
      <div className="gov-card p-6 mb-6 no-print border-t-4 border-saffron">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground border-l-4 border-saffron pl-3 font-heading">Warish Certificate — Bagula II Gram Panchayat</h1>
          <button onClick={() => setLang(lang === "en" ? "bn" : "en")} className="px-4 py-2 rounded-lg text-sm font-bold bg-saffron text-white hover:bg-saffron/90 transition-all shadow-md">
            {t("langToggle")}
          </button>
        </div>


        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 rounded-lg border-2 border-destructive/50 bg-destructive/10">
            <p className="font-bold text-destructive text-sm mb-2">⚠️ Please fix the following errors:</p>
            <ul className="list-disc list-inside text-sm text-destructive space-y-1">
              {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        {/* Memo & Date */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="space-y-1"><label className={labelClass}>{t("memoPrefix")}</label><input value={memoPrefix} onChange={e => setMemoPrefix(e.target.value)} className={inputClass} /></div>
          <div className="space-y-1"><label className={labelClass}>{t("year")}</label>
            <select value={memoYear} onChange={e => setMemoYear(e.target.value)} className={inputClass}>
              {["2026", "2027", "2028", "2029", "2030"].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className={labelClass}>{t("certDate")}</label><input type="date" value={certDate} onChange={e => setCertDate(e.target.value)} className={inputClass} /></div>
        </div>

        {/* Deceased */}
        <fieldset className="border rounded-lg p-4 mb-6 bg-saffron/5 border-saffron/20">
          <legend className="text-sm font-semibold text-foreground px-2">{t("deceased")}</legend>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1"><label className={labelClass}>{t("nameDeceased")}</label><input value={deceasedName} onChange={e => setDeceasedName(e.target.value)} className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass}>{t("fatherPrefix")}</label>
              <select value={fatherPrefix} onChange={e => setFatherPrefix(e.target.value)} className={inputClass}>
                <option>Sri</option><option>Smt</option><option>Late</option>
              </select>
            </div>
            <div className="space-y-1"><label className={labelClass}>{t("fatherName")}</label><input value={fatherName} onChange={e => setFatherName(e.target.value)} className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass}>{t("village")}</label>
              <select value={village} onChange={e => {
                  const val = e.target.value;
                  setVillage(val);
                  if (villagesData.length > 0) {
                    const sel = villagesData.find(v => v.name === val);
                    if (sel && sel.postOffices.length > 0) {
                      setPostOffice(sel.postOffices[0]);
                    }
                  }
                }} className={inputClass}>
                {activeVillages.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1"><label className={labelClass}>{t("postOffice")}</label>
              <select value={postOffice} onChange={e => setPostOffice(e.target.value)} className={inputClass}>
                {activePostOffices.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1"><label className={labelClass}>{t("district")}</label><input value={district} onChange={e => setDistrict(e.target.value)} className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass}>{t("pin")}</label><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className={inputClass} /></div>
          </div>
        </fieldset>

        {/* Applicant */}
        <fieldset className="border rounded-lg p-4 mb-6 bg-saffron/5 border-saffron/20">
          <legend className="text-sm font-semibold text-foreground px-2">{t("applicant")}</legend>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1"><label className={labelClass}>{t("fullName")}</label><input value={applicantName} onChange={e => setApplicantName(e.target.value)} className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass}>{t("relation")}</label>
              <select value={applicantRelation} onChange={e => setApplicantRelation(e.target.value)} className={inputClass}>
                {activeRelations.map(r => <option key={r}>{r}</option>)}
              </select>
              {applicantRelation === "Other" && <input value={applicantRelOther} onChange={e => setApplicantRelOther(e.target.value)} placeholder={t("specifyRelation")} className={inputClass + " mt-1"} />}
            </div>
            <div className="space-y-1"><label className={labelClass}>{t("guardianName")}</label><input value={guardianName} onChange={e => setGuardianName(e.target.value)} className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass}>{t("mobile")}</label><MaskedInput value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass}>{t("aadhaar")}</label><MaskedInput value={aadhaar} onChange={e => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))} className={inputClass} /></div>
          </div>
        </fieldset>

        {/* Heirs */}
        <fieldset className="border rounded-lg p-4 mb-6 bg-saffron/5 border-saffron/20">
          <legend className="text-sm font-semibold text-foreground px-2">{t("heirs")}</legend>
          {heirs.map((heir, i) => (
            <div key={i} className="mb-4">
              <div className="bg-card border rounded-lg p-3">
                {/* Row 1: Prefix, Name, Care Prefix, Care Name */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  <div className="space-y-1"><label className={labelClass}>{t("prefix")}</label>
                    <select value={heir.prefix} onChange={e => updateHeir(i, "prefix", e.target.value)} className={inputClass}>
                      {activePrefixes.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1"><label className={labelClass}>{t("name")}</label><input value={heir.name} onChange={e => updateHeir(i, "name", e.target.value)} className={inputClass} /></div>
                  <div className="space-y-1"><label className={labelClass}>{t("carePrefix")}</label>
                    <select value={heir.carePrefix} onChange={e => updateHeir(i, "carePrefix", e.target.value)} className={inputClass}>
                      {CARE_PREFIXES.map(p => <option key={p} value={p}>{p === "" ? "None" : p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1"><label className={labelClass}>{t("careName")}</label>
                    <input value={heir.careName} onChange={e => updateHeir(i, "careName", e.target.value)} className={inputClass} disabled={heir.relation === "Son" || heir.relation === "Wife" || heir.relation === "Mother" || (heir.relation === "Daughter" && heir.daughterCareMode === "father")} />
                  </div>
                </div>
                {/* Row 2: Relation, Age, Deceased, Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <div className="space-y-1"><label className={labelClass}>{t("relationLabel")}</label>
                    <select value={heir.relation} onChange={e => updateHeir(i, "relation", e.target.value)} className={inputClass}>
                      {activeRelations.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1"><label className={labelClass}>{t("age")}</label><input value={heir.age} onChange={e => updateHeir(i, "age", e.target.value)} className={inputClass} /></div>
                  <div className="flex items-center gap-2 pt-5">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                      <input type="checkbox" checked={heir.deceased} onChange={e => updateHeir(i, "deceased", e.target.checked)} className="w-4 h-4 accent-destructive" />
                      <span className="font-semibold text-destructive">{t("deceasedLabel")}</span>
                    </label>
                  </div>
                  <div className="flex gap-1 items-center pt-5">
                    {heir.deceased && heir.hasLegalSuccessors === "yes" && (
                      <button onClick={() => addSubHeir(i)} className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-foreground font-semibold transition-all hover:opacity-90">{t("addSubHeirs")}</button>
                    )}
                    <button onClick={() => removeHeir(i)} className="text-xs px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground font-semibold ml-auto">✕</button>
                  </div>
                </div>
                {/* Deceased successor: sub-successors are optional and only asked for here */}
                {heir.deceased && (
                  <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                    <p className="text-xs font-semibold mb-1.5">
                      Does this deceased successor have legal successors to be included in this certificate?
                    </p>
                    <div className="flex gap-4">
                      {(["yes", "no"] as const).map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                          <input
                            type="radio"
                            name={`legal-successors-${i}`}
                            checked={heir.hasLegalSuccessors === opt}
                            onChange={() => updateHeir(i, "hasLegalSuccessors", opt)}
                            className="w-3.5 h-3.5 accent-primary"
                          />
                          <span>{opt === "yes" ? "Yes" : "No"}</span>
                        </label>
                      ))}
                    </div>
                    {heir.hasLegalSuccessors === "no" && (
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        No sub-successors will be recorded for this deceased successor.
                      </p>
                    )}
                  </div>
                )}
                {/* Daughter care mode option */}
                {heir.relation === "Daughter" && (
                  <div className="mt-2 p-2 rounded-md bg-saffron/10 border border-saffron/20">
                    <label className={labelClass + " mb-1 block"}>{t("daughterCareOption")}</label>
                    <div className="flex gap-4 items-center">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name={`daughter-care-${i}`} checked={heir.daughterCareMode !== "husband"} onChange={() => updateHeir(i, "daughterCareMode", "father")} />
                        {t("useFather")}
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name={`daughter-care-${i}`} checked={heir.daughterCareMode === "husband"} onChange={() => updateHeir(i, "daughterCareMode", "husband")} />
                        {t("useHusband")}
                      </label>
                      {heir.daughterCareMode === "husband" && (
                        <input value={heir.husbandName || ""} onChange={e => updateHeir(i, "husbandName", e.target.value)} placeholder="Husband's name" className={inputClass + " max-w-[200px]"} />
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Sub-heirs */}
              {(heir.subHeirs ?? []).map((sub, si) => (
                <div key={si} className="ml-4 sm:ml-8 mt-2 bg-saffron/5 border-2 border-dashed border-saffron/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-saffron">↳ {t("subHeir")} #{si + 1} {t("of")} {heir.name}</span>
                    <button onClick={() => removeSubHeir(i, si)} className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground">{t("remove")}</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-end">
                    <div className="space-y-1"><label className={labelClass}>{t("prefix")}</label>
                      <select value={sub.prefix} onChange={e => updateSubHeir(i, si, "prefix", e.target.value)} className={inputClass}>
                        {activePrefixes.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1 lg:col-span-2"><label className={labelClass}>{t("fullName")}</label><input value={sub.name} onChange={e => updateSubHeir(i, si, "name", e.target.value)} className={inputClass} /></div>
                    <div className="space-y-1"><label className={labelClass}>{t("relationLabel")}</label>
                      <select value={sub.relation} onChange={e => updateSubHeir(i, si, "relation", e.target.value)} className={inputClass}>
                        {activeRelations.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><label className={labelClass}>{t("age")}</label><input value={sub.age} onChange={e => updateSubHeir(i, si, "age", e.target.value)} className={inputClass} /></div>
                    <div className="space-y-1">
                      <label className={labelClass}>{t("careName")}</label>
                      <input value={`${sub.carePrefix} ${sub.careName}`} disabled className={inputClass + " opacity-60"} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button onClick={addHeir} className="gov-btn-accent text-sm mt-2">{t("addHeir")}</button>
        </fieldset>

        {/* Verification */}
        <fieldset className="border rounded-lg p-4 mb-6 bg-saffron/5 border-saffron/20">
          <legend className="text-sm font-semibold text-foreground px-2">{t("verification")}</legend>
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={verificationType === "affidavit"} onChange={() => setVerificationType("affidavit")} /> {t("withAffidavit")}</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={verificationType === "without"} onChange={() => setVerificationType("without")} /> {t("withoutAffidavit")}</label>
          </div>
          {verificationType === "affidavit" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1"><label className={labelClass}>{t("court")}</label>
                <select value={court} onChange={e => setCourt(e.target.value)} className={inputClass}>
                  <option>Ranaghat Court</option><option>Krishnanagar Court</option><option>Kalyani Court</option><option value="Other">Other</option>
                </select>
                {court === "Other" && <input value={courtOther} onChange={e => setCourtOther(e.target.value)} placeholder={t("courtName")} className={inputClass + " mt-1"} />}
              </div>
              <div className="space-y-1"><label className={labelClass}>{t("magistrateType")}</label>
                <select value={magistrateType} onChange={e => setMagistrateType(e.target.value)} className={inputClass}>
                  <option>1st Class Judicial Magistrate</option><option>Executive Magistrate</option>
                </select>
              </div>
              <div className="space-y-1"><label className={labelClass}>{t("serialNo")}</label><input value={serialNo} onChange={e => setSerialNo(e.target.value)} className={inputClass} /></div>
              <div className="space-y-1"><label className={labelClass}>{t("affidavitDate")}</label><input type="date" value={affidavitDate} onChange={e => setAffidavitDate(e.target.value)} className={inputClass} /></div>
            </div>
          ) : (
            <div className="space-y-1 max-w-xs">
              <label className={labelClass}>{t("neighbourSig")}</label>
              <select value={numNeighbours} onChange={e => setNumNeighbours(parseInt(e.target.value))} className={inputClass}>
                {[1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
          )}
        </fieldset>

        {/* Ward Member */}
        <fieldset className="border rounded-lg p-4 mb-6 bg-saffron/5 border-saffron/20">
          <legend className="text-sm font-semibold text-foreground px-2">{t("wardSection")}</legend>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>{t("wardMember")}</label>
              <select value={wardMember} onChange={e => setWardMember(e.target.value)} className={inputClass}>
                {WARD_MEMBERS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>{t("verifiedByLabel")}</label>
              <input value={verifiedBy} onChange={e => setVerifiedBy(e.target.value)} placeholder="e.g. Sri Ramesh Das, Ward No. 5" className={inputClass} />
            </div>
          </div>
        </fieldset>

        {/* Action Buttons */}
        {isApproved && (
          <div className="mb-3 rounded-md border border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Approved certificate — read only. Editing is disabled. Use <strong>Reprint</strong> or <strong>Modify Request</strong>.
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button onClick={handleGenerate} disabled={isSaving || isApproved} className="gov-btn-primary disabled:opacity-60">{isSaving ? "Saving…" : t("generate")}</button>
          <button onClick={handleSaveDraft} disabled={isApproved} className="gov-btn-secondary text-sm disabled:opacity-60">{t("saveDraft")}</button>
          <button onClick={handleLoadDraft} disabled={isApproved} className="gov-btn-secondary text-sm disabled:opacity-60">{t("loadDraft")}</button>
          <button onClick={handleExportJSON} className="gov-btn-accent text-sm">{t("exportJSON")}</button>
          <button onClick={handleImportJSON} disabled={isApproved} className="gov-btn-accent text-sm disabled:opacity-60">{t("importJSON")}</button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          ⚠️ Saved drafts are stored in this browser only. Aadhaar and mobile numbers are NOT saved for privacy. Avoid using "Save Draft" on shared/public computers.
        </p>
      </div>
      </fieldset>


      {/* Preparing overlay */}
      {preparing && (
        <div className="no-print fixed inset-0 z-[999] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border rounded-xl px-8 py-6 shadow-2xl text-center">
            <div className="text-lg font-semibold text-foreground mb-2">Preparing certificate…</div>
            <div className="text-xs text-muted-foreground">Registering with Verification ID and generating PDF</div>
          </div>
        </div>
      )}

      {/* Certificate Preview */}
      {showPreview && (
        <div>
          <style>{`
            @media print {
              @page { size: A4; margin: 0; }
              html, body { background: white !important; padding: 0 !important; margin: 0 !important; }
              .no-print { display: none !important; }
              .certificate-area { margin: 0 auto !important; }
              .print-page { box-shadow: none !important; margin: 0 auto !important; page-break-after: always; }
              .print-page:last-child { page-break-after: auto; }
              .lovable-watermark, [class*="watermark"], [id*="watermark"],
              div[style*="position: fixed"] { display: none !important; }
            }
            .print-page {
              width: 210mm;
              min-height: 297mm;
              padding: 12mm;
              font-family: 'Times New Roman', Georgia, serif;
              position: relative;
              color: #000;
              box-sizing: border-box;
              background: white;
              margin: 0 auto;
              page-break-after: always;
              break-inside: avoid;
            }
            .print-page:last-child { page-break-after: auto; }
            .heir-block { break-inside: avoid; page-break-inside: avoid; }
          `}</style>
          <div className="flex flex-wrap gap-3 justify-center mb-4 no-print">
            {verificationId && (
              <div className="px-3 py-2 rounded-md border bg-muted text-xs font-mono">
                Verification ID: <strong>{verificationId}</strong> · Status: {certStatus}
              </div>
            )}
            <button onClick={() => window.print()} className="gov-btn-primary">{t("print")}</button>
            <button onClick={() => autoDownloadPDF(`Warish_Certificate_${deceasedName.replace(/\s+/g, "_")}.pdf`)} className="gov-btn-secondary">📥 Download PDF</button>
            <button onClick={() => setShowPreview(false)} className="gov-btn-secondary">{t("closePreview")}</button>
          </div>
          <div className="certificate-area" style={{ maxWidth: "210mm", marginLeft: "auto", marginRight: "auto" }}>
          <div className="bg-muted/50 p-4 md:p-10 rounded-lg overflow-x-auto" ref={certRef}>
            {pages.map((pageHeirs, pageIdx) => {
              const isLastPage = pageIdx === pages.length - 1;
              const startIdx = pageIdx * HEIRS_PER_PAGE;
              return (
                <div key={pageIdx} className="print-page mb-8" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                  {renderHeader()}
                  {pageIdx > 0 && (
                    <p style={{ fontSize: "11px", fontStyle: "italic", marginBottom: "8px", color: "#666" }}>
                      (Continued from previous page — Page {pageIdx + 1} of {pages.length})
                    </p>
                  )}
                  {renderTable(pageHeirs, startIdx)}
                  {!isLastPage && (
                    <p style={{ textAlign: "right", fontSize: "11px", fontStyle: "italic", marginTop: "10px" }}>
                      Continued on next page... (Page {pageIdx + 1} of {pages.length})
                    </p>
                  )}
                  {isLastPage && (
                    <>
                      {/* Sub-heir boxes */}
                      {deceasedHeirs.map((dh, di) => {
                        const mainIdx = heirs.indexOf(dh) + 1;
                        let prevSubCare = "";
                        return (
                          <div key={di} className="heir-block" style={{ border: "1px solid #999", borderRadius: "4px", padding: "10px", margin: "15px 0", background: "#fffde7" }}>
                            <p style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "8px" }}>That the {dh.subHeirs.length === 1 ? "successor" : "successors"} of LT. {dh.name} {dh.subHeirs.length === 1 ? "is" : "are"} noted below:</p>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "center" }}>
                              <thead>
                                <tr style={{ background: "#e8eaf6" }}>
                                  <th style={{ border: "1px solid #999", padding: "3px", width: "40px", textAlign: "center" }}>S/L</th>
                                  <th style={{ border: "1px solid #999", padding: "3px", textAlign: "center" }}>Name</th>
                                  <th style={{ border: "1px solid #999", padding: "3px", textAlign: "center" }}>Care of</th>
                                  <th style={{ border: "1px solid #999", padding: "3px", width: "60px", textAlign: "center" }}>Relation</th>
                                  <th style={{ border: "1px solid #999", padding: "3px", width: "35px", textAlign: "center" }}>Age</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(dh.subHeirs ?? []).map((sub, si) => {
                                  const subCare = `${sub.carePrefix} ${sub.careName}`;
                                  const display = subCare === prevSubCare ? "Do" : subCare;
                                  prevSubCare = subCare;
                                  const letter = String.fromCharCode(65 + si);
                                  return (
                                    <tr key={si}>
                                      <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "center" }}>{mainIdx}.{letter}</td>
                                      <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "center" }}>{sub.prefix} {sub.name}</td>
                                      <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "center" }}>{display}</td>
                                      <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "center" }}>{sub.relation}</td>
                                      <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "center" }}>{sub.age || "---"}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}

                      {/* Declaration */}
                      <div style={{ marginTop: "20px", fontSize: "12px", lineHeight: 1.7, textAlign: "justify" }}>
                        <p>{declaration[0]}</p>
                        <p style={{ marginTop: "10px" }}>{declaration[1]}</p>
                      </div>

                      {/* Signature row: Concerned Elected Ward Member | Verification ID box | Prodhan */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "50px", gap: "10px" }}>
                        <div style={{ textAlign: "center", fontSize: "12px", minWidth: "30%" }}>
                          <div style={{ borderTop: "1px solid #000", paddingTop: "3px", width: "180px" }}>
                            <p style={{ fontWeight: "bold" }}>Concerned Elected Ward Member</p>
                            {verifiedBy && <p style={{ fontSize: "11px" }}>{verifiedBy}</p>}
                          </div>
                        </div>
                        <div style={{ textAlign: "center", flex: "0 0 auto" }}>
                          <div style={{ border: "1px solid #000", padding: "3px 6px", fontSize: "9px", fontFamily: "monospace", background: "#fafafa" }}>
                            <div style={{ fontSize: "7px", opacity: 0.7 }}>Verification ID</div>
                            <div style={{ fontWeight: "bold" }}>{verificationId || "Pending"}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "center", fontSize: "12px", minWidth: "30%" }}>
                          <div style={{ borderTop: "1px solid #000", paddingTop: "3px", width: "180px", marginLeft: "auto" }}>
                            <p style={{ fontWeight: "bold" }}>(Prodhan)</p>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: `linear-gradient(to right, #FF9933 33.33%, white 33.33% 66.66%, #2E7D32 66.66%)`, height: "4px", marginTop: "20px" }} />
                      <div style={{ marginTop: "10px", textAlign: "center", fontSize: "10px", color: "#333", lineHeight: 1.5 }}>
                        This certificate shall ordinarily remain valid up to six (6) months from the Date of Issue.<br />
                        To verify this certificate please visit <strong>https://deo-workflow-helper.lovable.app/verify</strong>
                        {reprintMode && reprintStamp && (
                          <div style={{ marginTop: "6px", fontStyle: "italic", color: "#555" }}>
                            Reprinted from the Digital Administrative Register — {reprintStamp.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function WarishCertificate() {
  return (
    <>
      <Helmet>
        <title>Warish Certificate — Bagula II Gram Panchayat</title>
        <meta name="description" content="Apply for and issue Warish Certificates (successor / warish details) from Bagula II Gram Panchayat, Hanskhali Block, Nadia, West Bengal." />
        <link rel="canonical" href="https://deo-workflow-helper.lovable.app/warish-certificate" />
        <meta property="og:title" content="Warish Certificate — Bagula II Gram Panchayat" />
        <meta property="og:description" content="Apply for and issue Warish Certificates from Bagula II Gram Panchayat." />
        <meta property="og:url" content="https://deo-workflow-helper.lovable.app/warish-certificate" />
      </Helmet>
      <WarishCertificateForm />
    </>
  );
}
