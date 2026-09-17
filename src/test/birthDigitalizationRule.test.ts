import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEFAULT_BIRTH_DIGITALIZATION_RULE,
  getCachedBirthDigitalizationRule,
  saveBirthDigitalizationRule,
  loadBirthDigitalizationRule,
  type BirthDigitalizationRule,
} from "@/lib/birthDigitalizationRule";

describe("Birth Digitalization Dynamic Rules & Super Admin Controls", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should have correct default schedule: 1st Tue & Wed, 300/month, 100/day", () => {
    expect(DEFAULT_BIRTH_DIGITALIZATION_RULE.isActive).toBe(true);
    expect(DEFAULT_BIRTH_DIGITALIZATION_RULE.acceptedDays).toBe("First Tuesday & Wednesday of every month");
    expect(DEFAULT_BIRTH_DIGITALIZATION_RULE.monthlyLimit).toBe(300);
    expect(DEFAULT_BIRTH_DIGITALIZATION_RULE.dailyLimit).toBe(100);
    expect(DEFAULT_BIRTH_DIGITALIZATION_RULE.scheduleDescription).toContain(
      "Applications accepted on the first Tuesday & Wednesday of every month — up to 300 applications, limit 100/day."
    );
  });

  it("should return default rule when cache is empty", () => {
    const rule = getCachedBirthDigitalizationRule();
    expect(rule.isActive).toBe(true);
    expect(rule.monthlyLimit).toBe(300);
    expect(rule.dailyLimit).toBe(100);
  });

  it("should allow Super Admin to deactivate the digitalization acceptance window", async () => {
    const deactivatedRule: BirthDigitalizationRule = {
      ...DEFAULT_BIRTH_DIGITALIZATION_RULE,
      isActive: false,
      deactivationNotice: "Applications paused by Gram Panchayat order until further notice.",
    };

    const res = await saveBirthDigitalizationRule(deactivatedRule, "superadmin@bagula2gp.gov.in");
    expect(res.success).toBe(true);

    const cached = getCachedBirthDigitalizationRule();
    expect(cached.isActive).toBe(false);
    expect(cached.deactivationNotice).toBe("Applications paused by Gram Panchayat order until further notice.");
    expect(cached.lastModifiedBy).toBe("superadmin@bagula2gp.gov.in");
  });

  it("should allow Super Admin to modify days and quota limits", async () => {
    const customRule: BirthDigitalizationRule = {
      ...DEFAULT_BIRTH_DIGITALIZATION_RULE,
      isActive: true,
      acceptedDays: "every Tuesday & Thursday",
      monthlyLimit: 500,
      dailyLimit: 150,
      scheduleDescription: "Applications accepted on every Tuesday & Thursday — up to 500 applications, limit 150/day.",
    };

    const res = await saveBirthDigitalizationRule(customRule, "superadmin@bagula2gp.gov.in");
    expect(res.success).toBe(true);

    const loaded = getCachedBirthDigitalizationRule();
    expect(loaded.acceptedDays).toBe("every Tuesday & Thursday");
    expect(loaded.monthlyLimit).toBe(500);
    expect(loaded.dailyLimit).toBe(150);
    expect(loaded.scheduleDescription).toBe(
      "Applications accepted on every Tuesday & Thursday — up to 500 applications, limit 150/day."
    );
  });

  it("should dispatch custom event when rule is modified", async () => {
    let eventFired = false;
    let receivedRule: BirthDigitalizationRule | null = null;

    const listener = (e: Event) => {
      eventFired = true;
      receivedRule = (e as CustomEvent<BirthDigitalizationRule>).detail;
    };

    window.addEventListener("bagula2_birth_digitalization_rule_changed", listener);

    const updatedRule: BirthDigitalizationRule = {
      ...DEFAULT_BIRTH_DIGITALIZATION_RULE,
      monthlyLimit: 400,
    };

    await saveBirthDigitalizationRule(updatedRule, "superadmin@bagula2gp.gov.in");

    expect(eventFired).toBe(true);
    expect(receivedRule?.monthlyLimit).toBe(400);

    window.removeEventListener("bagula2_birth_digitalization_rule_changed", listener);
  });
});
