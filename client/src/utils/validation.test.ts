import { describe, expect, it } from "vitest";
import { isNonEmpty, isValidEmail } from "./validation";

describe("isValidEmail", () => {
  it("accepts a well-formed address", () => {
    expect(isValidEmail("jane@example.com")).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isValidEmail("  jane@example.com  ")).toBe(true);
  });

  it.each(["", "jane", "jane@", "jane@com", "jane @example.com", "@example.com"])(
    "rejects %j",
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    }
  );
});

describe("isNonEmpty", () => {
  it("is true for real content", () => {
    expect(isNonEmpty("Acme")).toBe(true);
  });

  it("is false for empty or whitespace-only strings", () => {
    expect(isNonEmpty("")).toBe(false);
    expect(isNonEmpty("   ")).toBe(false);
  });
});
