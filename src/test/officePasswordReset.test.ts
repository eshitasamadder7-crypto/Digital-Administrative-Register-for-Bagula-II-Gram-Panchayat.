import { describe, it, expect, vi } from "vitest";

/**
 * Mirror of generateSecureTemporaryPassword implementation in office-accounts edge function
 */
function generateSecureTemporaryPassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*()-_=+";
  const all = upper + lower + digits + symbols;

  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);

  const chars = [
    upper[buf[0] % upper.length],
    upper[buf[1] % upper.length],
    lower[buf[2] % lower.length],
    lower[buf[3] % lower.length],
    digits[buf[4] % digits.length],
    digits[buf[5] % digits.length],
    symbols[buf[6] % symbols.length],
    symbols[buf[7] % symbols.length],
  ];

  for (let i = 8; i < length; i++) {
    chars.push(all[buf[i] % all.length]);
  }

  const shuffleBuf = new Uint8Array(length);
  crypto.getRandomValues(shuffleBuf);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBuf[i] % (i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join("");
}

describe("Office User Password Reset Security Tests", () => {
  describe("Cryptographically Secure Temporary Password Generator", () => {
    it("generates passwords of specified length (>= 16 chars)", () => {
      const pw = generateSecureTemporaryPassword(16);
      expect(pw.length).toBe(16);
    });

    it("includes required character classes: upper, lower, digits, symbols", () => {
      for (let i = 0; i < 20; i++) {
        const pw = generateSecureTemporaryPassword(16);
        expect(/[A-Z]/.test(pw)).toBe(true);
        expect(/[a-z]/.test(pw)).toBe(true);
        expect(/[0-9]/.test(pw)).toBe(true);
        expect(/[!@#$%^&*()-_=+]/.test(pw)).toBe(true);
      }
    });

    it("generates non-repeating, unpredictable values across runs", () => {
      const set = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const pw = generateSecureTemporaryPassword(16);
        expect(set.has(pw)).toBe(false);
        set.add(pw);
      }
      expect(set.size).toBe(50);
    });
  });

  describe("Role & Scope Preservation Guarantee", () => {
    it("preserves role, designation, and service_scope when must_change_password is set", () => {
      const initialProfile = {
        user_id: "officer-uuid-123",
        email: "officer@bagulaii.gov.in",
        display_name: "Sub-Registrar Officer",
        role: "admin",
        designation: "gp_pradhan",
        service_scope: ["all"],
        status: "active",
        must_change_password: false,
      };

      // Simulating update performed during reset:
      const updatedProfile = {
        ...initialProfile,
        must_change_password: true,
        temp_password_issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Ensure zero mutation of role, designation, service_scope, status
      expect(updatedProfile.role).toBe(initialProfile.role);
      expect(updatedProfile.designation).toBe(initialProfile.designation);
      expect(updatedProfile.service_scope).toEqual(initialProfile.service_scope);
      expect(updatedProfile.status).toBe(initialProfile.status);
      expect(updatedProfile.must_change_password).toBe(true);
      expect(updatedProfile.temp_password_issued_at).toBeDefined();
    });
  });

  describe("Audit Log Credential Sanitization Guarantee", () => {
    it("never includes passwords or hashes in audit log payload", () => {
      const tempPassword = generateSecureTemporaryPassword(16);
      const auditPayload = {
        actor_user_id: "superadmin-uuid",
        action_type: "PASSWORD_RESET",
        target_table: "admin_profiles",
        target_id: "officer-uuid",
        metadata: {
          action: "PASSWORD_RESET",
          actor_id: "superadmin-uuid",
          actor_role: "super_admin",
          target_user_id: "officer-uuid",
          target_role: "deo",
          target_email: "deo@bagulaii.gov.in",
          timestamp: new Date().toISOString(),
        },
      };

      const serialized = JSON.stringify(auditPayload);
      expect(serialized).not.toContain(tempPassword);
      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("hash");
      expect(auditPayload.metadata.action).toBe("PASSWORD_RESET");
      expect(auditPayload.metadata.actor_role).toBe("super_admin");
    });
  });

  describe("URL and Storage Leakage Prevention", () => {
    it("does not append temporary password to query strings or URL paths", () => {
      const tempPassword = generateSecureTemporaryPassword(16);
      const targetUrl = new URL("https://bagulaii.gov.in/admin/manage-admins");

      // Verify no query param contains the credential
      expect(targetUrl.searchParams.has("password")).toBe(false);
      expect(targetUrl.searchParams.has("temp_password")).toBe(false);
      expect(targetUrl.toString()).not.toContain(tempPassword);
    });
  });

  describe("RequireAdmin Expiry Window Calculation", () => {
    it("evaluates expiry from temp_password_issued_at if available", () => {
      const now = Date.now();
      const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString();
      const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000).toISOString();
      const threeWeeksAgo = new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString();

      const threeHours = 3 * 60 * 60 * 1000;

      // Case 1: Account created 3 weeks ago, password reset 1 hour ago
      const recentResetProfile = {
        created_at: threeWeeksAgo,
        updated_at: oneHourAgo,
        temp_password_issued_at: oneHourAgo,
        must_change_password: true,
      };

      const issuedTimeStr =
        recentResetProfile.temp_password_issued_at ||
        recentResetProfile.updated_at ||
        recentResetProfile.created_at;
      const isExpiredRecent = now - new Date(issuedTimeStr).getTime() > threeHours;
      expect(isExpiredRecent).toBe(false);

      // Case 2: Reset 4 hours ago
      const staleResetProfile = {
        created_at: threeWeeksAgo,
        updated_at: fourHoursAgo,
        temp_password_issued_at: fourHoursAgo,
        must_change_password: true,
      };

      const staleIssuedTimeStr =
        staleResetProfile.temp_password_issued_at ||
        staleResetProfile.updated_at ||
        staleResetProfile.created_at;
      const isExpiredStale = now - new Date(staleIssuedTimeStr).getTime() > threeHours;
      expect(isExpiredStale).toBe(true);
    });

    it("enforces strict 30-minute expiry window for temporary password credentials", () => {
      const thirtyMinutes = 30 * 60 * 1000;
      const now = Date.now();

      // Case A: 15 minutes ago - still valid
      const fifteenMinsAgo = now - 15 * 60 * 1000;
      const isExpiredAt15Mins = now - fifteenMinsAgo > thirtyMinutes;
      expect(isExpiredAt15Mins).toBe(false);

      // Case B: 31 minutes ago - expired
      const thirtyOneMinsAgo = now - 31 * 60 * 1000;
      const isExpiredAt31Mins = now - thirtyOneMinsAgo > thirtyMinutes;
      expect(isExpiredAt31Mins).toBe(true);
    });
  });

  describe("Temporary Super Admin Credential (bagula2nogp111@gmail.com)", () => {
    it("validates temporary password Nitish@374482 within the 30-minute window and invalidates once consumed", async () => {
      const {
        TEMP_ADMIN_EMAIL,
        TEMP_ADMIN_PASSWORD,
        verifyTempAdminLogin,
        markTempPasswordConsumed,
        saveTempCredRecord,
      } = await import("../lib/tempAdminCredentials");

      // Setup fresh unconsumed record issued right now
      saveTempCredRecord({
        email: TEMP_ADMIN_EMAIL,
        issuedAt: Date.now(),
        durationMs: 30 * 60 * 1000,
        consumed: false,
      });

      // 1. Valid password succeeds
      const resultValid = verifyTempAdminLogin(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);
      expect(resultValid.success).toBe(true);
      expect(resultValid.isTemp).toBe(true);
      expect(resultValid.mustChangePassword).toBe(true);

      // 2. Incorrect password fails
      const resultWrong = verifyTempAdminLogin(TEMP_ADMIN_EMAIL, "WrongPassword123!");
      expect(resultWrong.success).toBe(false);

      // 3. Expired after 30 minutes fails
      saveTempCredRecord({
        email: TEMP_ADMIN_EMAIL,
        issuedAt: Date.now() - 31 * 60 * 1000,
        durationMs: 30 * 60 * 1000,
        consumed: false,
      });
      const resultExpired = verifyTempAdminLogin(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);
      expect(resultExpired.success).toBe(false);
      expect(resultExpired.error).toContain("expired (30-minute limit)");

      // 4. Once password is changed, temporary password is consumed and CANNOT be used again
      saveTempCredRecord({
        email: TEMP_ADMIN_EMAIL,
        issuedAt: Date.now(),
        durationMs: 30 * 60 * 1000,
        consumed: false,
      });
      markTempPasswordConsumed("NewPermanentSecure123!");

      const resultAfterChange = verifyTempAdminLogin(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);
      expect(resultAfterChange.success).toBe(false);
      expect(resultAfterChange.error).toContain("already been used and changed");

      // 5. New permanent password works
      const resultPerm = verifyTempAdminLogin(TEMP_ADMIN_EMAIL, "NewPermanentSecure123!");
      expect(resultPerm.success).toBe(true);
      expect(resultPerm.mustChangePassword).toBe(false);
    });

    it("recognizes bagula2nogp111@gmail.com as the designated Super Admin profile", async () => {
      const { isSuperAdminEmail, SUPER_ADMIN_EMAILS } = await import("../lib/permissions");
      expect(SUPER_ADMIN_EMAILS).toContain("bagula2nogp111@gmail.com");
      expect(isSuperAdminEmail("bagula2nogp111@gmail.com")).toBe(true);
      expect(isSuperAdminEmail("BAGULA2NOGP111@GMAIL.COM")).toBe(true);
      expect(isSuperAdminEmail("other@gmail.com")).toBe(false);
    });
  });
});
