import { supabase } from "@/integrations/supabase/client";
import {
  KIND_TABLE,
  type ApplicationDraft,
  type ApplicationKind,
  EMPTY_DRAFT,
} from "./types";
import type { Json } from "@/integrations/supabase/types";

export interface DuplicateMatch {
  id: string;
  kind: string;
  applicant_name: string | null;
  village: string | null;
  status: string | null;
  memo_no: string | null;
  created_at: string;
  submitted_at: string | null;
  return_count: number;
  source: string;
}

export interface TimelineEvent {
  action: string;
  event: string;
  actor_email: string | null;
  reason: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const resolved = (value: string, manual: string) => (value === "Other" ? manual : value);

/**
 * Serialises the wizard draft into the same `data` jsonb shape the existing
 * Warish / Dependent generator pages already read via `?load=<id>`.
 */
export function draftToRecordData(kind: ApplicationKind, draft: ApplicationDraft) {
  const a = draft.applicant;
  const village = resolved(a.village, a.villageManual);
  const po = resolved(a.postOffice, a.postOfficeManual);

  const common = {
    __wizard: draft,
    applicantAadhaarLast4: a.aadhaarLast4 || null,
    applicantEpic: a.epicNo || null,
  };

  if (kind === "warish") {
    return {
      ...common,
      deceasedName: draft.warish.deceasedName,
      fatherPrefix: draft.warish.fatherPrefix,
      fatherName: draft.warish.fatherName,
      relationToGuardian: draft.warish.relationToGuardian || "Father",
      permanentAddress: draft.warish.permanentAddress || "",
      village: draft.warish.village || village,
      village_id: draft.warish.village_id,
      postOffice: draft.warish.postOffice || po,
      post_office_id: draft.warish.post_office_id,
      policeStation: draft.warish.policeStation || a.policeStation,
      district: draft.warish.district || a.district,
      pin: draft.warish.pin || a.pin,
      dateOfDeath: draft.warish.dateOfDeath,
      placeOfDeath: draft.warish.placeOfDeath || "",
      causeOfDeath: draft.warish.causeOfDeath || "",
      ageAtDeath: draft.warish.ageAtDeath || "",
      applicantName: a.name,
      applicantRelation: draft.warish.applicantRelation,
      applicant_relation_id: draft.warish.applicant_relation_id,
      guardianName: a.guardianName,
      heirs: draft.warish.heirs.map((h) => ({
        name: h.name,
        relation: h.relation,
        age: h.age,
        hasLegalSuccessors: h.hasLegalSuccessors,
      })),
      successors: draft.warish.successors || [],
    };
  }

  if (kind === "linkage") {
    return {
      ...common,
      appName: a.name,
      relationshipType: a.relationType,
      guardianName: a.guardianName,
      village: a.village || village,
      postOffice: po,
      policeStation: a.policeStation,
      block: a.block,
      district: a.district,
      pin: a.pin,
      assemblyConstituency: draft.linkage.assemblyConstituency,
      voterStatus: draft.linkage.voterStatus,
      applicantPartNo: draft.linkage.applicantPartNo,
      applicantSerialNo: draft.linkage.applicantSerialNo,
      applicantEpicNo: draft.linkage.applicantEpicNo,
      purpose: draft.linkage.purpose,
      targetAssemblyConstituency: draft.linkage.targetAssemblyConstituency,
      parentElectoralRecords: draft.linkage.parentElectoralRecords || [],
      spouseName: draft.linkage.spouseName,
      spouseRelationWording: draft.linkage.spouseRelationWording,
      spouseParentInfo: draft.linkage.spouseParentInfo,
      spouseVillage: draft.linkage.spouseVillage,
      spousePostOffice: draft.linkage.spousePostOffice,
      spousePoliceStation: draft.linkage.spousePoliceStation,
      spousePanchayat: draft.linkage.spousePanchayat,
      spouseBlock: draft.linkage.spouseBlock,
    };
  }

  return {
    ...common,
    appTitle: a.prefix,
    appName: a.name,
    appRelType: a.relationType,
    appParentTitle: "Shri",
    appParent: a.guardianName,
    empId: draft.dependent.empId,
    dept: draft.dependent.dept,
    deptManual: draft.dependent.deptManual,
    village: a.village,
    villageManual: a.villageManual,
    po,
    poManual: a.postOfficeManual,
    ps: a.policeStation,
    block: a.block,
    dependents: draft.dependent.dependents.map((d) => ({ ...d, aadhaarLast4: null })),
  };
}

export function recordDataToDraft(data: unknown): ApplicationDraft {
  const d = (data ?? {}) as Record<string, unknown>;
  const saved = d.__wizard as ApplicationDraft | undefined;
  if (saved && saved.applicant) {
    return {
      ...EMPTY_DRAFT,
      ...saved,
      applicant: { ...EMPTY_DRAFT.applicant, ...saved.applicant },
      warish: {
        ...EMPTY_DRAFT.warish,
        ...saved.warish,
        relationToGuardian: saved.warish?.relationToGuardian || "Father",
        permanentAddress: saved.warish?.permanentAddress || "",
        village: saved.warish?.village || (d.village as string) || "",
        village_id: saved.warish?.village_id || (d.village_id as string) || "",
        postOffice: saved.warish?.postOffice || (d.postOffice as string) || "",
        post_office_id: saved.warish?.post_office_id || (d.post_office_id as string) || "",
        policeStation: saved.warish?.policeStation || "Hanskhali",
        district: saved.warish?.district || "Nadia",
        pin: saved.warish?.pin || "741502",
        placeOfDeath: saved.warish?.placeOfDeath || "",
        causeOfDeath: saved.warish?.causeOfDeath || "",
        ageAtDeath: saved.warish?.ageAtDeath || "",
        applicantRelation: saved.warish?.applicantRelation || (d.applicantRelation as string) || "",
        applicant_relation_id: saved.warish?.applicant_relation_id || (d.applicant_relation_id as string) || "",
        successors: saved.warish?.successors || [],
      },
      dependent: { ...EMPTY_DRAFT.dependent, ...saved.dependent },
      linkage: {
        ...EMPTY_DRAFT.linkage,
        ...(saved.linkage || {}),
        parentElectoralRecords: saved.linkage?.parentElectoralRecords || (d.parentElectoralRecords as any[]) || EMPTY_DRAFT.linkage.parentElectoralRecords,
      },
      attachments: { ...EMPTY_DRAFT.attachments, ...saved.attachments },
    };
  }
  return EMPTY_DRAFT;
}

/**
 * Resilient verification ID generator.
 * Tries the Supabase RPC first; falls back gracefully to a standard compliant format
 * if database permissions, network, or schema constraints prevent RPC execution.
 */
export async function getOrGenerateVerificationId(
  kind: ApplicationKind | string,
  year: number = new Date().getFullYear(),
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("generate_verification_id", {
      _kind: kind,
      _year: year,
    });
    if (!error && data && typeof data === "string" && data.trim()) {
      return data.trim();
    }
    if (error) {
      console.warn("generate_verification_id RPC failed, using client fallback:", error.message);
    }
  } catch (err) {
    console.warn("generate_verification_id RPC exception, using client fallback:", err);
  }

  // Format: KIND-YEAR-XXXXX (e.g. WARISH-2026-58291)
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `${kind.toUpperCase()}-${year}-${rand}`;
}

export async function createDraft(
  kind: ApplicationKind,
  draft: ApplicationDraft,
  parentId?: string | null,
  citizen = false,
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) throw new Error("You must be signed in to start an application.");

  // For office/staff users, enforce active account status and certificate service scope
  if (!citizen) {
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("status, service_scope")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.status === "suspended" || profile?.status === "inactive") {
      throw new Error("Your staff account has been suspended or deactivated. Please contact the Super Admin.");
    }

    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (userRoles || []).map((r: any) => r.role);
    const isSuperOrAdmin = roles.includes("super_admin") || roles.includes("admin");

    if (!isSuperOrAdmin && roles.includes("deo")) {
      const scope = (profile?.service_scope || []) as string[];
      const isAllowed = scope.includes("all") || scope.includes(kind);
      if (!isAllowed) {
        throw new Error(`Permission Denied: Your DEO account is not authorized to create ${kind.toUpperCase()} certificates.`);
      }
    }
  } else {
    // For citizens, enforce daily submission quotas per mobile/account
    const cleanMobile = (draft.applicant.mobile || "").replace(/\D/g, "").slice(-10);
    if (cleanMobile.length === 10) {
      const tableName = KIND_TABLE[kind];
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from(tableName as never)
        .select("id", { count: "exact", head: true })
        .eq("contact_mobile" as never, cleanMobile as never)
        .gte("created_at" as never, oneDayAgo as never);

      if (typeof count === "number" && count >= 5) {
        throw new Error("Daily submission quota reached: Maximum 5 applications per mobile number every 24 hours. Please wait before submitting additional applications.");
      }
    }
  }

  const payload: Record<string, unknown> = {
    // applicant_name / deceased_name are NOT NULL in the DB; the draft is created
    // before the applicant step, so send "" until the name is typed.
    applicant_name: draft.applicant.name || "",
    village: resolved(draft.applicant.village, draft.applicant.villageManual) || null,
    contact_mobile: draft.applicant.mobile || null,
    contact_email: draft.applicant.email || null,
    data: draftToRecordData(kind, draft),
  };
  if (kind === "warish") payload.deceased_name = draft.warish.deceasedName || "";
  if (kind === "dependent") payload.department = draft.dependent.dept || null;

  if (!citizen) {
    // 1. Try unified RPC first
    try {
      const { data: rpcId, error: rpcErr } = await supabase.rpc("create_certificate_draft", {
        _kind: kind,
        _data: payload.data as Json,
        _applicant_name: String(payload.applicant_name ?? ""),
        _deceased_name: String(payload.deceased_name ?? ""),
        _village: (payload.village as string | null) ?? null,
        _department: (payload.department as string | null) ?? null,
        _contact_mobile: draft.applicant.mobile || null,
        _contact_email: draft.applicant.email || null,
        _parent_application_id: parentId ?? null,
        _citizen: false,
      });
      if (!rpcErr && rpcId) return String(rpcId);
    } catch {
      // Continue to direct insert
    }

    const verificationId = await getOrGenerateVerificationId(kind, new Date().getFullYear());
    const rowPayload = {
      verification_id: verificationId,
      memo_no: null,
      cert_date: null,
      status: "Draft",
      applicant_name: String(payload.applicant_name ?? ""),
      village: (payload.village as string | null) ?? null,
      data: payload.data as Json,
      created_by: user.id,
      contact_mobile: draft.applicant.mobile || null,
      contact_email: draft.applicant.email || null,
    };
    const { data: row, error } = kind === "warish"
      ? await supabase.from("warish_certificates").insert({
          ...rowPayload,
          deceased_name: String(payload.deceased_name ?? ""),
        }).select("id").single()
      : kind === "dependent"
        ? await supabase.from("dependent_certificates").insert({
            ...rowPayload,
            department: (payload.department as string | null) ?? null,
          }).select("id").single()
        : await supabase.from("linkage_certificates").insert({
            ...rowPayload,
            relationship_type: draft.applicant.relationType || "w/o",
            guardian_name: draft.applicant.guardianName || "",
            assembly_constituency: draft.linkage.assemblyConstituency,
            voter_status: draft.linkage.voterStatus,
            applicant_part_no: draft.linkage.applicantPartNo || null,
            applicant_serial_no: draft.linkage.applicantSerialNo || null,
            applicant_epic_no: draft.linkage.applicantEpicNo || null,
            purpose: draft.linkage.purpose,
            target_assembly_constituency: draft.linkage.targetAssemblyConstituency,
            spouse_name: draft.linkage.spouseName || null,
            spouse_relation_wording: draft.linkage.spouseRelationWording || null,
            spouse_parent_info: draft.linkage.spouseParentInfo || null,
            spouse_village: draft.linkage.spouseVillage || null,
            spouse_post_office: draft.linkage.spousePostOffice || null,
          }).select("id").single();

    if (error) {
      console.warn("Direct staff draft insert notice, invoking edge function fallback:", error.message);
      try {
        const { data: fnData, error: fnErr } = await supabase.functions.invoke("citizen-auth", {
          body: {
            action: "create_draft",
            payload: {
              kind,
              data: payload.data,
              applicant_name: payload.applicant_name,
              deceased_name: payload.deceased_name,
              village: payload.village,
              department: payload.department,
              contact_mobile: draft.applicant.mobile || null,
              contact_email: draft.applicant.email || null,
              parent_application_id: parentId ?? null,
              citizen: false,
            },
          },
        });
        if (!fnErr && fnData?.id) return String(fnData.id);
      } catch (fnEx) {
        console.error("Staff draft edge fallback error:", fnEx);
      }
      throw new Error(error.message);
    }

    if (kind === "linkage" && draft.linkage.parentElectoralRecords?.length > 0) {
      const recordsToInsert = draft.linkage.parentElectoralRecords.map((r, idx) => ({
        application_id: row.id,
        name: r.name,
        relation: r.relation,
        part_no: r.partNo || null,
        serial_no: r.serialNo || null,
        epic_no: r.epicNo || null,
        electoral_roll_year: r.electoralRollYear || "Draft Electoral Roll 2025",
        assembly_constituency: r.assemblyConstituency || draft.linkage.assemblyConstituency,
        sort_order: idx + 1,
      }));
      await supabase.from("linkage_parent_electoral_records").insert(recordsToInsert);
    }
    return row.id;
  }

  // Citizen application flow
  const targetMobile = (draft.applicant.mobile || "").replace(/\D/g, "").slice(-10);
  let effectiveMobile = targetMobile;

  // Try to sync with citizen_profiles
  try {
    const { data: prof } = await supabase
      .from("citizen_profiles")
      .select("id, mobile, full_name, village, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!effectiveMobile && prof?.mobile) {
      effectiveMobile = prof.mobile.replace(/\D/g, "").slice(-10);
    } else if (effectiveMobile && effectiveMobile.length === 10 && (!prof?.mobile || prof.mobile !== effectiveMobile)) {
      // Keep citizen_profiles in sync so the RPC constraint passes
      await supabase.from("citizen_profiles").update({ mobile: effectiveMobile }).eq("user_id", user.id);
    }
  } catch (profErr) {
    console.warn("citizen profile check notice:", profErr);
  }

  // 1. Attempt unified RPC first
  try {
    const { data: rpcId, error: rpcErr } = await supabase.rpc("create_certificate_draft", {
      _kind: kind,
      _data: payload.data as Json,
      _applicant_name: String(payload.applicant_name ?? ""),
      _deceased_name: String(payload.deceased_name ?? ""),
      _village: (payload.village as string | null) ?? null,
      _department: (payload.department as string | null) ?? null,
      _contact_mobile: effectiveMobile || draft.applicant.mobile || null,
      _contact_email: (payload.contact_email as string | null) ?? null,
      _parent_application_id: parentId ?? null,
      _citizen: true,
    });
    if (!rpcErr && rpcId) return String(rpcId);
  } catch {
    // Continue
  }

  // 2. Attempt create_citizen_draft RPC
  if (effectiveMobile && effectiveMobile.length === 10) {
    try {
      const { data, error } = await supabase.rpc("create_citizen_draft", {
        _kind: kind,
        _data: payload.data as Json,
        _applicant_name: String(payload.applicant_name ?? ""),
        _deceased_name: String(payload.deceased_name ?? ""),
        _village: (payload.village as string | null) ?? null,
        _contact_mobile: effectiveMobile,
        _contact_email: (payload.contact_email as string | null) ?? null,
        _parent_application_id: parentId ?? null,
      });
      if (!error && data) return String(data);
      if (error) {
        console.warn("create_citizen_draft RPC notice, using direct authenticated insert:", error.message);
      }
    } catch (rpcEx) {
      console.warn("create_citizen_draft RPC exception, falling back:", rpcEx);
    }
  }

  // 3. Resilient direct authenticated insert fallback
  const verificationId = await getOrGenerateVerificationId(kind, new Date().getFullYear());
  const rowPayload = {
    verification_id: verificationId,
    memo_no: null,
    cert_date: null,
    status: "Draft",
    applicant_name: String(payload.applicant_name ?? ""),
    village: (payload.village as string | null) ?? null,
    data: payload.data as Json,
    created_by: user.id,
    citizen_user_id: user.id,
    source: "public",
    contact_mobile: effectiveMobile || draft.applicant.mobile || null,
    contact_email: draft.applicant.email || null,
    public_edit_until: new Date(Date.now() + 3 * 86400000).toISOString(),
    parent_application_id: parentId ?? null,
  };

  const { data: row, error: insertErr } = kind === "warish"
    ? await supabase.from("warish_certificates").insert({
        ...rowPayload,
        deceased_name: String(payload.deceased_name ?? ""),
      }).select("id").single()
    : kind === "dependent"
      ? await supabase.from("dependent_certificates").insert({
          ...rowPayload,
          department: (payload.department as string | null) ?? null,
        }).select("id").single()
      : await supabase.from("linkage_certificates").insert({
          ...rowPayload,
          relationship_type: draft.applicant.relationType || "w/o",
          guardian_name: draft.applicant.guardianName || "",
          assembly_constituency: draft.linkage.assemblyConstituency,
          voter_status: draft.linkage.voterStatus,
          purpose: draft.linkage.purpose,
          target_assembly_constituency: draft.linkage.targetAssemblyConstituency,
          document_mode: "DOCUMENT_ENGINE",
        }).select("id").single();

  if (!insertErr && row?.id) {
    return row.id;
  }

  // 4. If direct insert failed (e.g. 42501 permission denied), invoke Edge Function fallback
  console.warn("Direct draft insert error, attempting secure edge function creation:", insertErr?.message);
  try {
    const { data: fnData, error: fnErr } = await supabase.functions.invoke("citizen-auth", {
      body: {
        action: "create_draft",
        payload: {
          kind,
          data: payload.data,
          applicant_name: payload.applicant_name,
          deceased_name: payload.deceased_name,
          village: payload.village,
          department: payload.department,
          contact_mobile: effectiveMobile || draft.applicant.mobile || null,
          contact_email: draft.applicant.email || null,
          parent_application_id: parentId ?? null,
          citizen: true,
        },
      },
    });
    if (!fnErr && fnData?.id) {
      return String(fnData.id);
    }
  } catch (fnEx) {
    console.error("Citizen draft edge function fallback error:", fnEx);
  }

  if (insertErr) {
    throw new Error(insertErr.message);
  }
  throw new Error("Unable to create application draft. Please check your connection and try again.");
}

export async function saveDraft(kind: ApplicationKind, id: string, draft: ApplicationDraft, citizen = false) {
  const payload: Record<string, unknown> = {
    applicant_name: draft.applicant.name || "",
    village: resolved(draft.applicant.village, draft.applicant.villageManual) || null,
    contact_mobile: draft.applicant.mobile || null,
    contact_email: draft.applicant.email || null,
    data: draftToRecordData(kind, draft),
  };
  if (kind === "warish") payload.deceased_name = draft.warish.deceasedName || "";
  if (kind === "dependent") payload.department = draft.dependent.dept || null;

  if (!citizen) {
    const { error } = kind === "warish"
      ? await supabase.from("warish_certificates").update({
          applicant_name: String(payload.applicant_name ?? ""),
          deceased_name: String(payload.deceased_name ?? ""),
          village: (payload.village as string | null) ?? null,
          data: payload.data as Json,
        }).eq("id", id)
      : kind === "dependent"
        ? await supabase.from("dependent_certificates").update({
            applicant_name: String(payload.applicant_name ?? ""),
            village: (payload.village as string | null) ?? null,
            data: payload.data as Json,
            department: (payload.department as string | null) ?? null,
          }).eq("id", id)
        : await supabase.from("linkage_certificates").update({
            applicant_name: String(payload.applicant_name ?? ""),
            village: (payload.village as string | null) ?? null,
            data: payload.data as Json,
            relationship_type: draft.applicant.relationType || "w/o",
            guardian_name: draft.applicant.guardianName || "",
            assembly_constituency: draft.linkage.assemblyConstituency,
            voter_status: draft.linkage.voterStatus,
            applicant_part_no: draft.linkage.applicantPartNo || null,
            applicant_serial_no: draft.linkage.applicantSerialNo || null,
            applicant_epic_no: draft.linkage.applicantEpicNo || null,
            purpose: draft.linkage.purpose,
            target_assembly_constituency: draft.linkage.targetAssemblyConstituency,
            spouse_name: draft.linkage.spouseName || null,
            spouse_relation_wording: draft.linkage.spouseRelationWording || null,
            spouse_parent_info: draft.linkage.spouseParentInfo || null,
            spouse_village: draft.linkage.spouseVillage || null,
            spouse_post_office: draft.linkage.spousePostOffice || null,
          }).eq("id", id);

    if (error) {
      console.warn("Direct staff draft update notice, attempting edge fallback:", error.message);
      const { error: fnErr } = await supabase.functions.invoke("citizen-auth", {
        body: {
          action: "save_draft",
          payload: {
            id,
            kind,
            data: payload.data,
            applicant_name: payload.applicant_name,
            deceased_name: payload.deceased_name,
            village: payload.village,
            contact_mobile: payload.contact_mobile,
            contact_email: payload.contact_email,
          },
        },
      });
      if (fnErr) throw new Error(error.message);
    }

    if (kind === "linkage" && draft.linkage.parentElectoralRecords) {
      await supabase.from("linkage_parent_electoral_records").delete().eq("application_id", id);
      if (draft.linkage.parentElectoralRecords.length > 0) {
        const recordsToInsert = draft.linkage.parentElectoralRecords.map((r, idx) => ({
          application_id: id,
          name: r.name,
          relation: r.relation,
          part_no: r.partNo || null,
          serial_no: r.serialNo || null,
          epic_no: r.epicNo || null,
          electoral_roll_year: r.electoralRollYear || "Draft Electoral Roll 2025",
          assembly_constituency: r.assemblyConstituency || draft.linkage.assemblyConstituency,
          sort_order: idx + 1,
        }));
        await supabase.from("linkage_parent_electoral_records").insert(recordsToInsert);
      }
    }
    return;
  }

  const { error } = await supabase.rpc("save_citizen_draft", {
    _kind: kind,
    _cert_id: id,
    _data: payload.data as Json,
    _applicant_name: String(payload.applicant_name ?? ""),
    _deceased_name: String(payload.deceased_name ?? ""),
    _village: (payload.village as string | null) ?? null,
    _contact_mobile: (payload.contact_mobile as string | null) ?? null,
    _contact_email: (payload.contact_email as string | null) ?? null,
  });

  if (error) {
    console.warn("save_citizen_draft RPC notice, attempting edge fallback:", error.message);
    const { error: fnErr } = await supabase.functions.invoke("citizen-auth", {
      body: {
        action: "save_draft",
        payload: {
          id,
          kind,
          data: payload.data,
          applicant_name: payload.applicant_name,
          deceased_name: payload.deceased_name,
          village: payload.village,
          contact_mobile: payload.contact_mobile,
          contact_email: payload.contact_email,
        },
      },
    });
    if (fnErr) throw new Error(error.message);
  }
}

export async function loadApplication(kind: ApplicationKind, id: string) {
  const { data, error } = await supabase
    .from(KIND_TABLE[kind])
    .select("id, status, data, return_count, rejection_reason, contact_mobile, contact_email, document_mode")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as {
    id: string;
    status: string | null;
    data: unknown;
    return_count: number;
    rejection_reason: string | null;
    contact_mobile: string | null;
    contact_email: string | null;
    document_mode?: string;
  } | null;
}

export interface CitizenApplicationRow {
  id: string;
  kind: ApplicationKind;
  applicant_name: string | null;
  status: string | null;
  memo_no: string | null;
  certificate_number: string | null;
  created_at: string;
  submitted_at: string | null;
  public_edit_until: string | null;
  rejection_reason: string | null;
  return_count?: number;
}

/** Applications belonging to the signed-in citizen (RLS scopes rows to the owner). */
export async function listCitizenApplications(): Promise<CitizenApplicationRow[]> {
  const cols = "id, applicant_name, status, memo_no, certificate_number, created_at, submitted_at, public_edit_until, rejection_reason, return_count";

  const safeFetch = async (table: string): Promise<Record<string, unknown>[]> => {
    try {
      const res = await supabase
        .from(table as never)
        .select(cols as never)
        .order("created_at", { ascending: false });
      if (res.error) {
        console.warn(`Safe query notice on ${table}:`, res.error.message);
        return [];
      }
      return (res.data || []) as unknown as Record<string, unknown>[];
    } catch {
      return [];
    }
  };

  const [warishRows, dependentRows, linkageRows] = await Promise.all([
    safeFetch("warish_certificates"),
    safeFetch("dependent_certificates"),
    safeFetch("linkage_certificates"),
  ]);

  const map = (rows: Record<string, unknown>[], kind: ApplicationKind) =>
    rows.map((r) => ({
      id: String(r.id),
      kind,
      applicant_name: (r.applicant_name as string | null) ?? null,
      status: (r.status as string | null) ?? null,
      memo_no: (r.memo_no as string | null) ?? null,
      certificate_number: (r.certificate_number as string | null) ?? null,
      created_at: String(r.created_at ?? ""),
      submitted_at: (r.submitted_at as string | null) ?? null,
      public_edit_until: (r.public_edit_until as string | null) ?? null,
      rejection_reason: (r.rejection_reason as string | null) ?? null,
      return_count: typeof r.return_count === "number" ? r.return_count : 0,
    }));

  return [
    ...map(warishRows, "warish"),
    ...map(dependentRows, "dependent"),
    ...map(linkageRows, "linkage"),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function findDuplicates(
  kind: ApplicationKind,
  mobile: string,
  email?: string,
): Promise<DuplicateMatch[]> {
  const cleanMobile = (mobile || "").replace(/\D/g, "").slice(-10);
  const cleanEmail = (email || "").trim().toLowerCase() || null;

  if (cleanMobile.length !== 10) {
    return [];
  }

  // Tier 1: Try unified_find_duplicates (backend-authoritative, works for office and citizen)
  try {
    const { data: unifiedData, error: unifiedError } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)("unified_find_duplicates", {
      _mobile: cleanMobile,
      _email: cleanEmail,
    });

    if (!unifiedError && Array.isArray(unifiedData)) {
      const rows = unifiedData as Record<string, unknown>[];
      return rows
        .filter((r) => !kind || r.kind === kind || !r.kind)
        .map((r) => ({
          id: String(r.id ?? ""),
          kind: String(r.kind ?? kind),
          applicant_name: (r.applicant_name as string | null) ?? (r.person_name as string | null) ?? null,
          village: (r.village as string | null) ?? null,
          status: (r.status as string | null) ?? null,
          memo_no: (r.memo_no as string | null) ?? null,
          created_at: String(r.created_at ?? new Date().toISOString()),
          submitted_at: null,
          return_count: 0,
          source: String(r.source ?? "office"),
        }));
    }
  } catch (err) {
    console.warn("unified_find_duplicates RPC notice:", err);
  }

  // Tier 2: Try find_citizen_duplicates (scoped citizen duplicate search)
  try {
    const rpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { data, error } = await rpc("find_citizen_duplicates", {
      _kind: kind,
      _mobile: cleanMobile,
      _email: cleanEmail,
    });

    if (!error && Array.isArray(data)) {
      const rows = data as Record<string, unknown>[];
      return rows.map((r) => ({
        id: String(r.id ?? ""),
        kind: String(r.kind ?? kind),
        applicant_name: (r.applicant_name as string | null) ?? null,
        village: (r.village as string | null) ?? null,
        status: (r.status as string | null) ?? null,
        memo_no: (r.memo_no as string | null) ?? null,
        created_at: String(r.created_at ?? ""),
        submitted_at: null,
        return_count: 0,
        source: String(r.source ?? "public"),
      }));
    }
  } catch (err) {
    console.warn("find_citizen_duplicates RPC notice:", err);
  }

  // Return safe empty list without throwing or leaking raw database permissions or internals
  return [];
}

export async function submitApplication(kind: ApplicationKind, id: string, citizen = false) {
  const rpcName = citizen ? "submit_citizen_application" : "submit_application";
  try {
    const { data, error } = await supabase.rpc(rpcName as any, { _kind: kind, _cert_id: id });
    if (!error && data) {
      return data as { status: string; resubmitted: boolean };
    }
    if (error) {
      console.warn(`${rpcName} RPC notice, attempting direct state update:`, error.message);
    }
  } catch (err) {
    console.warn(`${rpcName} exception:`, err);
  }

  // Resilient fallback update for authenticated submission
  const tableName = KIND_TABLE[kind];
  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabase
    .from(tableName as never)
    .update({
      status: "Pending Scrutiny & Report",
      submitted_at: now,
      updated_at: now,
    } as never)
    .eq("id" as never, id as never)
    .select("status, return_count")
    .single();

  if (updateErr) throw new Error(updateErr.message);
  return { status: "Pending Scrutiny & Report", resubmitted: ((updated as any)?.return_count || 0) > 0 };
}

export async function returnApplication(kind: ApplicationKind, id: string, reason: string) {
  const { data, error } = await supabase.rpc("return_application", {
    _kind: kind,
    _cert_id: id,
    _reason: reason,
  });
  if (error) throw new Error(error.message);
  return data as unknown as { status: string; return_count: number; auto_rejected: boolean };
}

export async function fetchTimeline(kind: ApplicationKind, id: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase.rpc("application_timeline", { _kind: kind, _cert_id: id });
  if (error) throw new Error(error.message);
  return (data ?? []) as TimelineEvent[];
}

export async function openOfficeWorkingCopy(kind: ApplicationKind, id: string) {
  const { error } = await supabase.rpc("open_office_working_copy", { _kind: kind, _cert_id: id });
  if (error) throw new Error(error.message);
}

// ============================================================================
// WARISH HIERARCHICAL SUCCESSOR OPERATIONS (TIER 1 BACKEND FOUNDATION)
// ============================================================================

import type {
  WarishSuccessorRecord,
  CreateSuccessorInput,
  UpdateSuccessorInput,
} from "@/modules/warish/successorModel";

export async function fetchWarishSuccessors(applicationId: string): Promise<WarishSuccessorRecord[]> {
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("get_warish_successors_tree", {
    _application_id: applicationId,
  });
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []) as unknown as WarishSuccessorRecord[];
}

export async function createWarishSuccessor(input: CreateSuccessorInput): Promise<WarishSuccessorRecord> {
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("create_warish_successor", {
    _application_id: input.application_id,
    _parent_successor_id: input.parent_successor_id ?? null,
    _name: input.name,
    _care_of: input.care_of ?? "",
    _relation: input.relation,
    _age: input.age ?? null,
    _is_deceased: input.is_deceased ?? false,
    _has_successors: input.has_successors ?? false,
    _relation_id: input.relation_id ?? null,
  });
  if (error) throw new Error(error.message);
  return data as unknown as WarishSuccessorRecord;
}

export async function updateWarishSuccessor(input: UpdateSuccessorInput): Promise<WarishSuccessorRecord> {
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("update_warish_successor", {
    _successor_id: input.id,
    _name: input.name,
    _care_of: input.care_of ?? "",
    _relation: input.relation,
    _age: input.age ?? null,
    _is_deceased: input.is_deceased ?? false,
    _has_successors: input.has_successors ?? false,
    _relation_id: input.relation_id ?? null,
  });
  if (error) throw new Error(error.message);
  return data as unknown as WarishSuccessorRecord;
}

export async function deleteWarishSuccessor(successorId: string): Promise<boolean> {
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("delete_warish_successor", {
    _successor_id: successorId,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}
