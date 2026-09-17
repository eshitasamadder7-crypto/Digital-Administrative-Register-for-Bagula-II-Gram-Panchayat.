import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import WizardShell from "@/modules/application/WizardShell";
import DuplicateCheckStep from "@/modules/application/DuplicateCheckStep";
import ApplicantSection from "@/modules/application/ApplicantSection";
import WarishDetailsStep from "@/modules/application/WarishDetailsStep";
import DependentDetailsStep from "@/modules/application/DependentDetailsStep";
import LinkageDetailsStep from "@/modules/application/LinkageDetailsStep";
import AttachmentsStep from "@/modules/application/AttachmentsStep";
import DocumentEngineStep from "@/modules/application/DocumentEngineStep";
import ApplicationTimeline from "@/modules/application/ApplicationTimeline";
import { useAutoSave } from "@/modules/application/useAutoSave";
import {
  createDraft, loadApplication, recordDataToDraft, saveDraft, submitApplication, fetchWarishSuccessors,
  type DuplicateMatch,
} from "@/modules/application/api";
import {
  EMPTY_DRAFT, KIND_GENERATOR_ROUTE, KIND_LABEL, WIZARD_STEPS,
  type ApplicationDraft, type ApplicationKind, type WizardStepKey,
} from "@/modules/application/types";
import {
  type WarishSuccessorRecord,
  MAX_DIRECT_SUCCESSORS,
  buildSuccessorTree,
  generateSuccessorTreePreview,
  prepareDocumentReadyData,
} from "@/modules/warish/successorModel";
import { supabase } from "@/integrations/supabase/client";
import { KIND_TABLE } from "@/modules/application/types";
import { checkDeoCertificatePermission, checkCitizenCanApply } from "@/lib/userQuotasAndLimits";

const stepIndex = (k: WizardStepKey) => WIZARD_STEPS.findIndex((s) => s.key === k);

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

export default function ApplicationWizard({ citizen = false }: { citizen?: boolean }) {
  const { kind: kindParam } = useParams();
  const kind: ApplicationKind =
    kindParam === "dependent" ? "dependent" : kindParam === "linkage" ? "linkage" : "warish";
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [appId, setAppId] = useState<string | null>(params.get("id"));
  const [draft, setDraft] = useState<ApplicationDraft>(EMPTY_DRAFT);
  const [step, setStep] = useState<WizardStepKey>(params.get("id") ? "applicant" : "duplicate");
  const [furthest, setFurthest] = useState(params.get("id") ? 1 : 0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(params.get("id")));
  const [status, setStatus] = useState<string | null>(null);
  const [returnRemark, setReturnRemark] = useState<string | null>(null);
  const [returnCount, setReturnCount] = useState(0);
  const [done, setDone] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  // Check role-based DEO certificate permissions and citizen quotas on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (!citizen) {
          const perm = await checkDeoCertificatePermission(user.id, kind);
          if (!perm.allowed) {
            setBlockMessage(perm.reason || "Certificate creation restricted by Super Admin.");
          }
        } else if (!params.get("id")) {
          const chk = await checkCitizenCanApply(user.id);
          if (!chk.canApply) {
            setBlockMessage(chk.reason || "Citizen application quota reached.");
          }
        }
      } catch (err) {
        console.warn("Could not verify permissions/quotas:", err);
      }
    })();
  }, [citizen, kind, params]);

  // Hydrate an existing draft / returned application
  useEffect(() => {
    const id = params.get("id");
    if (!id) {
      if (citizen) {
        (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: prof } = await supabase
                .from("citizen_profiles")
                .select("full_name, mobile, email, village, epic")
                .eq("user_id", user.id)
                .maybeSingle();

              if (prof) {
                setDraft((prev) => ({
                  ...prev,
                  applicant: {
                    ...prev.applicant,
                    name: prev.applicant.name || prof.full_name || "",
                    mobile: prev.applicant.mobile || prof.mobile || "",
                    email: prev.applicant.email || prof.email || user.email || "",
                    village: prev.applicant.village || prof.village || "",
                    epic: prev.applicant.epic || prof.epic || "",
                  },
                }));
              }
            }
          } catch (e) {
            console.warn("Could not prefill citizen profile:", e);
          }
        })();
      }
      return;
    }
    (async () => {
      try {
        const row = await loadApplication(kind, id);
        if (!row) { toast.error("Application not found."); navigate(citizen ? "/public/dashboard" : "/admin/deo"); return; }
        const loadedDraft = recordDataToDraft(row.data);
        if (kind === "warish") {
          try {
            const dbSuccessors = await fetchWarishSuccessors(id);
            if (dbSuccessors && dbSuccessors.length > 0) {
              loadedDraft.warish.successors = dbSuccessors;
            }
          } catch (e) {
            console.warn("Using stored draft successors payload", e);
          }
        }
        setDraft(loadedDraft);
        setStatus(row.status);
        setReturnCount(row.return_count ?? 0);
        setReturnRemark(row.status === "Returned" ? row.rejection_reason : null);
        setAppId(id);
        setRecord(row);
        setFurthest(stepIndex("preview"));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load the application");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    async (value: ApplicationDraft) => { if (appId) await saveDraft(kind, appId, value, citizen); },
    [appId, kind, citizen],
  );
  const autoSave = useAutoSave(draft, persist, { enabled: Boolean(appId) && !done });

  const editable = !done && (status === null || status === "Draft" || status === "Returned");

  const goto = async (key: WizardStepKey) => {
    if (appId) await autoSave.flush();
    setStep(key);
    setFurthest((f) => Math.max(f, stepIndex(key)));
  };

  const startNew = async (prefill?: ApplicationDraft, parentId?: string) => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Check DEO certificate permissions & daily quota
      if (!citizen && user) {
        const perm = await checkDeoCertificatePermission(user.id, kind);
        if (!perm.allowed) {
          toast.error(perm.reason || "Certificate creation restricted by Super Admin.");
          setBlockMessage(perm.reason || "Certificate creation restricted by Super Admin.");
          setBusy(false);
          return;
        }
      }

      // Check Citizen application limit
      if (citizen && user) {
        const chk = await checkCitizenCanApply(user.id);
        if (!chk.canApply) {
          toast.error(chk.reason || "Citizen application quota reached.");
          setBlockMessage(chk.reason || "Citizen application quota reached.");
          setBusy(false);
          return;
        }
      }

      const base = prefill ?? {
        ...EMPTY_DRAFT,
        applicant: { ...EMPTY_DRAFT.applicant, mobile: draft.applicant.mobile, email: draft.applicant.email },
      };
      const id = await createDraft(kind, base, parentId ?? null, citizen);
      setDraft(base);
      setAppId(id);
      setStatus("Draft");
      await goto("applicant");
      toast.success("📝 Draft created — everything is auto-saved from here.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the draft");
    } finally {
      setBusy(false);
    }
  };

  const bringExisting = async (match: DuplicateMatch) => {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from(KIND_TABLE[kind]).select("data").eq("id", match.id).maybeSingle();
      if (error || !data) {
        toast.info("Original application details are protected. Starting fresh draft with your contact information.");
        await startNew(null, null);
        return;
      }
      const prefill = recordDataToDraft((data as { data: unknown } | null)?.data);
      prefill.applicant = {
        ...prefill.applicant,
        mobile: draft.applicant.mobile || prefill.applicant.mobile,
        email: draft.applicant.email || prefill.applicant.email,
      };
      await startNew(prefill, match.id);
    } catch {
      toast.info("Starting fresh draft with your contact information.");
      await startNew(null, null);
    } finally {
      setBusy(false);
    }
  };

  const validationError = useMemo(() => {
    if (step === "applicant") {
      if (!draft.applicant.name.trim()) return "Applicant name is required.";
      if (!draft.applicant.village) return "Village is required.";
    }
    if (step === "details" && kind === "warish") {
      if (!draft.warish.deceasedName.trim()) return "Name of the deceased is required.";
      if (!draft.warish.dateOfDeath) return "Date of death is required.";
      if (!draft.warish.village) return "Village must be selected from the master dropdown.";
      if (!draft.warish.postOffice) return "Post office must be selected from the master dropdown.";
      if (!draft.warish.applicantRelation) return "Applicant's relation to deceased must be selected.";
      const succs = draft.warish.successors || [];
      const hasHeirs = succs.length > 0 || draft.warish.heirs.some((h) => h.name.trim());
      if (!hasHeirs) return "At least one legal successor is required.";
      const directCount = succs.filter((s) => !s.parent_successor_id).length;
      if (directCount > MAX_DIRECT_SUCCESSORS) {
        return `Direct successors cannot exceed ${MAX_DIRECT_SUCCESSORS}.`;
      }
      for (const s of succs) {
        if (!s.name.trim()) return `Name is required for successor ${s.serial_code}.`;
        if (!s.relation || !s.relation.trim()) return `Relation with deceased is required for successor ${s.serial_code}.`;
      }
    }
    if (step === "details" && kind === "dependent" && !draft.dependent.dependents.some((d) => d.name.trim()))
      return "At least one dependent name is required.";
    if (step === "details" && kind === "linkage") {
      if (!draft.linkage.assemblyConstituency?.trim())
        return "Assembly Constituency is required.";
      if (
        !draft.linkage.parentElectoralRecords ||
        draft.linkage.parentElectoralRecords.length === 0 ||
        !draft.linkage.parentElectoralRecords.some((r) => r.name.trim())
      ) {
        return "At least one parent / ancestor electoral record name is required.";
      }
    }
    if (step === "attachments" && record?.document_mode !== "DOCUMENT_ENGINE" && !draft.attachments.declarationAccepted)
      return "Please accept the declaration before continuing.";
    return null;
  }, [step, draft, kind, record?.document_mode]);

  const submit = async () => {
    if (!appId) return;
    setBusy(true);
    try {
      await autoSave.flush();
      const res = await submitApplication(kind, appId, citizen);
      setDone(true);
      setStatus(res.status);
      toast.success(res.resubmitted ? "📤 Resubmitted for Admin review" : "📤 Submitted for Admin review");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading application…</div>;
  }

  const idx = stepIndex(step);
  const prevKey = WIZARD_STEPS[idx - 1]?.key;
  const nextKey = WIZARD_STEPS[idx + 1]?.key;

  const footer = (
    <>
      {prevKey && (
        <Button type="button" variant="outline" onClick={() => goto(prevKey)} disabled={busy}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      )}
      {nextKey && step !== "duplicate" && (
        <Button
          type="button"
          disabled={busy || Boolean(validationError)}
          title={validationError ?? undefined}
          onClick={() => (step === "preview" ? submit() : goto(nextKey))}
        >
          {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {step === "preview" ? "📤 Submit" : "Next"}
          {step !== "preview" && <ArrowRight className="ml-1 h-4 w-4" />}
        </Button>
      )}
    </>
  );

  return (
    <WizardShell
      title={`${KIND_LABEL[kind]} — New Application`}
      current={done ? "submit" : step}
      furthest={furthest}
      onStepClick={(k) => !done && goto(k)}
      autoSave={autoSave}
      footer={done ? null : footer}
    >
      {done ? (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">📤 Submitted</h2>
          <p className="text-sm text-muted-foreground">
            The application is now with the office for review. You will see it under 🔄 Returned if a
            correction is needed.
          </p>
          {appId && <ApplicationTimeline kind={kind} id={appId} />}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to={citizen ? "/public/dashboard" : "/admin/deo"}>{citizen ? "🏠 Back to dashboard" : "🏠 Back to DEO dashboard"}</Link></Button>
            {!citizen && KIND_GENERATOR_ROUTE[kind] !== "#" && (
              <Button asChild><Link to={`${KIND_GENERATOR_ROUTE[kind]}?load=${appId}`}>📄 Open certificate sheet</Link></Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {blockMessage && (
            <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50/90 p-4 text-rose-900 shadow-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-950">
                <span>⛔ Access &amp; Quota Restriction</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-800">
                {blockMessage}
              </p>
              <div className="pt-2 flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="h-7 text-xs border-rose-300 text-rose-900 hover:bg-rose-100">
                  <Link to={citizen ? "/public/dashboard" : "/admin/deo"}>
                    {citizen ? "← Back to Citizen Dashboard" : "← Back to DEO Workspace"}
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {returnRemark && (
            <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
              🔄 Returned for modification ({returnCount}/5): {returnRemark}
            </div>
          )}

          {step === "duplicate" && (
            <DuplicateCheckStep
              kind={kind}
              mobile={draft.applicant.mobile}
              email={draft.applicant.email}
              busy={busy}
              onContact={(mobile, email) =>
                setDraft((d) => ({ ...d, applicant: { ...d.applicant, mobile, email } }))}
              onCreateNew={() => startNew()}
              onBringExisting={bringExisting}
            />
          )}

          {step === "applicant" && (
            <ApplicantSection
              value={draft.applicant}
              onChange={(applicant) => setDraft((d) => ({ ...d, applicant }))}
            />
          )}

          {step === "details" && kind === "warish" && (
            <WarishDetailsStep
              value={draft.warish}
              onChange={(warish) => setDraft((d) => ({ ...d, warish }))}
              appId={appId}
              readOnly={!editable}
            />
          )}
          {step === "details" && kind === "dependent" && (
            <DependentDetailsStep
              value={draft.dependent}
              applicant={draft.applicant}
              onChange={(dependent) => setDraft((d) => ({ ...d, dependent }))}
            />
          )}
          {step === "details" && kind === "linkage" && (
            <LinkageDetailsStep
              value={draft.linkage}
              applicant={draft.applicant}
              onChange={(linkage) => setDraft((d) => ({ ...d, linkage }))}
              readOnly={!editable}
            />
          )}

          {step === "attachments" && (
            <>
              {record?.document_mode === "DOCUMENT_ENGINE" && appId ? (
                <DocumentEngineStep appId={appId} kind={kind} />
              ) : (
                <AttachmentsStep
                  value={draft.attachments}
                  onChange={(attachments) => setDraft((d) => ({ ...d, attachments }))}
                />
              )}
            </>
          )}

          {step === "preview" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold">👀 Preview</h2>
                <p className="text-sm text-muted-foreground">Check everything before submitting to the Admin.</p>
              </div>
              <section>
                <h3 className="mb-1 text-sm font-semibold">👤 Applicant</h3>
                <Row label="Name" value={`${draft.applicant.prefix} ${draft.applicant.name}`.trim()} />
                <Row label="Guardian" value={`${draft.applicant.relationType} ${draft.applicant.guardianName}`.trim()} />
                <Row label="Village" value={draft.applicant.village === "Other" ? draft.applicant.villageManual : draft.applicant.village} />
                <Row label="Post Office" value={draft.applicant.postOffice === "Other" ? draft.applicant.postOfficeManual : draft.applicant.postOffice} />
                <Row label="Block / District" value={`${draft.applicant.block}, ${draft.applicant.district}`} />
                <Row label="Mobile" value={draft.applicant.mobile} />
                <Row label="Voter ID" value={draft.applicant.epicNo} />
              </section>
              <section>
                <h3 className="mb-1 text-sm font-semibold">📄 Certificate details</h3>
                {kind === "warish" ? (
                  <div className="space-y-4">
                    <Row label="Name of Deceased" value={draft.warish.deceasedName} />
                    <Row label="Father / Husband" value={`${draft.warish.fatherPrefix || "Late"} ${draft.warish.fatherName}`.trim()} />
                    <Row label="Date of Death" value={draft.warish.dateOfDeath} />
                    {draft.warish.ageAtDeath && <Row label="Age at Death" value={draft.warish.ageAtDeath} />}
                    {draft.warish.placeOfDeath && <Row label="Place of Death" value={draft.warish.placeOfDeath} />}
                    {draft.warish.causeOfDeath && <Row label="Cause of Death" value={draft.warish.causeOfDeath} />}
                    <Row label="Permanent Address" value={draft.warish.permanentAddress || `${draft.warish.village}, ${draft.warish.postOffice}`} />
                    <Row label="Village / P.O." value={`${draft.warish.village}, P.O. ${draft.warish.postOffice}`} />
                    <Row label="P.S. / District" value={`${draft.warish.policeStation || "Hanskhali"}, ${draft.warish.district || "Nadia"} - ${draft.warish.pin || "741502"}`} />
                    <Row label="Applicant Relation to Deceased" value={draft.warish.applicantRelation} />

                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Direct Successors of Late {draft.warish.deceasedName || "Deceased"}
                        </h4>
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                          {(draft.warish.successors || []).filter((s) => !s.parent_successor_id).length} / {MAX_DIRECT_SUCCESSORS}
                        </span>
                      </div>

                      {/* Nested Drafting Hierarchy Review (Section 38) */}
                      {draft.warish.successors && draft.warish.successors.length > 0 ? (
                        <div className="space-y-2 mt-3">
                          <div className="rounded-md border bg-muted/20 p-3 space-y-2 text-xs">
                            {draft.warish.successors.map((succ) => {
                              const isDirect = !succ.parent_successor_id;
                              const parentRecord = succ.parent_successor_id
                                ? draft.warish.successors.find((p) => p.id === succ.parent_successor_id)
                                : null;

                              return (
                                <div
                                  key={succ.id}
                                  style={{ paddingLeft: `${succ.depth * 16}px` }}
                                  className="border-b last:border-0 pb-2 pt-1"
                                >
                                  {!isDirect && parentRecord && succ.sort_order === 1 && (
                                    <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold mb-1 italic">
                                      "That the successors of Late {parentRecord.name} are noted below:"
                                    </div>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px]">
                                      {succ.serial_code}
                                    </span>
                                    <span className="font-semibold text-foreground">
                                      {succ.name || "Unnamed"}
                                    </span>
                                    {succ.care_of && (
                                      <span className="text-muted-foreground">({succ.care_of})</span>
                                    )}
                                    <span className="text-muted-foreground text-[11px]">
                                      • Relation: {succ.relation}
                                    </span>
                                    {succ.age != null && (
                                      <span className="text-muted-foreground text-[11px]">
                                        • Age: {succ.age}
                                      </span>
                                    )}
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                        succ.is_deceased
                                          ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                                          : "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      }`}
                                    >
                                      {succ.is_deceased ? "Deceased" : "Living"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Compact Tree Hierarchy Block */}
                          <div className="mt-3">
                            <h5 className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                              Hierarchy Tree
                            </h5>
                            <pre className="rounded bg-muted/60 p-2.5 text-[11px] font-mono whitespace-pre overflow-x-auto border">
                              {generateSuccessorTreePreview(draft.warish.successors)}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded border border-dashed p-3 text-xs text-muted-foreground text-center">
                          {draft.warish.heirs.length} heir(s) registered.
                        </div>
                      )}
                    </div>
                  </div>
                ) : kind === "linkage" ? (
                  <div className="space-y-4">
                    <Row label="Voter Registration Status" value={draft.linkage.voterStatus === "registered" ? "Already Registered" : "Unregistered (Seeking Enrolment)"} />
                    <Row label="Assembly Constituency" value={draft.linkage.assemblyConstituency} />
                    {draft.linkage.voterStatus === "registered" && (
                      <>
                        <Row label="Applicant Part No." value={draft.linkage.applicantPartNo} />
                        <Row label="Applicant Serial No." value={draft.linkage.applicantSerialNo} />
                        <Row label="Applicant EPIC No." value={draft.linkage.applicantEpicNo} />
                      </>
                    )}
                    <Row label="Purpose" value={draft.linkage.purpose} />
                    <Row label="Target Constituency" value={draft.linkage.targetAssemblyConstituency} />

                    <div className="pt-2 border-t">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Parent / Ancestor Electoral Records ({draft.linkage.parentElectoralRecords?.length ?? 0})
                      </h4>
                      <div className="space-y-2">
                        {draft.linkage.parentElectoralRecords?.map((rec, i) => (
                          <div key={i} className="rounded border bg-muted/20 p-2.5 text-xs space-y-1">
                            <div className="font-semibold text-foreground">
                              {rec.name || "Unnamed"} ({rec.relation})
                            </div>
                            <div className="text-muted-foreground">
                              Part: {rec.partNo || "—"} · Serial: {rec.serialNo || "—"} · EPIC: {rec.epicNo || "—"}
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              Source: {rec.electoralRollYear || "Draft Electoral Roll 2025"} ({rec.assemblyConstituency || draft.linkage.assemblyConstituency})
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {draft.linkage.spouseName && (
                      <div className="pt-2 border-t">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          Marriage &amp; Spouse Particulars
                        </h4>
                        <Row label="Spouse Name" value={draft.linkage.spouseName} />
                        <Row label="Relation" value={draft.linkage.spouseRelationWording} />
                        {draft.linkage.spouseParentInfo && <Row label="Spouse Parent Info" value={draft.linkage.spouseParentInfo} />}
                        {draft.linkage.spouseVillage && <Row label="Spouse Village" value={draft.linkage.spouseVillage} />}
                        {draft.linkage.spousePostOffice && <Row label="Spouse P.O." value={draft.linkage.spousePostOffice} />}
                        {draft.linkage.spousePoliceStation && <Row label="Spouse P.S." value={draft.linkage.spousePoliceStation} />}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Row label="Employee" value={draft.dependent.applicantIsEmployee ? draft.applicant.name : draft.dependent.empName} />
                    <Row label="Department" value={draft.dependent.dept === "Other" ? draft.dependent.deptManual : draft.dependent.dept} />
                    <Row label="Dependents" value={String(draft.dependent.dependents.filter((d) => d.name.trim()).length)} />
                  </>
                )}
              </section>
              <section>
                <h3 className="mb-1 text-sm font-semibold">📎 Attachments</h3>
                {draft.attachments.items.map((i) => (
                  <Row key={i.label} label={i.label} value={i.provided ? "Provided" : "Not provided"} />
                ))}
              </section>
              {appId && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">🕒 Timeline</h3>
                  <ApplicationTimeline kind={kind} id={appId} />
                </section>
              )}
            </div>
          )}

          {!editable && step !== "duplicate" && (
            <p className="mt-4 text-sm text-muted-foreground">
              This application is already with the Admin, so it is read-only here.
            </p>
          )}
          {validationError && <p className="mt-4 text-sm text-destructive">{validationError}</p>}
        </>
      )}
    </WizardShell>
  );
}
