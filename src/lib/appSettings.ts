import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";
import {
  saveBusinessRule,
  loadBusinessRule,
  loadMultipleBusinessRules,
} from "@/lib/businessRulesService";

/* ------------------------------------------------------------------ */
/* Types & Interfaces                                                  */
/* ------------------------------------------------------------------ */

export interface ApplicationWorkflowRules {
  warishMemoPrefix: string; // e.g. "/BGL-II/{YEAR}" or "/BGL-II/"
  dependentMemoPrefix: string; // e.g. "/BGL-II/{YEAR}"
  birthDigitizationPrefix: string; // e.g. "B2GP/BD/{YEAR}/"
  warishValidityMonths: number; // 0 = Lifetime, >0 = validity duration in months
  dependentValidityMonths: number; // default 6
  minHeirs: number; // minimum heirs required, default 1
  maxHeirs: number; // maximum heirs allowed, default 30
  requireDeathCertForWarish: boolean; // default true
  requireAffidavitForWarish: boolean; // default false (affidavit or local inquiry)
  requireWardMemberEndorsement: boolean; // default true
  warishIntakeActive: boolean; // default true
  dependentIntakeActive: boolean; // default true
  maxPendingPerMobile: number; // default 3
  warishFeeRupees: number; // default 0 (free for citizens or nominal)
  dependentFeeRupees: number; // default 0
  urgentProcessingFeeRupees: number; // default 100
  reprintSearchFeeRupees: number; // default 20
  workingHoursDesc: string; // default "Mon–Fri, 10:00 AM – 5:00 PM"
}

export interface ApplicationValidationRules {
  maxGeneralDocSizeKb: number; // default 2048 (2 MB)
  maxPhotoIdSizeKb: number; // default 100 KB
  maxBirthCertScanSizeKb: number; // default 100 KB
  maxPoliceGdSizeKb: number; // default 200 KB
  allowedExtensions: string[]; // default [".pdf", ".jpg", ".jpeg", ".png"]
  mobileRegex: string; // default "^[6-9]\\d{9}$"
  minApplicantAge: number; // default 18
  strictVillageOnly: boolean; // default false
  requireAadhaar: boolean; // default false (optional by default)
  forceUppercaseNames: boolean; // default true
  requireTaxReceipt: boolean; // default false
}

export interface AdministrativeAuthoritySettings {
  gramPanchayatName: string; // default "Bagula 2 No. Gram Panchayat"
  pradhanName: string; // default "SUSMITA BISWAS BARMAN"
  executiveAssistantName: string; // default "Executive Assistant, Bagula-II GP"
  secretaryName: string; // default "Secretary, Bagula-II GP"
  blockName: string; // default "Hanskhali"
  districtName: string; // default "Nadia"
  policeStationName: string; // default "Hanskhali P.S."
  pinCode: string; // default "741502"
  stateName: string; // default "West Bengal"
  helplinePhone: string; // default "+91 3473 272 202"
  contactEmail: string; // default "bagula2nogp111@gmail.com"
  emergencyNoticeEnabled: boolean; // default false
  emergencyNoticeTextEn: string;
  emergencyNoticeTextBn: string;
  officialStampWatermark: boolean; // default true
  digitalSignaturesEnabled: boolean; // default true
}

export type PartyTheme = "default" | "bjp" | "tmc" | "cpim" | "congress";

export interface SuperAdminConfigurableControls {
  partyTheme: PartyTheme; // "default" | "bjp" (saffron) | "tmc" (green) | "cpim" (red) | "congress" (blue)
  formSizeLayout: "standard" | "compact" | "spacious";
  showPhoneNumbersOnCertificates: boolean;
  showMobileInVerification: boolean;
  enableAadhaarField: boolean;
  enableEpicField: boolean;
  enableGuardianField: boolean;
  enableCustomAddressField: boolean;
  requireDeathCertForWarish: boolean;
  requireElectoralRollLinkage: boolean;
}

export const DEFAULT_SUPER_ADMIN_CONTROLS: SuperAdminConfigurableControls = {
  partyTheme: "default",
  formSizeLayout: "standard",
  showPhoneNumbersOnCertificates: true,
  showMobileInVerification: false,
  enableAadhaarField: true,
  enableEpicField: true,
  enableGuardianField: true,
  enableCustomAddressField: true,
  requireDeathCertForWarish: true,
  requireElectoralRollLinkage: true,
};

/* ------------------------------------------------------------------ */
/* Default Configurations                                             */
/* ------------------------------------------------------------------ */

export const DEFAULT_WORKFLOW_RULES: ApplicationWorkflowRules = {
  warishMemoPrefix: "/BGL-II/{YEAR}",
  dependentMemoPrefix: "/BGL-II/{YEAR}",
  birthDigitizationPrefix: "B2GP/BD/{YEAR}/",
  warishValidityMonths: 0, // Lifetime
  dependentValidityMonths: 6,
  minHeirs: 1,
  maxHeirs: 30,
  requireDeathCertForWarish: true,
  requireAffidavitForWarish: false,
  requireWardMemberEndorsement: true,
  warishIntakeActive: true,
  dependentIntakeActive: true,
  maxPendingPerMobile: 3,
  warishFeeRupees: 0,
  dependentFeeRupees: 0,
  urgentProcessingFeeRupees: 100,
  reprintSearchFeeRupees: 20,
  workingHoursDesc: "Mon–Fri, 10:00 AM – 5:00 PM",
};

export const DEFAULT_VALIDATION_RULES: ApplicationValidationRules = {
  maxGeneralDocSizeKb: 2048,
  maxPhotoIdSizeKb: 100,
  maxBirthCertScanSizeKb: 100,
  maxPoliceGdSizeKb: 200,
  allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
  mobileRegex: "^[6-9]\\d{9}$",
  minApplicantAge: 18,
  strictVillageOnly: false,
  requireAadhaar: false,
  forceUppercaseNames: true,
  requireTaxReceipt: false,
};

export const DEFAULT_AUTHORITY_SETTINGS: AdministrativeAuthoritySettings = {
  gramPanchayatName: "Bagula 2 No. Gram Panchayat",
  pradhanName: "SUSMITA BISWAS BARMAN",
  executiveAssistantName: "Executive Assistant, Bagula-II GP",
  secretaryName: "Secretary, Bagula-II GP",
  blockName: "Hanskhali",
  districtName: "Nadia",
  policeStationName: "Hanskhali P.S.",
  pinCode: "741502",
  stateName: "West Bengal",
  helplinePhone: "+91 3473 272 202",
  contactEmail: "bagula2nogp111@gmail.com",
  emergencyNoticeEnabled: false,
  emergencyNoticeTextEn: "Public Notice: Due to server maintenance, physical counter verification will resume on next working day at Bagula II GP Office.",
  emergencyNoticeTextBn: "জরুরি বিজ্ঞপ্তি: সার্ভার রক্ষণাবেক্ষণের জন্য পঞ্চায়েত অফিসের ভেরিফিকেশন পরবর্তী কাজের দিনে স্বাভাবিক নিয়মে চলবে।",
  officialStampWatermark: true,
  digitalSignaturesEnabled: true,
};

/* ------------------------------------------------------------------ */
/* Storage Keys & Event Names                                         */
/* ------------------------------------------------------------------ */

const STORAGE_KEY_WORKFLOW = "bagula2_app_workflow_rules";
const STORAGE_KEY_VALIDATION = "bagula2_app_validation_rules";
const STORAGE_KEY_AUTHORITY = "bagula2_administrative_authority";
const STORAGE_KEY_SUPER_CONTROLS = "bagula2_super_admin_controls";

const DB_KEY_WORKFLOW = "application_workflow_rules";
const DB_KEY_VALIDATION = "application_validation_rules";
const DB_KEY_AUTHORITY = "administrative_authority_settings";
const DB_KEY_SUPER_CONTROLS = "super_admin_configurable_controls";

export const SETTINGS_CHANGE_EVENT = "bagula2_settings_changed";

/* ------------------------------------------------------------------ */
/* Cached Synchronous Getters                                         */
/* ------------------------------------------------------------------ */

export function getCachedSuperAdminControls(): SuperAdminConfigurableControls {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_SUPER_CONTROLS) : null;
    if (raw) return { ...DEFAULT_SUPER_ADMIN_CONTROLS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Could not parse cached super admin controls:", e);
  }
  return DEFAULT_SUPER_ADMIN_CONTROLS;
}

export function applyPartyTheme(theme: PartyTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("theme-bjp", "theme-tmc", "theme-cpim", "theme-congress");
  if (theme && theme !== "default") {
    root.classList.add(`theme-${theme}`);
  }
}

export async function loadSuperAdminControls(): Promise<SuperAdminConfigurableControls> {
  const loaded = await loadBusinessRule<SuperAdminConfigurableControls>(
    DB_KEY_SUPER_CONTROLS,
    getCachedSuperAdminControls()
  );
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_SUPER_CONTROLS, JSON.stringify(loaded));
    applyPartyTheme(loaded.partyTheme);
  }
  return loaded;
}

export async function saveSuperAdminControls(
  controls: SuperAdminConfigurableControls,
  actorEmail?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SUPER_CONTROLS, JSON.stringify(controls));
      applyPartyTheme(controls.partyTheme);
      window.dispatchEvent(
        new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: { type: "super_controls", controls } })
      );
    }

    const res = await saveBusinessRule(
      DB_KEY_SUPER_CONTROLS,
      controls as unknown as Record<string, unknown>,
      "Super Admin configurable controls: form fields, layout size, party profiles, and phone visibility",
      actorEmail
    );

    if (!res.success) {
      return { success: false, error: res.error || "Failed to persist super controls to database" };
    }

    await logActivity({
      action_type: "settings.super_controls_update",
      target_table: "business_rules",
      target_id: DB_KEY_SUPER_CONTROLS,
      metadata: { actor: actorEmail, partyTheme: controls.partyTheme, layout: controls.formSizeLayout },
    }).catch(() => null);

    return { success: true };
  } catch (err: any) {
    console.error("Failed to persist super controls to Supabase:", err);
    return { success: false, error: err?.message || "Failed to save super admin controls" };
  }
}

// Auto-apply cached party theme on script evaluation in browser
if (typeof window !== "undefined") {
  try {
    const initialControls = getCachedSuperAdminControls();
    applyPartyTheme(initialControls.partyTheme);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Cached Synchronous Getters                                         */
/* ------------------------------------------------------------------ */

export function getCachedWorkflowRules(): ApplicationWorkflowRules {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_WORKFLOW) : null;
    if (raw) return { ...DEFAULT_WORKFLOW_RULES, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Could not parse cached workflow rules:", e);
  }
  return DEFAULT_WORKFLOW_RULES;
}

export function getCachedValidationRules(): ApplicationValidationRules {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_VALIDATION) : null;
    if (raw) return { ...DEFAULT_VALIDATION_RULES, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Could not parse cached validation rules:", e);
  }
  return DEFAULT_VALIDATION_RULES;
}

export function getCachedAuthoritySettings(): AdministrativeAuthoritySettings {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_AUTHORITY) : null;
    if (raw) return { ...DEFAULT_AUTHORITY_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Could not parse cached authority settings:", e);
  }
  return DEFAULT_AUTHORITY_SETTINGS;
}

/** Formats a memo prefix template with the target year (e.g. "/BGL-II/{YEAR}" -> "/BGL-II/2026") */
export function formatMemoPrefix(template: string, year: number = new Date().getFullYear()): string {
  if (!template) return `/BGL-II/${year}`;
  return template.replace(/{YEAR}/gi, String(year)).replace(/\{year\}/g, String(year));
}

/* ------------------------------------------------------------------ */
/* Database Loader & Saver API                                        */
/* ------------------------------------------------------------------ */

export async function loadAllAppSettings(): Promise<{
  workflow: ApplicationWorkflowRules;
  validation: ApplicationValidationRules;
  authority: AdministrativeAuthoritySettings;
}> {
  try {
    const map = await loadMultipleBusinessRules([DB_KEY_WORKFLOW, DB_KEY_VALIDATION, DB_KEY_AUTHORITY]);

    const workflow: ApplicationWorkflowRules = {
      ...DEFAULT_WORKFLOW_RULES,
      ...(map.get(DB_KEY_WORKFLOW) || {}),
    };
    const validation: ApplicationValidationRules = {
      ...DEFAULT_VALIDATION_RULES,
      ...(map.get(DB_KEY_VALIDATION) || {}),
    };
    const authority: AdministrativeAuthoritySettings = {
      ...DEFAULT_AUTHORITY_SETTINGS,
      ...(map.get(DB_KEY_AUTHORITY) || {}),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_WORKFLOW, JSON.stringify(workflow));
      localStorage.setItem(STORAGE_KEY_VALIDATION, JSON.stringify(validation));
      localStorage.setItem(STORAGE_KEY_AUTHORITY, JSON.stringify(authority));
    }

    return { workflow, validation, authority };
  } catch (e) {
    console.warn("loadAllAppSettings fallback to cache:", e);
  }

  return {
    workflow: getCachedWorkflowRules(),
    validation: getCachedValidationRules(),
    authority: getCachedAuthoritySettings(),
  };
}

export async function saveWorkflowRules(
  rules: ApplicationWorkflowRules,
  actorEmail?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_WORKFLOW, JSON.stringify(rules));
      window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: { type: "workflow", rules } }));
    }

    const res = await saveBusinessRule(
      DB_KEY_WORKFLOW,
      rules as unknown as Record<string, unknown>,
      "Application workflow rules, certificate memo prefix, quota, validity and fees",
      actorEmail
    );

    if (!res.success) {
      return { success: false, error: res.error || "Failed to persist workflow rules to Supabase" };
    }

    await logActivity({
      action_type: "rules.workflow_update",
      target_table: "business_rules",
      target_id: DB_KEY_WORKFLOW,
      metadata: { actor: actorEmail, memoPrefix: rules.warishMemoPrefix },
    }).catch(() => null);

    return { success: true };
  } catch (err: any) {
    console.error("Failed to persist workflow rules to Supabase:", err);
    return { success: false, error: err?.message || "Failed to persist workflow rules" };
  }
}

export async function saveValidationRules(
  rules: ApplicationValidationRules,
  actorEmail?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_VALIDATION, JSON.stringify(rules));
      window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: { type: "validation", rules } }));
    }

    const res = await saveBusinessRule(
      DB_KEY_VALIDATION,
      rules as unknown as Record<string, unknown>,
      "Application validation logic, file upload constraints, regex and verification rules",
      actorEmail
    );

    if (!res.success) {
      return { success: false, error: res.error || "Failed to persist validation rules to Supabase" };
    }

    await logActivity({
      action_type: "rules.validation_update",
      target_table: "business_rules",
      target_id: DB_KEY_VALIDATION,
      metadata: { actor: actorEmail, maxDocSizeKb: rules.maxGeneralDocSizeKb },
    }).catch(() => null);

    return { success: true };
  } catch (err: any) {
    console.error("Failed to persist validation rules to Supabase:", err);
    return { success: false, error: err?.message || "Failed to persist validation rules" };
  }
}

export async function saveAuthoritySettings(
  settings: AdministrativeAuthoritySettings,
  actorEmail?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_AUTHORITY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: { type: "authority", settings } }));
    }

    const res = await saveBusinessRule(
      DB_KEY_AUTHORITY,
      settings as unknown as Record<string, unknown>,
      "Administrative authority, GP jurisdiction details, signatory names and emergency notices",
      actorEmail
    );

    if (!res.success) {
      return { success: false, error: res.error || "Failed to persist authority settings to Supabase" };
    }

    await logActivity({
      action_type: "settings.authority_update",
      target_table: "business_rules",
      target_id: DB_KEY_AUTHORITY,
      metadata: { actor: actorEmail, pradhan: settings.pradhanName },
    }).catch(() => null);

    return { success: true };
  } catch (err: any) {
    console.error("Failed to persist authority settings to Supabase:", err);
    return { success: false, error: err?.message || "Failed to persist authority settings" };
  }
}

export async function resetAllSettingsToDefaults(actorEmail?: string | null): Promise<void> {
  await saveWorkflowRules(DEFAULT_WORKFLOW_RULES, actorEmail);
  await saveValidationRules(DEFAULT_VALIDATION_RULES, actorEmail);
  await saveAuthoritySettings(DEFAULT_AUTHORITY_SETTINGS, actorEmail);
}

/* ------------------------------------------------------------------ */
/* React Hook: useAppSettings                                         */
/* ------------------------------------------------------------------ */

export function useAppSettings() {
  const [workflow, setWorkflow] = useState<ApplicationWorkflowRules>(getCachedWorkflowRules);
  const [validation, setValidation] = useState<ApplicationValidationRules>(getCachedValidationRules);
  const [authority, setAuthority] = useState<AdministrativeAuthoritySettings>(getCachedAuthoritySettings);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const result = await loadAllAppSettings();
    setWorkflow(result.workflow);
    setValidation(result.validation);
    setAuthority(result.authority);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();

    const handleEvent = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.type === "workflow") {
        setWorkflow(custom.detail.rules);
      } else if (custom.detail?.type === "validation") {
        setValidation(custom.detail.rules);
      } else if (custom.detail?.type === "authority") {
        setAuthority(custom.detail.settings);
      } else {
        setWorkflow(getCachedWorkflowRules());
        setValidation(getCachedValidationRules());
        setAuthority(getCachedAuthoritySettings());
      }
    };

    window.addEventListener(SETTINGS_CHANGE_EVENT, handleEvent);
    return () => window.removeEventListener(SETTINGS_CHANGE_EVENT, handleEvent);
  }, [reload]);

  return {
    loading,
    workflow,
    validation,
    authority,
    reload,
    updateWorkflow: (next: ApplicationWorkflowRules, email?: string | null) => saveWorkflowRules(next, email),
    updateValidation: (next: ApplicationValidationRules, email?: string | null) => saveValidationRules(next, email),
    updateAuthority: (next: AdministrativeAuthoritySettings, email?: string | null) => saveAuthoritySettings(next, email),
    resetAll: (email?: string | null) => resetAllSettingsToDefaults(email),
  };
}
