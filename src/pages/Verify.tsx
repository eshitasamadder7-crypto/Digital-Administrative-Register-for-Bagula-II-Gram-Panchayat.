import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { GoBackButton } from "@/components/BackButton";
import { ShieldCheck, Lock } from "lucide-react";

async function hashIp(): Promise<string> {
  const seed = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`;
  const enc = new TextEncoder().encode(seed);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function maskName(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  return parts
    .map(p => (p.length <= 2 ? p : `${p[0]}${"*".repeat(Math.min(p.length - 2, 4))}${p[p.length - 1]}`))
    .join(" ");
}

type FoundStatus = "Approved" | "Pending Signature & Memo Registration" | "Rejected" | string;

type Result =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "rate_limited" }
  | { status: "not_found" }
  | { status: "inconsistent" }
  | {
      status: "found";
      kind: "warish" | "dependent" | string;
      certificate_type: string;
      verification_id: string;
      applicant_name: string | null;
      deceased_name: string | null;
      record_status: FoundStatus;
      memo_no: string | null;
      issue_date: string | null;
      valid_from?: string | null;
      valid_until?: string | null;
      rejection_reason: string | null;
      record_data: any | null;
      issued_by: string;
      server_time: string;
    };

const VERIFICATION_NOTICE = `This online verification confirms that a matching administrative record exists in the Digital Administrative Register of Bagula II Gram Panchayat.

It confirms only the existence and current administrative status of the certificate and shall not be interpreted as a legal determination of ownership, succession, eligibility, entitlement, title or any other legal right.`;

const STATUTORY_NONE = `No matching digital administrative record was found based on the information provided. If you possess a document bearing physical signatures, official stamps or seals but no corresponding digital administrative record is available in this system, the document may not have completed the prescribed administrative registration process, may relate to legacy manual records, or may otherwise be unavailable in the current digital register. For official clarification, kindly contact the Office of Bagula II Gram Panchayat.`;

function fmtDateTime(iso: string | undefined) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

// ---------- Detail rendering ----------
type Row = { k: string; v: string | null | undefined };

function Section({ title, rows }: { title: string; rows: Row[] }) {
  const shown = rows.filter(r => r.v !== null && r.v !== undefined && String(r.v).trim() !== "");
  if (shown.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-primary/80 mb-1">{title}</div>
      <div className="rounded-md border border-border/40 bg-white/70 divide-y divide-border/30 text-sm">
        {shown.map((r, i) => (
          <div key={i} className="grid grid-cols-[160px_1fr] gap-3 px-3 py-1.5">
            <div className="text-muted-foreground">{r.k}</div>
            <div className="text-foreground break-words">{r.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WarishDetails({ data, dec }: { data: any; dec: string | null }) {
  const heirs: any[] = Array.isArray(data?.heirs) ? data.heirs : [];
  return (
    <>
      <Section title="👤 Public Verification Summary" rows={[
        { k: "Applicant Identity", v: maskName(data?.applicantName) },
        { k: "Relationship", v: data?.applicantRelation === "Other" ? data?.applicantRelOther : data?.applicantRelation },
        { k: "Jurisdiction Village", v: data?.village },
        { k: "Post Office", v: data?.postOffice },
        { k: "Police Station", v: "Hanskhali" },
        { k: "Deceased Person", v: maskName(dec ?? data?.deceasedName) },
        { k: "Legal Heirs Recorded", v: `${heirs.length} ${heirs.length === 1 ? "Heir" : "Heirs"} (Certified in Official Register)` },
      ]} />
      <div className="mt-3 p-3 bg-muted/40 rounded-lg border border-border/40 text-xs text-muted-foreground flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          <strong>Privacy Safeguard:</strong> In accordance with the Digital Personal Data Protection (DPDP) Act 2023, full names of successors, Aadhaar numbers, phone numbers, and genealogical lineage records are withheld from unauthenticated public lookup.
        </span>
      </div>
    </>
  );
}

function DependentDetails({ data }: { data: any }) {
  const deps: any[] = Array.isArray(data?.dependents) ? data.dependents : [];
  const village = data?.village === "Other" ? data?.villageManual : data?.village;
  const po = data?.po === "Other" ? data?.poManual : data?.po;
  const dept = data?.dept === "Other" ? data?.deptManual : data?.dept;
  const empFull = [data?.appTitle, data?.appName].filter(Boolean).join(" ");
  return (
    <>
      <Section title="💼 Public Verification Summary" rows={[
        { k: "Certified Employee", v: maskName(empFull) },
        { k: "Department / Employer", v: dept },
        { k: "Jurisdiction Village", v: village },
        { k: "Post Office", v: po },
        { k: "Dependents Certified", v: `${deps.length} ${deps.length === 1 ? "Eligible Dependent" : "Eligible Dependents"} (Registered)` },
      ]} />
      <div className="mt-3 p-3 bg-muted/40 rounded-lg border border-border/40 text-xs text-muted-foreground flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          <strong>Privacy Safeguard:</strong> In accordance with the Digital Personal Data Protection (DPDP) Act 2023, employee ID numbers, dependent names, dates of birth, and identity credentials are restricted from public search results.
        </span>
      </div>
    </>
  );
}

function LinkageDetails({ data, applicantName }: { data: any; applicantName?: string | null }) {
  const records: any[] = Array.isArray(data?.parentElectoralRecords) ? data.parentElectoralRecords : [];
  const constituency = data?.assemblyConstituency || data?.targetAssemblyConstituency || "91 - Ranaghat Uttar Purba (SC)";
  const purpose = data?.purpose || "Election enrolment verification";
  return (
    <>
      <Section title="🏛️ Election Enrolment Particulars" rows={[
        { k: "Applicant Identity", v: maskName(applicantName || data?.applicantName) },
        { k: "Assembly Constituency", v: constituency },
        { k: "Enrolment Purpose", v: purpose },
        { k: "Electoral Records Verified", v: `${records.length} Ancestor / Parental Record(s) Linked` },
      ]} />
      <div className="mt-3 p-3 bg-muted/40 rounded-lg border border-border/40 text-xs text-muted-foreground flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          <strong>Privacy Safeguard:</strong> In accordance with the Digital Personal Data Protection (DPDP) Act 2023, voter EPIC numbers, electoral part/serial references, and contact records are protected from public exposure.
        </span>
      </div>
    </>
  );
}

export default function Verify() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"vid" | "advanced">("vid");

  const [vid, setVid] = useState(params.get("id") || "");
  const [memoNo, setMemoNo] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [deceasedName, setDeceasedName] = useState("");

  const [result, setResult] = useState<Result>({ status: "idle" });

  useEffect(() => { setResult({ status: "idle" }); }, [mode]);

  const runVid = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const id = vid.trim().toUpperCase();
    if (!id) return;
    setResult({ status: "loading" });
    try {
      const ip = await hashIp();
      const { data, error } = await supabase.rpc("public_verify", { _verification_id: id, _ip_hash: ip });
      if (error) throw error;
      const d = data as any;
      if (d?.status === "rate_limited") setResult({ status: "rate_limited" });
      else if (d?.status === "not_found") setResult({ status: "not_found" });
      else if (d?.status === "inconsistent") setResult({ status: "inconsistent" });
      else if (d?.status === "found") setResult({ status: "found", ...d });
      else setResult({ status: "not_found" });
    } catch {
      setResult({ status: "not_found" });
    }
  };

  const runAdvanced = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!memoNo.trim() || !issueDate) return;
    setResult({ status: "loading" });
    try {
      const ip = await hashIp();
      const { data, error } = await supabase.rpc("public_verify_advanced", {
        _memo_no: memoNo.trim(),
        _issue_date: issueDate,
        _deceased_name: deceasedName.trim(),
        _ip_hash: ip,
      });
      if (error) throw error;
      const d = data as any;
      if (d?.status === "rate_limited") setResult({ status: "rate_limited" });
      else if (d?.status === "not_found") setResult({ status: "not_found" });
      else if (d?.status === "inconsistent") setResult({ status: "inconsistent" });
      else if (d?.status === "found") setResult({ status: "found", ...d });
      else setResult({ status: "not_found" });
    } catch {
      setResult({ status: "not_found" });
    }
  };

  return (
    <div className="min-h-screen bg-primary/5 flex flex-col">
      <Helmet>
        <title>Verify Certificate — Bagula II Gram Panchayat</title>
        <meta name="description" content="Check whether a Warish or Dependent certificate issued by Bagula II Gram Panchayat is genuine using its Verification ID or memo number and issue date." />
        <link rel="canonical" href="https://bagula2gp.lovable.app/verify" />
        <meta property="og:url" content="https://bagula2gp.lovable.app/verify" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Verify Certificate — Bagula II Gram Panchayat" />
        <meta property="og:description" content="Check whether a Warish or Dependent certificate issued by Bagula II Gram Panchayat is genuine using its Verification ID or memo number." />
        <meta name="twitter:title" content="Verify Certificate — Bagula II Gram Panchayat" />
        <meta name="twitter:description" content="Check whether a certificate issued by Bagula II Gram Panchayat is genuine using its Verification ID or memo number." />
      </Helmet>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        <GoBackButton fallbackUrl="/" className="mb-4 -ml-2" />
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 font-heading">
          🔍 Certificate Verification (শংসাপত্র যাচাই)
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Verify the administrative authenticity and genuine status of a certificate issued by Bagula II Gram Panchayat.
        </p>

        <div className="inline-flex rounded-xl border border-border/40 bg-white/70 p-1 text-xs mb-4">
          <button
            onClick={() => setMode("vid")}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 ${mode === "vid" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"}`}
          >
            🪪 Verification ID
          </button>
          <button
            onClick={() => setMode("advanced")}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 ${mode === "advanced" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"}`}
          >
            🔎 Advanced Search
          </button>
        </div>

        {mode === "vid" ? (
          <form onSubmit={runVid} className="gov-card p-5 flex flex-col sm:flex-row gap-3">
            <input
              aria-label="Verification ID"
              value={vid}
              onChange={e => setVid(e.target.value)}
              placeholder="🪪 e.g. BGL-II-WAR-2026-XXXXXX"
              className="flex-1 px-3 py-2 border rounded-md font-mono uppercase text-sm"
            />
            <button type="submit" className="gov-btn-primary min-w-[140px] flex items-center justify-center gap-1.5">
              🔍 Verify
            </button>
          </form>
        ) : (
          <form onSubmit={runAdvanced} className="gov-card p-5 grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="verify-memo-no" className="block text-xs font-medium mb-1">📋 Memo Number</label>
              <input id="verify-memo-no" name="memoNo" value={memoNo} onChange={e => setMemoNo(e.target.value)} placeholder="e.g. 125/BGL-II/2026" className="w-full px-3 py-2 border rounded-md font-mono text-sm" />
            </div>
            <div>
              <label htmlFor="verify-issue-date" className="block text-xs font-medium mb-1">📅 Issue Date</label>
              <input id="verify-issue-date" name="issueDate" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div>
              <label htmlFor="verify-deceased-name" className="block text-xs font-medium mb-1">👤 Deceased Name (Optional)</label>
              <input id="verify-deceased-name" name="deceasedName" value={deceasedName} onChange={e => setDeceasedName(e.target.value)} placeholder="Name of deceased" className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={!memoNo.trim() && !issueDate && !deceasedName.trim()} className="gov-btn-primary min-w-[140px] disabled:opacity-60 flex items-center justify-center gap-1.5">
                🔍 Verify
              </button>
            </div>

          </form>
        )}

        <div className="mt-6">
          {result.status === "loading" && (
            <div className="gov-card p-5 text-sm text-muted-foreground flex items-center gap-2">
              ⏳ Checking record in digital register…
            </div>
          )}

          {result.status === "rate_limited" && (
            <div className="gov-card p-5 border-l-4 border-amber-500">
              <div className="font-semibold text-amber-800 flex items-center gap-1.5">
                ⏳ Too Many Verification Attempts
              </div>
              <p className="text-sm text-muted-foreground mt-1">Please wait a few minutes and try again.</p>
            </div>
          )}

          {result.status === "inconsistent" && (
            <div className="gov-card p-5 border-l-4 border-red-600">
              <div className="font-semibold text-red-700 flex items-center gap-1.5">
                ⚠️ Database Consistency Error Detected
              </div>
              <p className="text-sm text-muted-foreground mt-2">Please contact Bagula II Gram Panchayat office.</p>
            </div>
          )}

          {result.status === "not_found" && (
            <div className="gov-card p-5 border-l-4 border-slate-500">
              <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                ❌ No Record Found (কোনো রেকর্ড পাওয়া যায়নি)
              </div>
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{STATUTORY_NONE}</p>
            </div>
          )}

          {result.status === "found" && (
            <div className="gov-card p-5 space-y-3">
              {result.record_status === "Approved" && (
                <div className="border-l-4 border-emerald-600 pl-3 py-1">
                  <div className="text-center text-emerald-700 font-bold text-lg tracking-wide flex items-center justify-center gap-2">
                    ✅ CERTIFICATE VERIFIED (শংসাপত্র যাচাই সফল) ✓
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-primary/80 mb-1">📋 Administrative Details</div>
                    <div className="rounded-md border border-border/40 bg-white/70 divide-y divide-border/30 text-sm">
                      {[
                        { k: "Verification ID", v: <span className="font-mono">{result.verification_id}</span> },
                        { k: "Certificate Type", v: result.certificate_type },
                        { k: "Memo Number", v: result.memo_no },
                        { k: "Issue Date", v: result.issue_date },
                        ...(result.valid_until ? [{ k: "Valid Until", v: result.valid_until }] : []),
                        { k: "Status", v: "Approved" },
                        { k: "Issued By", v: result.issued_by || "Bagula II Gram Panchayat" },
                        { k: "Verification Date & Time", v: fmtDateTime(result.server_time) },
                      ].map((r, i) => (
                        <div key={i} className="grid grid-cols-[160px_1fr] gap-3 px-3 py-1.5">
                          <div className="text-muted-foreground">{r.k}</div>
                          <div className="text-foreground break-words">{r.v as any}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.kind === "warish" && result.record_data && (
                    <WarishDetails data={result.record_data} dec={result.deceased_name} />
                  )}
                  {result.kind === "dependent" && result.record_data && (
                    <DependentDetails data={result.record_data} />
                  )}
                  {result.kind === "linkage" && result.record_data && (
                    <LinkageDetails data={result.record_data} applicantName={result.applicant_name} />
                  )}

                  <p className="text-xs text-muted-foreground mt-4 whitespace-pre-line">{VERIFICATION_NOTICE}</p>
                </div>
              )}

              {result.record_status === "Pending Signature & Memo Registration" && (
                <div className="border-l-4 border-amber-500 pl-3 py-1">
                  <div className="text-amber-700 font-semibold flex items-center gap-1.5">
                    ⏳ Pending Signature &amp; Memo Registration
                  </div>
                  <div className="text-sm mt-2 space-y-1">
                    <div><strong>Certificate Type:</strong> {result.certificate_type}</div>
                    <div><strong>Verification ID:</strong> <span className="font-mono">{result.verification_id}</span></div>
                    <div><strong>Issued By:</strong> {result.issued_by || "Bagula II Gram Panchayat"}</div>
                    <div><strong>Verification Date &amp; Time:</strong> {fmtDateTime(result.server_time)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    The application is recorded in the Digital Administrative Register but is awaiting physical signatures and official Memo registration. Until then it shall not be treated as an officially issued certificate.
                  </p>
                </div>
              )}

              {result.record_status === "Rejected" && (
                <div className="border-l-4 border-red-600 pl-3 py-1">
                  <div className="text-red-700 font-semibold flex items-center gap-1.5">
                    ❌ Rejected (প্রত্যাখ্যাত)
                  </div>
                  <div className="text-sm mt-2 space-y-1">
                    <div><strong>Certificate Type:</strong> {result.certificate_type}</div>
                    <div><strong>Verification ID:</strong> <span className="font-mono">{result.verification_id}</span></div>
                    <div><strong>Issued By:</strong> {result.issued_by || "Bagula II Gram Panchayat"}</div>
                    <div><strong>Verification Date &amp; Time:</strong> {fmtDateTime(result.server_time)}</div>
                  </div>
                  {result.rejection_reason && (
                    <p className="text-sm text-foreground mt-2">
                      <strong>Reason for Rejection:</strong> {result.rejection_reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
