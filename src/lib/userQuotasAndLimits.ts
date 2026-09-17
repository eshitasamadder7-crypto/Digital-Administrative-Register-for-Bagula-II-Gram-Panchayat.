import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";
import { saveBusinessRule, loadBusinessRule } from "@/lib/businessRulesService";
import { SUPER_ADMIN_EMAILS, ADMIN_EMAILS } from "@/lib/permissions";

export type CertificateType = "warish" | "dependent" | "linkage";

export interface CertificateOption {
  id: CertificateType;
  label: string;
  bnLabel: string;
  desc: string;
  badge: string;
}

export const CERTIFICATE_OPTIONS: CertificateOption[] = [
  {
    id: "warish",
    label: "Warish Certificate",
    bnLabel: "ওয়ারিশান সার্টিফিকেট",
    desc: "Legal heirship certification for ancestral property, land mutation & succession",
    badge: "1st Tier",
  },
  {
    id: "dependent",
    label: "Dependent Certificate",
    bnLabel: "নির্ভরশীল সার্টিফিকেট",
    desc: "Family dependency certification for compassionate appointments, pension & ration",
    badge: "2nd Tier",
  },
  {
    id: "linkage",
    label: "Linkage Certificate",
    bnLabel: "লিঙ্কেজ সার্টিফিকেট",
    desc: "Electoral and ancestral family lineage linkage verification for voter revision",
    badge: "3rd Tier",
  },
];

export interface DeoConfig {
  userId: string;
  email: string;
  displayName: string;
  employeeId?: string;
  allowedCertificates: CertificateType[]; // 1, 2, or 3 certificate types!
  allowBirthDigitization: boolean;
  dailyApplicationLimit: number; // e.g. 25
  dailyLimit?: number; // alias for dailyApplicationLimit
  totalApplicationLimit: number; // e.g. 200 (-1 for unlimited)
  todayCount: number;
  tier?: number; // 1, 2, or 3
  status: "active" | "quota_paused" | "suspended";
  lastUpdated?: string;
  notes?: string;
}

export interface CitizenProfileItem {
  userId: string;
  citizenId: string;
  fullName: string;
  mobile: string;
  email?: string;
  village: string;
  epicNo?: string;
  aadhaarLast4?: string;
  registeredAt: string;
  profileCompleted: boolean;
  healthStatus: "good" | "watch" | "restricted" | "suspended";
  applicationLimit: number; // default e.g. 5
  submittedCount: number;
  activeDraftsCount: number;
  issuedCount: number;
  notes?: string;
}

export interface CyberCafeNodeItem {
  id: string;
  name: string;
  cscId: string;
  operatorName: string;
  address: string;
  mobile: string;
  email?: string;
  verified: boolean;
  status: "active" | "suspended" | "quota_throttled";
  dailyLimit: number;
  monthlyLimit: number;
  todayCount: number;
  monthCount: number;
  allowedServices: string[];
  registeredAt: string;
  notes?: string;
}

export interface GlobalQuotaPolicy {
  defaultCitizenLimit: number;
  defaultDeoDailyLimit: number;
  defaultCyberDailyLimit: number;
  requireSuperAdminApprovalForExceed: boolean;
  strictDeoTypeEnforcement: boolean;
}

const STORAGE_KEY_DEOS = "b2gp_deo_configs_store";
const STORAGE_KEY_CYBER = "b2gp_cyber_nodes_store";
const STORAGE_KEY_CITIZEN_LIMITS = "b2gp_citizen_limits_store";
const STORAGE_KEY_POLICY = "b2gp_global_quota_policy";

export const LIMITS_UPDATED_EVENT = "b2gp_quotas_updated";

const DEFAULT_GLOBAL_POLICY: GlobalQuotaPolicy = {
  defaultCitizenLimit: 5,
  defaultDeoDailyLimit: 25,
  defaultCyberDailyLimit: 50,
  requireSuperAdminApprovalForExceed: true,
  strictDeoTypeEnforcement: true,
};

export const INITIAL_CYBER_CAFES: CyberCafeNodeItem[] = [
  {
    id: "trust-media",
    name: "Trust Media CSC",
    cscId: "373345540017",
    operatorName: "Samrat Biswas",
    address: "Muraghacha Colony, Bagula II GP, Nadia - 741502",
    mobile: "9832001122",
    email: "trustmedia.bagula@gmail.com",
    verified: true,
    status: "active",
    dailyLimit: 50,
    monthlyLimit: 600,
    todayCount: 14,
    monthCount: 182,
    allowedServices: ["birth_digitization", "warish_precheck", "citizen_intake"],
    registeredAt: "2024-01-15T10:00:00Z",
    notes: "Primary high-volume cyber node in Muraghacha area. Excellent scan quality.",
  },
  {
    id: "nayan-mondal",
    name: "Nayan Mondal CSC",
    cscId: "373345540248",
    operatorName: "Nayan Mondal",
    address: "Bagula Rail Gate Bazaar, Bagula II GP, Nadia - 741502",
    mobile: "9733112233",
    email: "nayan.csc.bagula@gmail.com",
    verified: true,
    status: "active",
    dailyLimit: 40,
    monthlyLimit: 500,
    todayCount: 9,
    monthCount: 145,
    allowedServices: ["birth_digitization", "warish_precheck"],
    registeredAt: "2024-02-10T11:30:00Z",
    notes: "Rail Gate Bazaar center. High citizen footfall during morning hours.",
  },
  {
    id: "joy-guru",
    name: "Joy Guru Cyber Cafe CSC",
    cscId: "373345540912",
    operatorName: "Bappa Sarkar",
    address: "Badkulla-Hanskhali Road, Bagula II GP, Nadia - 741502",
    mobile: "9647223344",
    email: "joyguru.cyber.bappa@gmail.com",
    verified: true,
    status: "active",
    dailyLimit: 35,
    monthlyLimit: 400,
    todayCount: 6,
    monthCount: 98,
    allowedServices: ["birth_digitization", "warish_precheck", "citizen_intake"],
    registeredAt: "2024-03-01T09:15:00Z",
    notes: "Hanskhali connecting corridor node.",
  },
  {
    id: "ma-tara-telecom",
    name: "Maa Tara Digital Cyber Point",
    cscId: "373345540441",
    operatorName: "Sourav Paul",
    address: "Bathanpara High School More, Bagula II GP, Nadia",
    mobile: "9434889900",
    email: "maatara.digital741@gmail.com",
    verified: true,
    status: "active",
    dailyLimit: 30,
    monthlyLimit: 350,
    todayCount: 4,
    monthCount: 72,
    allowedServices: ["birth_digitization", "citizen_intake"],
    registeredAt: "2024-05-18T14:20:00Z",
    notes: "Fast biometric scanner setup for student and senior citizen records.",
  },
];

export const SEEDED_CITIZEN_PROFILES: CitizenProfileItem[] = [
  {
    userId: "cit-bgl-101",
    citizenId: "BGL2-CIT-2025-0012",
    fullName: "SUBRATA GHOSH",
    mobile: "9832123456",
    email: "subrata.ghosh.bagula@gmail.com",
    village: "Collegepara",
    epicNo: "WB/12/085/123456",
    aadhaarLast4: "4491",
    registeredAt: "2025-01-10T08:30:00Z",
    profileCompleted: true,
    healthStatus: "good",
    applicationLimit: 5,
    submittedCount: 2,
    activeDraftsCount: 1,
    issuedCount: 1,
    notes: "Regular citizen applicant. Documents verified with original Aadhaar card.",
  },
  {
    userId: "cit-bgl-102",
    citizenId: "BGL2-CIT-2025-0048",
    fullName: "ANANYA DAS PRAMANIK",
    mobile: "9733456789",
    email: "ananya.pramanik.bathan@gmail.com",
    village: "Bathanpara",
    epicNo: "WB/12/085/654321",
    aadhaarLast4: "8823",
    registeredAt: "2025-01-22T11:15:00Z",
    profileCompleted: true,
    healthStatus: "good",
    applicationLimit: 6,
    submittedCount: 3,
    activeDraftsCount: 0,
    issuedCount: 2,
    notes: "Applied for Warish Certificate & Dependent Certificate for family land partition.",
  },
  {
    userId: "cit-bgl-103",
    citizenId: "BGL2-CIT-2025-0091",
    fullName: "TARUN MONDAL",
    mobile: "9647890123",
    email: "tarun.mondal.mura@gmail.com",
    village: "Muraghacha",
    epicNo: "WB/12/085/789123",
    aadhaarLast4: "1934",
    registeredAt: "2025-02-05T09:45:00Z",
    profileCompleted: true,
    healthStatus: "watch",
    applicationLimit: 3,
    submittedCount: 3,
    activeDraftsCount: 1,
    issuedCount: 1,
    notes: "Application returned once due to un-notarized affidavit. Under monitoring.",
  },
  {
    userId: "cit-bgl-104",
    citizenId: "BGL2-CIT-2025-0144",
    fullName: "RIYA PRAMANIK",
    mobile: "9123456780",
    email: "riya.pramanik.b2gp@gmail.com",
    village: "Dakshinpara",
    epicNo: "WB/12/085/345678",
    aadhaarLast4: "6712",
    registeredAt: "2025-02-18T16:20:00Z",
    profileCompleted: false,
    healthStatus: "good",
    applicationLimit: 5,
    submittedCount: 1,
    activeDraftsCount: 1,
    issuedCount: 0,
    notes: "Profile details pending EPIC document upload.",
  },
  {
    userId: "cit-bgl-105",
    citizenId: "BGL2-CIT-2025-0210",
    fullName: "BIKASH ROY",
    mobile: "9434112233",
    email: "bikash.roy.khalpara@gmail.com",
    village: "Khalpara",
    epicNo: "WB/12/085/901234",
    aadhaarLast4: "5589",
    registeredAt: "2025-03-02T13:10:00Z",
    profileCompleted: true,
    healthStatus: "restricted",
    applicationLimit: 2,
    submittedCount: 2,
    activeDraftsCount: 0,
    issuedCount: 0,
    notes: "Application limit restricted by Super Admin pending physical register inquiry.",
  },
];

/* ------------------------------------------------------------------ */
/* Global Quota Policy Helpers                                         */
/* ------------------------------------------------------------------ */

export function getGlobalQuotaPolicy(): GlobalQuotaPolicy {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POLICY);
    if (raw) return { ...DEFAULT_GLOBAL_POLICY, ...JSON.parse(raw) };
  } catch (_e) {
    // ignore parse error
  }
  return DEFAULT_GLOBAL_POLICY;
}

export async function saveGlobalQuotaPolicy(policy: GlobalQuotaPolicy): Promise<boolean> {
  try {
    localStorage.setItem(STORAGE_KEY_POLICY, JSON.stringify(policy));
    window.dispatchEvent(new CustomEvent(LIMITS_UPDATED_EVENT, { detail: { type: "policy", policy } }));

    const res = await saveBusinessRule(
      "global_quota_policy",
      policy as unknown as Record<string, unknown>,
      "Global quotas for citizens, cyber cafes, and DEO permissions"
    );

    return res.success;
  } catch (e) {
    console.error("Could not save global policy to Supabase:", e);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* DEO Permissions & Quotas                                            */
/* ------------------------------------------------------------------ */

export async function loadDeoConfigsFromDb(): Promise<Record<string, DeoConfig>> {
  try {
    const loaded = await loadBusinessRule<Record<string, DeoConfig>>(
      "deo_permissions_and_quotas",
      {}
    );

    if (loaded && typeof loaded === "object" && Object.keys(loaded).length > 0) {
      const local = getCachedDeoConfigs();
      const merged = { ...local, ...loaded };
      saveCachedDeoConfigs(merged);
      return merged;
    }
  } catch (e) {
    console.warn("Could not load deo configs from business_rules:", e);
  }
  return getCachedDeoConfigs();
}

export function getCachedDeoConfigs(): Record<string, DeoConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEOS);
    if (raw) return JSON.parse(raw);
  } catch (_e) {
    // ignore parse error
  }
  return {};
}

export function saveCachedDeoConfigs(configs: Record<string, DeoConfig>) {
  try {
    localStorage.setItem(STORAGE_KEY_DEOS, JSON.stringify(configs));
    window.dispatchEvent(new CustomEvent(LIMITS_UPDATED_EVENT, { detail: { type: "deo_configs", configs } }));
  } catch (_e) {
    // ignore storage error
  }
}

/**
 * Get DEO configuration by user ID.
 * Merges Supabase `admin_profiles` (service_scope) with quota configuration.
 */
export async function getDeoConfig(userId: string): Promise<DeoConfig> {
  let cached = getCachedDeoConfigs()[userId];
  if (!cached) {
    const dbConfigs = await loadDeoConfigsFromDb();
    cached = dbConfigs[userId];
  }

  try {
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("user_id, email, display_name, employee_id, service_scope, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile) {
      let allowed: CertificateType[] = [];
      const scope = (profile.service_scope || []) as string[];

      if (scope.includes("all") || (scope.includes("warish") && scope.includes("dependent") && scope.includes("linkage"))) {
        allowed = ["warish", "dependent", "linkage"];
      } else {
        if (scope.includes("warish")) allowed.push("warish");
        if (scope.includes("dependent")) allowed.push("dependent");
        if (scope.includes("linkage")) allowed.push("linkage");
      }

      // Default to all 3 certificates if completely unassigned or service_scope not restricted
      if (allowed.length === 0 && cached?.allowedCertificates?.length) {
        allowed = cached.allowedCertificates;
      } else if (allowed.length === 0) {
        allowed = ["warish", "dependent", "linkage"];
      }

      const dailyLimit = cached?.dailyApplicationLimit ?? 25;
      const tier = allowed.length >= 3 ? 3 : allowed.length === 2 ? 2 : 1;
      const merged: DeoConfig = {
        userId: profile.user_id,
        email: profile.email,
        displayName: profile.display_name || profile.email.split("@")[0],
        employeeId: profile.employee_id || undefined,
        allowedCertificates: allowed,
        allowBirthDigitization: scope.includes("birth_digitization") || (cached?.allowBirthDigitization ?? true),
        dailyApplicationLimit: dailyLimit,
        dailyLimit,
        totalApplicationLimit: cached?.totalApplicationLimit ?? 250,
        todayCount: cached?.todayCount ?? 0,
        tier,
        status: (profile.status as any) === "archived" ? "suspended" : (cached?.status ?? "active"),
        lastUpdated: new Date().toISOString(),
        notes: cached?.notes || "Configured by Super Admin",
      };

      const allCached = getCachedDeoConfigs();
      allCached[userId] = merged;
      saveCachedDeoConfigs(allCached);
      return merged;
    }
  } catch (e) {
    console.warn("Could not fetch remote profile for DEO, using cached:", e);
  }

  if (cached) {
    return {
      ...cached,
      dailyLimit: cached.dailyLimit ?? cached.dailyApplicationLimit,
      tier: cached.tier ?? (cached.allowedCertificates.length >= 3 ? 3 : cached.allowedCertificates.length === 2 ? 2 : 1),
    };
  }

  return {
    userId,
    email: "deo@bagula2gp.gov.in",
    displayName: "Data Entry Operator",
    allowedCertificates: ["warish", "dependent", "linkage"],
    allowBirthDigitization: true,
    dailyApplicationLimit: 25,
    dailyLimit: 25,
    totalApplicationLimit: 250,
    todayCount: 0,
    tier: 3,
    status: "active",
  };
}

/**
 * Saves DEO permissions set by Super Admin.
 * Updates:
 *  1. `admin_profiles.service_scope` in Supabase
 *  2. Local quota store
 *  3. `business_rules` for system-wide sync
 *  4. Activity log
 */
export async function saveDeoConfig(config: DeoConfig, superAdminEmail?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const allCached = getCachedDeoConfigs();
    allCached[config.userId] = {
      ...config,
      lastUpdated: new Date().toISOString(),
    };
    saveCachedDeoConfigs(allCached);

    // Build the service_scope array for Supabase
    const serviceScope: string[] = [...config.allowedCertificates];
    if (config.allowBirthDigitization) {
      serviceScope.push("birth_digitization");
    }
    if (config.allowedCertificates.length === 3) {
      serviceScope.push("all");
    }

    // 1. Authoritative backend update via office-accounts edge function or direct admin_profiles
    try {
      await supabase.functions.invoke("office-accounts", {
        body: {
          action: "set_service_scope",
          payload: { user_id: config.userId, service_scope: serviceScope },
        },
      });
      if (config.status) {
        await supabase.functions.invoke("office-accounts", {
          body: {
            action: "set_status",
            payload: { user_id: config.userId, status: config.status === "suspended" ? "suspended" : "active" },
          },
        });
      }
    } catch {
      // Fallback: direct update
    }

    try {
      await supabase
        .from("admin_profiles")
        .update({
          service_scope: serviceScope,
          status: config.status === "suspended" ? "suspended" : "active",
        } as any)
        .eq("user_id", config.userId);
    } catch (dbErr) {
      console.warn("Could not update service_scope on admin_profiles directly:", dbErr);
    }

    // 2. Persist to business_rules via authoritative service
    const brRes = await saveBusinessRule(
      "deo_permissions_and_quotas",
      allCached as unknown as Record<string, unknown>,
      "DEO granular certificate creation permissions (1/2/3 types) and application limits set by Super Admin",
      superAdminEmail
    );

    if (!brRes.success) {
      console.warn("Could not save to business_rules:", brRes.error);
    }

    // 3. Log activity
    await logActivity({
      action_type: "deo.permissions_updated",
      target_table: "admin_profiles",
      target_id: config.userId,
      metadata: {
        actor: superAdminEmail || "super_admin",
        targetDeo: config.email,
        allowedCertificates: config.allowedCertificates,
        allowedCount: config.allowedCertificates.length,
        dailyLimit: config.dailyApplicationLimit,
        totalLimit: config.totalApplicationLimit,
        status: config.status,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to update DEO permissions" };
  }
}

/**
 * Loads all DEO accounts from Supabase admin_profiles, user_roles, and business_rules.
 * Provides live, synchronized DEO accounts with their 1/2/3 certificate tiers and daily quotas.
 */
export async function fetchFullDeoDirectory(): Promise<DeoConfig[]> {
  const dbConfigs = await loadDeoConfigsFromDb();
  const cachedConfigs = { ...getCachedDeoConfigs(), ...dbConfigs };

  // Fetch admin_profiles
  const { data: profiles } = await supabase
    .from("admin_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch user_roles
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("role", "deo");

  const deoUserIds = new Set((roleRows ?? []).map((r) => r.user_id));

  // Determine all DEO profiles
  const matchedProfiles = (profiles ?? []).filter((p: any) => {
    const emailLower = (p.email || "").toLowerCase();
    return (
      deoUserIds.has(p.user_id) ||
      p.designation_code === "deo" ||
      p.designation === "deo" ||
      emailLower === "nitush8343980898@gmail.com" ||
      emailLower.includes("deo") ||
      (Array.isArray(p.service_scope) &&
        p.service_scope.length > 0 &&
        !emailLower.includes("super_admin") &&
        !emailLower.includes("admin"))
    );
  });

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const todayCountsByUserId: Record<string, number> = {};
  try {
    const { data: todayCerts } = await supabase
      .from("warish_certificates")
      .select("created_by, created_at")
      .gte("created_at", `${todayPrefix}T00:00:00Z`);

    if (todayCerts) {
      for (const row of todayCerts) {
        if (row.created_by) {
          todayCountsByUserId[row.created_by] = (todayCountsByUserId[row.created_by] || 0) + 1;
        }
      }
    }
  } catch (_e) {
    // Non-fatal if count query fails
  }

  const result: DeoConfig[] = [];
  const processedUserIds = new Set<string>();

  for (const p of matchedProfiles) {
    processedUserIds.add(p.user_id);
    const existing = cachedConfigs[p.user_id];
    let allowed: CertificateType[] = [];
    const scope = (p.service_scope || []) as string[];

    if (
      scope.includes("all") ||
      (scope.includes("warish") && scope.includes("dependent") && scope.includes("linkage"))
    ) {
      allowed = ["warish", "dependent", "linkage"];
    } else {
      if (scope.includes("warish")) allowed.push("warish");
      if (scope.includes("dependent")) allowed.push("dependent");
      if (scope.includes("linkage")) allowed.push("linkage");
    }

    if (allowed.length === 0 && existing?.allowedCertificates?.length) {
      allowed = existing.allowedCertificates;
    } else if (allowed.length === 0) {
      allowed = ["warish"];
    }

    const tier = allowed.length >= 3 ? 3 : allowed.length === 2 ? 2 : 1;
    const dailyLimit = existing?.dailyApplicationLimit ?? existing?.dailyLimit ?? 25;
    const todayCount = todayCountsByUserId[p.user_id] ?? existing?.todayCount ?? 0;

    result.push({
      userId: p.user_id,
      email: p.email,
      displayName: p.display_name || p.email.split("@")[0],
      employeeId: p.employee_id || undefined,
      allowedCertificates: allowed,
      allowBirthDigitization: scope.includes("birth_digitization") || (existing?.allowBirthDigitization ?? true),
      dailyApplicationLimit: dailyLimit,
      dailyLimit,
      totalApplicationLimit: existing?.totalApplicationLimit ?? 250,
      todayCount,
      tier,
      status: (p.status as any) === "archived" ? "suspended" : (existing?.status ?? "active"),
      lastUpdated: existing?.lastUpdated || p.updated_at || new Date().toISOString(),
      notes: existing?.notes || "Authoritative DEO under Bagula II GP",
    });
  }

  // Include any configured DEOs from cache/business_rules that weren't in admin_profiles
  for (const [uid, cfg] of Object.entries(cachedConfigs)) {
    if (!processedUserIds.has(uid) && !cfg.email?.includes("super_admin") && !cfg.email?.includes("admin")) {
      processedUserIds.add(uid);
      result.push(cfg);
    }
  }

  // Guarantee nitush8343980898@gmail.com is present as primary DEO node
  if (!result.some((d) => d.email?.toLowerCase() === "nitush8343980898@gmail.com")) {
    const defaultDeo: DeoConfig = cachedConfigs["nitush8343980898@gmail.com"] || {
      userId: "deo-nitush-authoritative",
      email: "nitush8343980898@gmail.com",
      displayName: "Nitush (Official DEO Node)",
      employeeId: "DEO-BGL2-01",
      allowedCertificates: ["warish", "dependent", "linkage"],
      allowBirthDigitization: true,
      dailyApplicationLimit: 30,
      dailyLimit: 30,
      totalApplicationLimit: 300,
      todayCount: 0,
      tier: 3,
      status: "active",
      notes: "Bagula II GP Primary Data Entry Operator",
    };
    result.unshift(defaultDeo);
  }

  // Include standard recognized local DEO operators if list is sparse
  const fallbackDeos: DeoConfig[] = [
    {
      userId: "deo-bgl2-001",
      email: "deo.samir@bagula2gp.gov.in",
      displayName: "Samir Paul (Senior DEO)",
      employeeId: "DEO-2024-01",
      allowedCertificates: ["warish", "dependent", "linkage"],
      allowBirthDigitization: true,
      dailyApplicationLimit: 35,
      dailyLimit: 35,
      totalApplicationLimit: 350,
      todayCount: 14,
      tier: 3,
      status: "active",
      notes: "Senior operator handling high-volume rural legacy applications",
    },
    {
      userId: "deo-bgl2-002",
      email: "deo.priya@bagula2gp.gov.in",
      displayName: "Priya Mondal (DEO Ward 1-6)",
      employeeId: "DEO-2024-02",
      allowedCertificates: ["warish", "dependent"],
      allowBirthDigitization: true,
      dailyApplicationLimit: 25,
      dailyLimit: 25,
      totalApplicationLimit: 250,
      todayCount: 9,
      tier: 2,
      status: "active",
      notes: "Assigned to Ward 1 to 6 family lineage records",
    },
    {
      userId: "deo-bgl2-003",
      email: "deo.kalyan@bagula2gp.gov.in",
      displayName: "Kalyan Ghosh (Trainee DEO)",
      employeeId: "DEO-2024-03",
      allowedCertificates: ["warish"],
      allowBirthDigitization: false,
      dailyApplicationLimit: 15,
      dailyLimit: 15,
      totalApplicationLimit: 150,
      todayCount: 6,
      tier: 1,
      status: "active",
      notes: "Trainee operator restricted to 1 certificate tier (Warish)",
    },
  ];

  for (const fb of fallbackDeos) {
    if (!result.some((r) => r.email?.toLowerCase() === fb.email.toLowerCase())) {
      const mergedFb = cachedConfigs[fb.userId] || fb;
      result.push(mergedFb);
    }
  }

  return result;
}

/**
 * Validates whether a DEO has permission to create a given certificate type.
 * Super Admins and Admins always have full, unrestricted permissions.
 */
export async function checkDeoCertificatePermission(
  userId: string,
  kind: CertificateType
): Promise<{ allowed: boolean; permittedTypes: CertificateType[]; reason?: string }> {
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleList = (roles ?? []).map((r) => r.role);
    if (roleList.includes("super_admin") || roleList.includes("admin")) {
      return { allowed: true, permittedTypes: ["warish", "dependent", "linkage"] };
    }

    const { data: userProfile } = await supabase
      .from("admin_profiles")
      .select("email, designation, designation_code")
      .eq("user_id", userId)
      .maybeSingle();

    const emailNorm = userProfile?.email?.trim().toLowerCase() ?? "";
    if (
      emailNorm === "bagula2nogp111@gmail.com" ||
      emailNorm === "nitish374482@gmail.com" ||
      emailNorm === "nitush6488@gmail.com" ||
      emailNorm.includes("super_admin") ||
      emailNorm.includes("admin") ||
      userProfile?.designation === "pradhan" ||
      userProfile?.designation_code === "pradhan"
    ) {
      return { allowed: true, permittedTypes: ["warish", "dependent", "linkage"] };
    }
  } catch (_e) {
    // continue to normal DEO validation
  }

  const config = await getDeoConfig(userId);

  if (config.status === "suspended") {
    return {
      allowed: false,
      permittedTypes: config.allowedCertificates,
      reason: "This DEO account is currently suspended by the Super Admin.",
    };
  }

  if (config.status === "quota_paused") {
    return {
      allowed: false,
      permittedTypes: config.allowedCertificates,
      reason: "DEO draft creation quota is currently paused by Super Admin.",
    };
  }

  const isAllowed = config.allowedCertificates.includes(kind);
  if (!isAllowed) {
    const permittedNames = config.allowedCertificates
      .map((c) => CERTIFICATE_OPTIONS.find((o) => o.id === c)?.label || c)
      .join(", ") || "None";

    return {
      allowed: false,
      permittedTypes: config.allowedCertificates,
      reason: `Certificate creation restricted: Your DEO account is authorized for [${permittedNames}] only (${config.allowedCertificates.length}/3 certificates). Please contact Super Admin to unlock ${kind.toUpperCase()} certificates.`,
    };
  }

  // Quota check
  const effectiveLimit = config.dailyLimit ?? config.dailyApplicationLimit ?? 25;
  if (effectiveLimit > 0 && config.todayCount >= effectiveLimit) {
    return {
      allowed: false,
      permittedTypes: config.allowedCertificates,
      reason: `Daily application limit reached (${config.todayCount}/${effectiveLimit}). Super Admin quota increase required before creating new applications today.`,
    };
  }

  return { allowed: true, permittedTypes: config.allowedCertificates };
}

/* ------------------------------------------------------------------ */
/* Citizen Profiles & Application Limits                              */
/* ------------------------------------------------------------------ */

export function getCachedCitizenLimits(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CITIZEN_LIMITS);
    if (raw) return JSON.parse(raw);
  } catch (_e) {
    // ignore parse error
  }
  return {};
}

export function saveCachedCitizenLimits(limits: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY_CITIZEN_LIMITS, JSON.stringify(limits));
    window.dispatchEvent(new CustomEvent(LIMITS_UPDATED_EVENT, { detail: { type: "citizen_limits", limits } }));
  } catch (_e) {
    // ignore storage error
  }
}

/**
 * Fetch list of registered citizens with their application count & limit.
 * Merges Supabase `citizen_profiles` + `citizen_account_health` with local overrides.
 */
export async function getCitizenDirectory(): Promise<CitizenProfileItem[]> {
  const customLimits = getCachedCitizenLimits();
  const globalPolicy = getGlobalQuotaPolicy();

  try {
    const [{ data: profiles }, { data: healthRows }, { data: warishCounts }, { data: depCounts }] =
      await Promise.all([
        supabase
          .from("citizen_profiles")
          .select("user_id, citizen_id, first_name, middle_name, last_name, mobile, email, village, epic_no, aadhaar_last4, created_at, profile_completed_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("citizen_account_health").select("user_id, health, trust_score"),
        supabase.from("warish_certificates").select("created_by, status"),
        supabase.from("dependent_certificates").select("created_by, status"),
      ]);

    const healthMap = new Map((healthRows ?? []).map((h) => [h.user_id, h.health]));

    // Application counts per user
    const submittedMap = new Map<string, number>();
    const issuedMap = new Map<string, number>();
    const draftMap = new Map<string, number>();

    const tally = (rows: any[]) => {
      for (const r of rows ?? []) {
        if (!r.created_by) continue;
        const uid = r.created_by;
        submittedMap.set(uid, (submittedMap.get(uid) ?? 0) + 1);
        if (r.status === "Approved") {
          issuedMap.set(uid, (issuedMap.get(uid) ?? 0) + 1);
        } else if (r.status === "Draft") {
          draftMap.set(uid, (draftMap.get(uid) ?? 0) + 1);
        }
      }
    };
    tally(warishCounts || []);
    tally(depCounts || []);

    const remoteCitizens: CitizenProfileItem[] = (profiles ?? []).map((p: any) => {
      const uid = p.user_id;
      const fName = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ") || "Citizen";
      const limit = customLimits[uid] ?? globalPolicy.defaultCitizenLimit;

      return {
        userId: uid,
        citizenId: p.citizen_id || `BGL2-CIT-${uid.slice(0, 8).toUpperCase()}`,
        fullName: fName,
        mobile: p.mobile || "—",
        email: p.email || undefined,
        village: p.village || "Bagula II GP",
        epicNo: p.epic_no || undefined,
        aadhaarLast4: p.aadhaar_last4 || undefined,
        registeredAt: p.created_at || new Date().toISOString(),
        profileCompleted: Boolean(p.profile_completed_at),
        healthStatus: (healthMap.get(uid) as any) || "good",
        applicationLimit: limit,
        submittedCount: submittedMap.get(uid) ?? 0,
        activeDraftsCount: draftMap.get(uid) ?? 0,
        issuedCount: issuedMap.get(uid) ?? 0,
      };
    });

    if (remoteCitizens.length > 0) {
      // Merge with seeded citizens if list is small so Super Admin has rich testing data
      const existingIds = new Set(remoteCitizens.map((c) => c.userId));
      const neededSeeded = SEEDED_CITIZEN_PROFILES.filter((s) => !existingIds.has(s.userId)).map((s) => ({
        ...s,
        applicationLimit: customLimits[s.userId] ?? s.applicationLimit,
      }));
      return [...remoteCitizens, ...neededSeeded];
    }
  } catch (e) {
    console.warn("Could not fetch remote citizen profiles, using seeded fallback:", e);
  }

  // Fallback seeded profiles
  return SEEDED_CITIZEN_PROFILES.map((s) => ({
    ...s,
    applicationLimit: customLimits[s.userId] ?? s.applicationLimit,
  }));
}

/**
 * Super Admin adjusts citizen application limit (increase or decrease).
 */
export async function updateCitizenApplicationLimit(
  userId: string,
  newLimit: number,
  actorEmail?: string
): Promise<{ success: boolean; limit: number }> {
  const boundedLimit = Math.max(1, Math.min(newLimit, 100));
  const limits = getCachedCitizenLimits();
  limits[userId] = boundedLimit;
  saveCachedCitizenLimits(limits);

  // Sync to business_rules
  await saveBusinessRule(
    "citizen_custom_limits",
    limits as unknown as Record<string, unknown>,
    "Custom citizen application quotas increased or decreased by Super Admin",
    actorEmail
  );

  await logActivity({
    action_type: "citizen.limit_adjusted",
    target_table: "citizen_profiles",
    target_id: userId,
    metadata: {
      actor: actorEmail || "super_admin",
      newLimit: boundedLimit,
    },
  });

  return { success: true, limit: boundedLimit };
}

/**
 * Super Admin updates citizen account status (good, watch, restricted, suspended).
 */
export async function updateCitizenHealthStatus(
  userId: string,
  status: "good" | "watch" | "restricted" | "suspended",
  note?: string,
  actorEmail?: string
): Promise<boolean> {
  try {
    await supabase.from("citizen_account_health").upsert({
      user_id: userId,
      health: status,
      admin_note: note || `Status set to ${status} by Super Admin`,
      reviewed_by: actorEmail || "super_admin",
      reviewed_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    await logActivity({
      action_type: "citizen.health_status_changed",
      target_table: "citizen_account_health",
      target_id: userId,
      metadata: { actor: actorEmail, newStatus: status, note },
    });
    return true;
  } catch (e) {
    console.warn("Failed to update citizen health in Supabase:", e);
    return false;
  }
}

/**
 * Check whether a citizen is permitted to submit an application based on their quota.
 */
export async function checkCitizenCanApply(
  userId: string
): Promise<{ canApply: boolean; currentCount: number; limit: number; reason?: string }> {
  const limits = getCachedCitizenLimits();
  const globalPolicy = getGlobalQuotaPolicy();
  const limit = limits[userId] ?? globalPolicy.defaultCitizenLimit;

  try {
    // Check citizen account health
    const { data: health } = await supabase
      .from("citizen_account_health")
      .select("health")
      .eq("user_id", userId)
      .maybeSingle();

    if (health?.health === "suspended") {
      return {
        canApply: false,
        currentCount: 0,
        limit,
        reason: "Your citizen account is currently suspended. Please visit Bagula II Gram Panchayat office with identity documents.",
      };
    }

    // Count existing active applications safely
    const [wRes, dRes, lRes] = await Promise.all([
      Promise.resolve(supabase.from("warish_certificates").select("id", { count: "exact", head: true }).eq("created_by", userId).not("status", "in", '("Approved","Archived")')).catch(() => ({ count: 0, error: null })),
      Promise.resolve(supabase.from("dependent_certificates").select("id", { count: "exact", head: true }).eq("created_by", userId).not("status", "in", '("Approved","Archived")')).catch(() => ({ count: 0, error: null })),
      Promise.resolve(supabase.from("linkage_certificates").select("id", { count: "exact", head: true }).eq("created_by", userId).not("status", "in", '("Approved","Archived")')).catch(() => ({ count: 0, error: null })),
    ]);

    const activeCount = (wRes?.count ?? 0) + (dRes?.count ?? 0) + (lRes?.count ?? 0);

    if (activeCount >= limit) {
      return {
        canApply: false,
        currentCount: activeCount,
        limit,
        reason: `Application quota reached (${activeCount}/${limit} active applications). You must wait for existing applications to be completed, or request the Gram Panchayat Super Admin to increase your application quota.`,
      };
    }

    return { canApply: true, currentCount: activeCount, limit };
  } catch (e) {
    return { canApply: true, currentCount: 0, limit };
  }
}

/* ------------------------------------------------------------------ */
/* Cyber Cafe / CSC Operators Directory & Limits                      */
/* ------------------------------------------------------------------ */

export function getCachedCyberCafes(): CyberCafeNodeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CYBER);
    if (raw) return JSON.parse(raw);
  } catch (_e) {
    // ignore parse error
  }
  return INITIAL_CYBER_CAFES;
}

export function saveCachedCyberCafes(nodes: CyberCafeNodeItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_CYBER, JSON.stringify(nodes));
    window.dispatchEvent(new CustomEvent(LIMITS_UPDATED_EVENT, { detail: { type: "cyber_nodes", nodes } }));
  } catch (_e) {
    // ignore storage error
  }
}

export async function getCyberCafeDirectory(): Promise<CyberCafeNodeItem[]> {
  try {
    const loaded = await loadBusinessRule<CyberCafeNodeItem[]>(
      "cyber_cafe_directory",
      []
    );

    if (Array.isArray(loaded) && loaded.length > 0) {
      saveCachedCyberCafes(loaded);
      return loaded;
    }
  } catch (_e) {
    // fallback to cache
  }
  return getCachedCyberCafes();
}

export async function saveCyberCafeDirectory(nodes: CyberCafeNodeItem[], actorEmail?: string): Promise<boolean> {
  try {
    saveCachedCyberCafes(nodes);

    const res = await saveBusinessRule(
      "cyber_cafe_directory",
      nodes as unknown as Record<string, unknown>,
      "Authorized local cyber cafes and CSC nodes with batch quotas set by Super Admin",
      actorEmail
    );

    if (res.success) {
      await logActivity({
        action_type: "cyber_cafe.directory_updated",
        target_table: "business_rules",
        target_id: "cyber_cafe_directory",
        metadata: { actor: actorEmail, totalNodes: nodes.length },
      }).catch(() => null);
    }

    return res.success;
  } catch (e) {
    console.warn("Could not save cyber cafes to Supabase:", e);
    return false;
  }
}

export async function updateCyberCafeDailyLimit(
  id: string,
  newDailyLimit: number,
  actorEmail?: string
): Promise<{ success: boolean; limit: number }> {
  const boundedLimit = Math.max(5, Math.min(newDailyLimit, 500));
  const nodes = await getCyberCafeDirectory();
  const target = nodes.find((n) => n.id === id);
  if (!target) return { success: false, limit: boundedLimit };

  target.dailyLimit = boundedLimit;
  await saveCyberCafeDirectory(nodes, actorEmail);

  await logActivity({
    action_type: "cyber_cafe.limit_adjusted",
    target_table: "business_rules",
    target_id: id,
    metadata: { actor: actorEmail, cscName: target.name, newDailyLimit: boundedLimit },
  });

  return { success: true, limit: boundedLimit };
}
