import { describe, expect, it } from "vitest";
import { validateAdminRedirect } from "./redirectValidator";

describe("validateAdminRedirect", () => {
  const origin = "https://deo-workflow.example.com";

  describe("Valid relative and absolute paths", () => {
    it("accepts normal relative paths", () => {
      expect(validateAdminRedirect("/dashboard", origin)).toBe("/dashboard");
      expect(validateAdminRedirect("/admin/users?q=1#hash", origin)).toBe("/admin/users?q=1#hash");
    });

    it("accepts same-origin absolute urls, returning normalized relative path", () => {
      expect(
        validateAdminRedirect("https://deo-workflow.example.com/admin?tab=pending", origin),
      ).toBe("/admin?tab=pending");
    });
  });

  describe("Invalid external domains and protocol-relative", () => {
    it("rejects absolute external domains", () => {
      expect(validateAdminRedirect("https://attacker.example", origin)).toBeNull();
      expect(validateAdminRedirect("http://attacker.example", origin)).toBeNull();
    });

    it("rejects protocol-relative domains", () => {
      expect(validateAdminRedirect("//attacker.example", origin)).toBeNull();
      expect(validateAdminRedirect("//attacker.example/dashboard", origin)).toBeNull();
    });

    it("rejects backslash authority bypasses", () => {
      // In JS strings, \\ is a literal backslash. We want to test /\attacker, \\attacker, \/attacker
      expect(validateAdminRedirect("/\\attacker.example", origin)).toBeNull();
      expect(validateAdminRedirect("\\attacker.example", origin)).toBeNull();
      expect(validateAdminRedirect("\\/attacker.example", origin)).toBeNull();
    });

    it("rejects lookalike domains and subdomains", () => {
      expect(validateAdminRedirect("https://example.com.attacker.example/path", origin)).toBeNull();
      expect(validateAdminRedirect("https://attacker-example.com", origin)).toBeNull();
      expect(validateAdminRedirect("https://attacker.deo-workflow.example.com", origin)).toBeNull();
    });
  });

  describe("Invalid dangerous schemes", () => {
    it("rejects javascript:", () => {
      expect(validateAdminRedirect("javascript:alert(1)", origin)).toBeNull();
    });

    it("rejects data: and vbscript:", () => {
      expect(validateAdminRedirect("data:text/html,<script>alert(1)</script>", origin)).toBeNull();
      expect(validateAdminRedirect("vbscript:alert(1)", origin)).toBeNull();
    });
  });

  describe("Critical Open Redirect Regressions", () => {
    it("blocks URL normalization pathname exploits like https://<origin>//attacker.example", () => {
      // The previous implementation's regression caused this to return //attacker.example,
      // which becomes a protocol-relative exploit when given to window.location.replace
      const result = validateAdminRedirect(
        "https://deo-workflow.example.com//attacker.example",
        origin,
      );
      if (result !== null) expect(result).not.toMatch(/^\/\//);
      expect(result).toBeNull();

      expect(
        validateAdminRedirect("https://deo-workflow.example.com/\\attacker.example", origin),
      ).toBeNull();
    });

    it("handles encoded slashes and whitespace safely without leaking origin", () => {
      expect(validateAdminRedirect(" https://attacker.example", origin)).toBeNull();
      expect(validateAdminRedirect("\thttps://attacker.example", origin)).toBeNull();
      expect(validateAdminRedirect("/%5C%5Cattacker.example", origin)).toBe(
        "/%5C%5Cattacker.example",
      ); // Just an encoded string path on the local domain, browser handles appropriately
    });
  });
});
