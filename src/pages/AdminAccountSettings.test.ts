import { describe, it, expect } from "vitest";
import { isValidAdminPassword } from "./AdminAccountSettings";

describe("isValidAdminPassword", () => {
  it("should return false for passwords shorter than 8 characters", () => {
    expect(isValidAdminPassword("Aa1!abc")).toBe(false); // 7 characters
  });

  it("should return false if there is no uppercase letter", () => {
    expect(isValidAdminPassword("aaaa111!")).toBe(false);
  });

  it("should return false if there is no lowercase letter", () => {
    expect(isValidAdminPassword("AAAA111!")).toBe(false);
  });

  it("should return false if there is no digit", () => {
    expect(isValidAdminPassword("AaBbCcD!")).toBe(false);
  });

  it("should return false if there is no special character", () => {
    expect(isValidAdminPassword("AaBbCc12")).toBe(false);
  });

  it("should return true for exactly 8 characters matching all rules", () => {
    expect(isValidAdminPassword("Aa1!bbcc")).toBe(true);
  });

  it("should return true for passwords longer than 8 characters matching all rules", () => {
    expect(isValidAdminPassword("LongPassword123!")).toBe(true);
  });
});
