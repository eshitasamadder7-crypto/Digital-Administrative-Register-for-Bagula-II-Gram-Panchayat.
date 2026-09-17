import { describe, it, expect } from "vitest";
import { makeCaptcha } from "./PublicRegister";

describe("makeCaptcha", () => {
  it("should generate a string of exactly 5 characters", () => {
    const captcha = makeCaptcha();
    expect(typeof captcha).toBe("string");
    expect(captcha.length).toBe(5);
  });

  it("should only contain characters from the allowed set", () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const captcha = makeCaptcha();

    for (const char of captcha) {
      expect(chars.includes(char)).toBe(true);
    }
  });

  it("should generate different values on subsequent calls", () => {
    // Note: Due to randomness, there's a very tiny chance this fails,
    // but with 32^5 (33,554,432) combinations, it's statistically negligible.
    const captcha1 = makeCaptcha();
    const captcha2 = makeCaptcha();
    const captcha3 = makeCaptcha();

    expect(captcha1 === captcha2 && captcha2 === captcha3).toBe(false);
  });
});
