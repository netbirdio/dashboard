import { describe, expect, it } from "vitest";
import {
  asksOnlyForPassword,
  parseVNCRejection,
  VNCRejectCode,
} from "./useVNC";

describe("parseVNCRejection", () => {
  it("maps a known code to its friendly message", () => {
    const err = parseVNCRejection("APPROVAL_DENIED: user said no");

    expect(err.code).toBe(VNCRejectCode.APPROVAL_DENIED);
    expect(err.message).toBe("user said no");
    expect(err.friendly).toMatch(/declined/);
  });

  it("names the approval timeout and unavailable codes instead of echoing them", () => {
    const timeout = parseVNCRejection("APPROVAL_TIMEOUT: approval timed out");
    const unavailable = parseVNCRejection(
      "APPROVAL_UNAVAILABLE: no approval prompt reached the user",
    );

    expect(timeout.code).toBe(VNCRejectCode.APPROVAL_TIMEOUT);
    expect(timeout.friendly).not.toContain("APPROVAL_TIMEOUT");
    expect(unavailable.code).toBe(VNCRejectCode.APPROVAL_UNAVAILABLE);
    expect(unavailable.friendly).not.toContain("APPROVAL_UNAVAILABLE");
  });

  it("passes a message from another server through unchanged", () => {
    expect(parseVNCRejection("Authentication failed")).toEqual({
      message: "Authentication failed",
      friendly: "Authentication failed",
    });
  });

  it("does not treat an unknown prefix as a code", () => {
    expect(parseVNCRejection("SOMETHING_ELSE: nope").code).toBeUndefined();
  });
});

describe("asksOnlyForPassword", () => {
  it("accepts the classic password prompt", () => {
    expect(asksOnlyForPassword(["password"])).toBe(true);
    expect(asksOnlyForPassword(undefined)).toBe(true);
  });

  it("refuses a request that also wants a username, which would loop", () => {
    expect(asksOnlyForPassword(["username", "password"])).toBe(false);
  });

  it("refuses a request for something other than a password", () => {
    expect(asksOnlyForPassword(["target"])).toBe(false);
    expect(asksOnlyForPassword([])).toBe(false);
  });
});
