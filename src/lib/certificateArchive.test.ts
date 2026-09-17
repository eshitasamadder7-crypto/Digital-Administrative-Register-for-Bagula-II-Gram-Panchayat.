import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { yearsSinceIssue } from "./certificateArchive";

describe("yearsSinceIssue", () => {
  const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    // Set a known fixed current time: 2024-01-01T12:00:00.000Z
    vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("invalid or empty inputs", () => {
    it("returns 0 for null", () => {
      expect(yearsSinceIssue(null)).toBe(0);
    });

    it("returns 0 for undefined", () => {
      expect(yearsSinceIssue(undefined)).toBe(0);
    });

    it("returns 0 for empty string", () => {
      expect(yearsSinceIssue("")).toBe(0);
    });

    it("returns 0 for invalid date string", () => {
      expect(yearsSinceIssue("invalid-date")).toBe(0);
    });
  });

  describe("valid dates", () => {
    it("calculates exactly one year-equivalent ago", () => {
      const now = Date.now();
      const oneYearAgoMs = now - MS_PER_YEAR;
      const oneYearAgoDate = new Date(oneYearAgoMs).toISOString();

      expect(yearsSinceIssue(oneYearAgoDate)).toBeCloseTo(1, 5);
    });

    it("calculates multi-year values correctly", () => {
      const now = Date.now();
      const fiveYearsAgoMs = now - 5 * MS_PER_YEAR;
      const fiveYearsAgoDate = new Date(fiveYearsAgoMs).toISOString();

      expect(yearsSinceIssue(fiveYearsAgoDate)).toBeCloseTo(5, 5);
    });

    it("returns negative values for future dates", () => {
      const now = Date.now();
      const twoYearsFutureMs = now + 2 * MS_PER_YEAR;
      const twoYearsFutureDate = new Date(twoYearsFutureMs).toISOString();

      expect(yearsSinceIssue(twoYearsFutureDate)).toBeCloseTo(-2, 5);
    });

    it("uses the actual timestamp (time component)", () => {
      const now = Date.now();
      // Half a year ago exactly
      const halfYearAgoMs = now - 0.5 * MS_PER_YEAR;
      const halfYearAgoDate = new Date(halfYearAgoMs).toISOString();

      expect(yearsSinceIssue(halfYearAgoDate)).toBeCloseTo(0.5, 5);
    });
  });
});
