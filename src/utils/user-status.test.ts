import { isBlockedError, isPendingApprovalError } from "@utils/user-status";
import { describe, expect, it } from "vitest";

// What each management version returns for a user awaiting approval.
const oldCurrent = "user is blocked";
const oldList = "failed to validate user permissions: user is pending approval";
const newCurrent =
  "failed to validate user permissions: user is pending approval by owner ma****k@acme-corp.com";
const genuinelyBlocked = "user is blocked";

const pick = (current: string, list: string) =>
  isPendingApprovalError(current)
    ? "pending:current"
    : isPendingApprovalError(list)
    ? "pending:list"
    : isBlockedError(current) || isBlockedError(list)
    ? "blocked"
    : "none";

describe("which screen a refused user gets", () => {
  it("names the owner on current management", () => {
    expect(pick(newCurrent, oldList)).toBe("pending:current");
  });
  it("still reaches the pending screen on older management", () => {
    expect(pick(oldCurrent, oldList)).toBe("pending:list");
  });
  it("sends a genuinely blocked user to the error page", () => {
    expect(pick(genuinelyBlocked, genuinelyBlocked)).toBe("blocked");
  });
});
