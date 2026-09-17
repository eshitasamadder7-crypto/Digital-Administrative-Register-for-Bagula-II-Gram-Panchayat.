import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { saveBusinessRule } from "@/lib/businessRulesService";
import { logActivity } from "@/lib/activityLog";

export type CitizenAuthMode = "otp" | "google" | "otp_and_google" | "password";

export interface AuthenticationSettings {
  id: string;
  citizen_auth_mode: CitizenAuthMode;
  citizen_email_otp_enabled: boolean;
  citizen_google_enabled: boolean;
  citizen_password_enabled: boolean;
  citizen_forgot_password_enabled: boolean;
  official_password_enabled: boolean;
  official_google_enabled: boolean;
  updated_at?: string;
  updated_by?: string;
  description?: string;
}

/**
 * Authoritative default policy for Bagula II Gram Panchayat:
 * - Citizen authentication is OTP-first and Google OAuth enabled.
 * - Citizen Password is DISABLED by policy.
 * - Citizen Forgot Password is strictly DISABLED because citizens do not have passwords.
 * - Official/DEO password and Google authentication remain active.
 */
export const DEFAULT_AUTH_SETTINGS: AuthenticationSettings = {
  id: "current",
  citizen_auth_mode: "otp_and_google",
  citizen_email_otp_enabled: true,
  citizen_google_enabled: true,
  citizen_password_enabled: false,
  citizen_forgot_password_enabled: false,
  official_password_enabled: true,
  official_google_enabled: true,
  description: "Authoritative authentication governance policy for Bagula II Gram Panchayat",
};

const STORAGE_KEY = "bagula2_auth_settings_cache";

let cachedSettings: AuthenticationSettings = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Enforce dependency invariant on cached values
      if (!parsed.citizen_password_enabled) {
        parsed.citizen_forgot_password_enabled = false;
      }
      return { ...DEFAULT_AUTH_SETTINGS, ...parsed };
    }
  } catch {
    // Ignore parsing issues
  }
  return DEFAULT_AUTH_SETTINGS;
})();

const listeners = new Set<(settings: AuthenticationSettings) => void>();

function notifyListeners(settings: AuthenticationSettings) {
  cachedSettings = settings;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage quota exceeded or unavailable
  }
  listeners.forEach((listener) => {
    try {
      listener(settings);
    } catch {
      // Ignore listener error
    }
  });
}

/**
 * Validates backend dependency rules:
 * 1. Citizen Password OFF -> Citizen Forgot Password MUST BE OFF.
 * 2. At least one Citizen authentication method must remain enabled.
 */
export function validateAuthSettings(settings: Partial<AuthenticationSettings>): {
  valid: boolean;
  error?: string;
} {
  const citizenPass = settings.citizen_password_enabled ?? DEFAULT_AUTH_SETTINGS.citizen_password_enabled;
  const citizenForgot = settings.citizen_forgot_password_enabled ?? DEFAULT_AUTH_SETTINGS.citizen_forgot_password_enabled;
  const citizenOtp = settings.citizen_email_otp_enabled ?? DEFAULT_AUTH_SETTINGS.citizen_email_otp_enabled;
  const citizenGoogle = settings.citizen_google_enabled ?? DEFAULT_AUTH_SETTINGS.citizen_google_enabled;

  if (!citizenPass && citizenForgot) {
    return {
      valid: false,
      error: "Dependency Violation: Citizen Forgot Password cannot be enabled when Citizen Password authentication is disabled. Citizens authenticate via One-Time Passcodes (OTP).",
    };
  }

  if (!citizenOtp && !citizenGoogle && !citizenPass) {
    return {
      valid: false,
      error: "Invalid Configuration: At least one Citizen authentication method (Email OTP, Google, or Password) must remain active.",
    };
  }

  return { valid: true };
}

/**
 * Returns helper flags indicating active citizen methods based on policy.
 */
export function getEffectiveCitizenAuthMethods(settings: AuthenticationSettings = cachedSettings) {
  const allowPassword = Boolean(settings.citizen_password_enabled);
  return {
    allowOtp: Boolean(settings.citizen_email_otp_enabled),
    allowGoogle: Boolean(settings.citizen_google_enabled),
    allowPassword,
    // Forgot password is ONLY true if password authentication is actually enabled AND forgot password is enabled
    allowForgotPassword: allowPassword && Boolean(settings.citizen_forgot_password_enabled),
  };
}

/**
 * Loads current authentication settings from the database:
 * 1. Queries `authentication_settings` table
 * 2. Fallback to `business_rules` with key 'authentication_settings'
 * 3. Falls back to DEFAULT_AUTH_SETTINGS
 */
export async function loadAuthenticationSettings(): Promise<AuthenticationSettings> {
  try {
    // 1. Try public.authentication_settings table
    const { data: tableData, error: tableError } = await (supabase as any)
      .from("authentication_settings")
      .select("*")
      .eq("id", "current")
      .maybeSingle();

    if (!tableError && tableData) {
      const merged: AuthenticationSettings = {
        ...DEFAULT_AUTH_SETTINGS,
        ...tableData,
        // Invariant guard
        citizen_forgot_password_enabled: tableData.citizen_password_enabled
          ? Boolean(tableData.citizen_forgot_password_enabled)
          : false,
      };
      notifyListeners(merged);
      return merged;
    }

    // 2. Fallback to business_rules table
    const { data: ruleData, error: ruleError } = await (supabase as any)
      .from("business_rules")
      .select("rule_value")
      .eq("rule_key", "authentication_settings")
      .maybeSingle();

    if (!ruleError && ruleData?.rule_value && typeof ruleData.rule_value === "object") {
      const val = ruleData.rule_value as any;
      const merged: AuthenticationSettings = {
        ...DEFAULT_AUTH_SETTINGS,
        ...val,
        citizen_forgot_password_enabled: val.citizen_password_enabled
          ? Boolean(val.citizen_forgot_password_enabled)
          : false,
      };
      notifyListeners(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Could not fetch remote authentication settings; using cached default:", err);
  }

  return cachedSettings;
}

export function getCachedAuthenticationSettings(): AuthenticationSettings {
  return cachedSettings;
}

/**
 * Backend-authoritative mutation of authentication policy:
 * - Checks client-side dependency rules
 * - Calls SECURITY DEFINER RPC `save_authentication_settings`
 * - Fallbacks to direct upsert with RLS checks
 * - Writes audit log
 * - Synchronizes cached state
 */
export async function saveAuthenticationSettings(
  settings: AuthenticationSettings,
  actorEmail?: string | null
): Promise<{ success: boolean; error?: string; settings?: AuthenticationSettings }> {
  // 1. Validate invariant
  const validation = validateAuthSettings(settings);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Enforce dependency defensively
  const safeSettings: AuthenticationSettings = {
    ...settings,
    id: "current",
    citizen_forgot_password_enabled: settings.citizen_password_enabled
      ? Boolean(settings.citizen_forgot_password_enabled)
      : false,
    updated_at: new Date().toISOString(),
    updated_by: actorEmail || "super_admin",
  };

  try {
    // 1. Try save_authentication_settings RPC
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "save_authentication_settings",
      { _settings: safeSettings }
    );

    if (!rpcError && rpcData) {
      notifyListeners(safeSettings);
      return { success: true, settings: safeSettings };
    }

    // 2. Fallback: Upsert to authentication_settings directly
    const { error: upsertError } = await (supabase as any)
      .from("authentication_settings")
      .upsert(safeSettings);

    if (upsertError) {
      // If table error (e.g. RLS denied or table not yet migrated in dev), try business_rules
      const brRes = await saveBusinessRule(
        "authentication_settings",
        safeSettings as any,
        "Authoritative authentication governance policy for Bagula II Gram Panchayat",
        actorEmail
      );
      if (!brRes.success) {
        return { success: false, error: brRes.error || upsertError.message };
      }
    } else {
      // Mirror to business_rules
      await saveBusinessRule(
        "authentication_settings",
        safeSettings as any,
        "Authoritative authentication governance policy for Bagula II Gram Panchayat",
        actorEmail
      ).catch(() => {});
    }

    // 3. Write activity log
    await logActivity({
      action_type: "auth_settings.update",
      target_table: "authentication_settings",
      target_id: "current",
      metadata: {
        citizen_auth_mode: safeSettings.citizen_auth_mode,
        citizen_email_otp_enabled: safeSettings.citizen_email_otp_enabled,
        citizen_google_enabled: safeSettings.citizen_google_enabled,
        citizen_password_enabled: safeSettings.citizen_password_enabled,
        citizen_forgot_password_enabled: safeSettings.citizen_forgot_password_enabled,
        official_password_enabled: safeSettings.official_password_enabled,
        official_google_enabled: safeSettings.official_google_enabled,
      },
    }).catch(() => {});

    notifyListeners(safeSettings);
    return { success: true, settings: safeSettings };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to update authentication governance policy.",
    };
  }
}

/**
 * React Hook for accessing live authentication settings across the app.
 */
export function useAuthenticationSettings() {
  const [settings, setSettings] = useState<AuthenticationSettings>(cachedSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUpdate = (next: AuthenticationSettings) => {
      setSettings(next);
    };

    listeners.add(handleUpdate);

    // Initial load
    setLoading(true);
    loadAuthenticationSettings()
      .then((loaded) => setSettings(loaded))
      .finally(() => setLoading(false));

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const effectiveCitizenMethods = getEffectiveCitizenAuthMethods(settings);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await loadAuthenticationSettings();
      setSettings(res);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    settings,
    loading,
    effectiveCitizenMethods,
    refresh,
  };
}
