import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("should merge a single class", () => {
    expect(cn("p-2")).toBe("p-2");
  });

  it("should merge multiple classes", () => {
    expect(cn("p-2", "m-4")).toBe("p-2 m-4");
  });

  it("should handle conditional classes", () => {
    const isTrue = true;
    const isFalse = false;
    expect(cn("p-2", isTrue && "m-4", isFalse && "flex")).toBe("p-2 m-4");
  });

  it("should handle undefined and null", () => {
    expect(cn("p-2", undefined, null, "m-4")).toBe("p-2 m-4");
  });

  it("should handle false/boolean conditional values", () => {
    expect(cn("p-2", false, "m-4")).toBe("p-2 m-4");
  });

  it("should handle duplicate classes", () => {
    expect(cn("p-2", "p-2")).toBe("p-2");
  });

  it("should resolve Tailwind conflicts (margin/padding)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("should resolve Tailwind conflicts (text size)", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("should handle empty input", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });

  it("should handle mixed arrays/objects", () => {
    expect(cn("p-2", ["m-4", "flex"], { "text-sm": true, "bg-red-500": false })).toBe("p-2 m-4 flex text-sm");
  });
});
