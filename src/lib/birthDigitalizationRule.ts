import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";
import { saveBusinessRule, loadBusinessRule } from "@/lib/businessRulesService";

export interface BirthDigitalizationRule {
  isActive: boolean; // whether applications are accepted or deactivated
  title: string;
  icon: string;
  scheduleDescription: string;
  acceptedDays: string;
  monthlyLimit: number;
  dailyLimit: number;
  deactivationNotice: string;
  guidelinesNotice?: string;
  lastModifiedBy?: string | null;
  lastModifiedAt?: string | null;
}

export const DEFAULT_BIRTH_DIGITALIZATION_RULE: BirthDigitalizationRule = {
  isActive: true,
  title: "Birth Certificate Digitalization",
  icon: "📢",
  scheduleDescription:
    "Applications accepted on the first Tuesday & Wednesday of every month — up to 300 applications, limit 100/day.",
  acceptedDays: "First Tuesday & Wednesday of every month",
  monthlyLimit: 300,
  dailyLimit: 100,
  deactivationNotice:
    "Birth Certificate Digitalization applications are currently paused by the Gram Panchayat administration. Please check back for the next scheduled application window.",
  guidelinesNotice:
    "Applicants must carry original manual handwritten certificate (or Police GD loss report for Path B) along with mother's ID proof for GP Volume register ink-and-paper verification.",
  lastModifiedBy: "System (Default)",
  lastModifiedAt: new Date().toISOString(),
};

const STORAGE_KEY = "bagula2_birth_digitalization_rule";
const RULE_DB_KEY = "birth_digitalization_schedule_quota";
const RULE_CHANGE_EVENT = "bagula2_birth_digitalization_rule_changed";

/**
 * Reads the current rule from local cache if present, otherwise returns default.
 */
export function getCachedBirthDigitalizationRule(): BirthDigitalizationRule {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_BIRTH_DIGITALIZATION_RULE, ...parsed };
    }
  } catch (err) {
    console.warn("Failed to parse cached birth digitalization rule:", err);
  }
  return DEFAULT_BIRTH_DIGITALIZATION_RULE;
}

/**
 * Loads the active rule from Supabase business_rules table, falls back to local cache or default.
 */
export async function loadBirthDigitalizationRule(): Promise<BirthDigitalizationRule> {
  try {
    const loaded = await loadBusinessRule<BirthDigitalizationRule>(
      RULE_DB_KEY,
      getCachedBirthDigitalizationRule()
    );

    if (loaded) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
      }
      return loaded;
    }
  } catch (e) {
    console.warn("Could not query business_rules table, using local cache:", e);
  }

  return getCachedBirthDigitalizationRule();
}

/**
 * Saves modified rule to Supabase business_rules table and local cache.
 * Must only be called by authorized Super Admin.
 */
export async function saveBirthDigitalizationRule(
  rule: BirthDigitalizationRule,
  actorEmail?: string | null
): Promise<{ success: boolean; error?: string }> {
  const updated: BirthDigitalizationRule = {
    ...rule,
    lastModifiedBy: actorEmail || "Super Admin",
    lastModifiedAt: new Date().toISOString(),
  };

  // 1. Immediately cache in local storage and notify all listeners
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(RULE_CHANGE_EVENT, { detail: updated }));
  }

  // 2. Persist in database using backend-authoritative service
  const res = await saveBusinessRule(
    RULE_DB_KEY,
    updated as unknown as Record<string, unknown>,
    "Birth Certificate Digitalization acceptance schedule, monthly/daily quota, and active status",
    actorEmail
  );

  if (!res.success) {
    return { success: false, error: res.error || "Failed to persist rule to database." };
  }

  // 3. Log office activity
  try {
    await logActivity({
      action_type: updated.isActive ? "rule.update" : "rule.deactivate",
      target_table: "business_rules",
      target_id: RULE_DB_KEY,
      metadata: {
        title: updated.title,
        isActive: updated.isActive,
        monthlyLimit: updated.monthlyLimit,
        dailyLimit: updated.dailyLimit,
        acceptedDays: updated.acceptedDays,
      },
    });
  } catch (_) {
    // Non-blocking log failure
  }

  return { success: true };
}

/**
 * Custom React hook for live reading and subscription to Birth Digitalization rules.
 */
export function useBirthDigitalizationRule() {
  const [rule, setRule] = useState<BirthDigitalizationRule>(getCachedBirthDigitalizationRule);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    loadBirthDigitalizationRule().then((loaded) => {
      if (mounted) {
        setRule(loaded);
        setLoading(false);
      }
    });

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<BirthDigitalizationRule>;
      if (customEvent.detail) {
        setRule(customEvent.detail);
      } else {
        setRule(getCachedBirthDigitalizationRule());
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(RULE_CHANGE_EVENT, handleUpdate);
      window.addEventListener("storage", handleUpdate);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(RULE_CHANGE_EVENT, handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      }
    };
  }, []);

  return {
    rule,
    loading,
    setRuleLocally: (newRule: BirthDigitalizationRule) => {
      setRule(newRule);
    },
  };
}
