import { describe, it, expect } from "vitest";
import { hasServiceScope } from "@/lib/permissions";

describe("hasServiceScope - Fail Closed Security Tests", () => {
  it("denies when service scope is missing", () => {
    const state = { role: "deo" as any, serviceScope: null };
    expect(hasServiceScope(state, "warish")).toBe(false);
  });

  it("denies when service scope is empty array", () => {
    const state = { role: "deo" as any, serviceScope: [] };
    expect(hasServiceScope(state, "warish")).toBe(false);
  });

  it("allows Warish scope for Warish and denies for Dependent", () => {
    const state = { role: "deo" as any, serviceScope: ["warish"] };
    expect(hasServiceScope(state, "warish")).toBe(true);
    expect(hasServiceScope(state, "dependent")).toBe(false);
  });

  it("allows Dependent scope for Dependent and denies for Warish", () => {
    const state = { role: "deo" as any, serviceScope: ["dependent"] };
    expect(hasServiceScope(state, "dependent")).toBe(true);
    expect(hasServiceScope(state, "warish")).toBe(false);
  });

  it("allows all requested scopes for 'all' scope", () => {
    const state = { role: "deo" as any, serviceScope: ["all"] };
    expect(hasServiceScope(state, "warish")).toBe(true);
    expect(hasServiceScope(state, "dependent")).toBe(true);
  });

  it("allows Admin and Super Admin without explicit scope array", () => {
    expect(hasServiceScope({ role: "admin", serviceScope: null }, "warish")).toBe(true);
    expect(hasServiceScope({ role: "super_admin", serviceScope: null }, "dependent")).toBe(true);
  });
});
