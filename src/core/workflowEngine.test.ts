import { describe, it, expect } from "vitest";
import { workflowEngine } from "./workflowEngine";
import type { AppStatus } from "./appState";

describe("workflowEngine", () => {
  describe("next", () => {
    it("should return the first candidate if it is valid", () => {
      expect(workflowEngine.next("draft", ["submitted"])).toBe("submitted");
    });

    it("should return the first valid candidate and respect candidate ordering if multiple are valid", () => {
      // Both "archived" and "submitted" are valid from "draft".
      // It should return the one that comes first in the candidates array.
      expect(workflowEngine.next("draft", ["archived", "submitted"])).toBe("archived");
      expect(workflowEngine.next("draft", ["submitted", "archived"])).toBe("submitted");
    });

    it("should skip invalid candidates and return the first valid one", () => {
      // "issued" is not a valid transition from "draft", but "submitted" is.
      expect(workflowEngine.next("draft", ["issued", "submitted"])).toBe("submitted");
      // "rejected" and "issued" are invalid, but "archived" is valid.
      expect(workflowEngine.next("draft", ["rejected", "issued", "archived"])).toBe("archived");
    });

    it("should return null if no candidates are valid", () => {
      // None of these are valid transitions from "draft"
      expect(workflowEngine.next("draft", ["issued", "approved", "rejected"])).toBeNull();
    });

    it("should return null if the candidates array is empty", () => {
      expect(workflowEngine.next("draft", [])).toBeNull();
    });
  });
});
