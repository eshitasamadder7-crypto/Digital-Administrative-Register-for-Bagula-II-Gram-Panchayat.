import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveBusinessRule,
  loadBusinessRule,
  sanitizeBusinessRuleError,
} from "@/lib/businessRulesService";
import {
  saveWorkflowRules,
  loadAllAppSettings,
  saveValidationRules,
  saveAuthoritySettings,
  saveSuperAdminControls,
  loadSuperAdminControls,
  DEFAULT_WORKFLOW_RULES,
  DEFAULT_VALIDATION_RULES,
  DEFAULT_AUTHORITY_SETTINGS,
  DEFAULT_SUPER_ADMIN_CONTROLS,
  SETTINGS_CHANGE_EVENT,
} from "@/lib/appSettings";

describe("Business Rules & Master Data Persistence Service", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Error Sanitization", () => {
    it("should sanitize raw RLS violation errors to user-friendly permission notice", () => {
      const rlsError = new Error('new row violates row-level security policy for table "business_rules"');
      const sanitized = sanitizeBusinessRuleError(rlsError);
      expect(sanitized).toBe(
        "Access Denied: Only authorized Super Admins or Admins can modify system configuration."
      );
      expect(sanitized).not.toContain("42501");
      expect(sanitized).not.toContain("row-level security policy");
    });

    it("should sanitize unauthenticated session errors", () => {
      const authError = new Error("JWT expired or not authenticated");
      const sanitized = sanitizeBusinessRuleError(authError);
      expect(sanitized).toBe(
        "Session expired or not authenticated. Please log in as Super Admin."
      );
    });

    it("should sanitize 403 Forbidden errors", () => {
      const err = { message: "Permission Denied: Only authorized Super Admins or Admins can modify system configuration." };
      const sanitized = sanitizeBusinessRuleError(err);
      expect(sanitized).toBe(
        "Permission Denied: Only authorized Super Admins or Admins can modify system configuration."
      );
    });
  });

  describe("saveBusinessRule validation", () => {
    it("should reject empty rule keys", async () => {
      const res = await saveBusinessRule("", { test: 123 });
      expect(res.success).toBe(false);
      expect(res.error).toBe("Rule key cannot be empty.");
    });

    it("should reject invalid non-object rule values", async () => {
      const res = await saveBusinessRule("test_key", null as any);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Rule value must be a valid object.");
    });
  });

  describe("loadBusinessRule fallback", () => {
    it("should return fallback when rule is not found or empty", async () => {
      const fallback = { quota: 50 };
      const res = await loadBusinessRule("non_existent_rule_xyz", fallback);
      expect(res).toEqual(fallback);
    });
  });

  describe("Application Settings persistence workflow", () => {
    it("should save and dispatch workflow rules changes", async () => {
      const eventSpy = vi.fn();
      window.addEventListener(SETTINGS_CHANGE_EVENT, eventSpy);

      const modifiedRules = {
        ...DEFAULT_WORKFLOW_RULES,
        warishMemoPrefix: "BAG2/TEST/WARISH",
        warishValidityDays: 180,
      };

      const res = await saveWorkflowRules(modifiedRules, "superadmin@bagula2gp.gov.in");
      expect(res.success).toBe(true);

      expect(eventSpy).toHaveBeenCalled();
      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.type).toBe("workflow");
      expect(detail.rules.warishMemoPrefix).toBe("BAG2/TEST/WARISH");

      window.removeEventListener(SETTINGS_CHANGE_EVENT, eventSpy);
    });

    it("should save and dispatch validation rules changes", async () => {
      const eventSpy = vi.fn();
      window.addEventListener(SETTINGS_CHANGE_EVENT, eventSpy);

      const modifiedValidation = {
        ...DEFAULT_VALIDATION_RULES,
        maxGeneralDocSizeKb: 3000,
      };

      const res = await saveValidationRules(modifiedValidation, "superadmin@bagula2gp.gov.in");
      expect(res.success).toBe(true);
      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener(SETTINGS_CHANGE_EVENT, eventSpy);
    });

    it("should save and dispatch authority settings changes", async () => {
      const eventSpy = vi.fn();
      window.addEventListener(SETTINGS_CHANGE_EVENT, eventSpy);

      const modifiedAuthority = {
        ...DEFAULT_AUTHORITY_SETTINGS,
        pradhanName: "SMT. SUSMITA BISWAS BARMAN",
      };

      const res = await saveAuthoritySettings(modifiedAuthority, "superadmin@bagula2gp.gov.in");
      expect(res.success).toBe(true);
      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener(SETTINGS_CHANGE_EVENT, eventSpy);
    });

    it("should save and load super admin configurable controls", async () => {
      const customControls = {
        ...DEFAULT_SUPER_ADMIN_CONTROLS,
        partyTheme: "bjp" as const,
        formSizeLayout: "compact" as const,
      };

      const res = await saveSuperAdminControls(customControls, "superadmin@bagula2gp.gov.in");
      expect(res.success).toBe(true);

      const loaded = await loadSuperAdminControls();
      expect(loaded.partyTheme).toBe("bjp");
      expect(loaded.formSizeLayout).toBe("compact");
    });

    it("should reload all app settings preserving cached or default values", async () => {
      const all = await loadAllAppSettings();
      expect(all.workflow).toBeDefined();
      expect(all.validation).toBeDefined();
      expect(all.authority).toBeDefined();
    });
  });
});
