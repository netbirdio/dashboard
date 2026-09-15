import { resolveRefusedUser } from "@utils/user-status";
import { describe, expect, it } from "vitest";

// What each management version returns for a user awaiting approval.
const blocked = { code: 403, message: "user is blocked" };
const listPending = {
  code: 403,
  message: "failed to validate user permissions: user is pending approval",
};
const currentPendingNamed = {
  code: 403,
  message:
    "failed to validate user permissions: user is pending approval by owner ma****k@acme-corp.com",
};

const settled = { isCurrentLoading: false, isListLoading: false };

describe("resolveRefusedUser", () => {
  it("prefers the response that names the owner", () => {
    const refusal = resolveRefusedUser({
      currentError: currentPendingNamed,
      listError: listPending,
      ...settled,
    });
    expect(refusal).toEqual({ kind: "pending", error: currentPendingNamed });
  });

  it("falls back to the list on management that reports pending as blocked", () => {
    const refusal = resolveRefusedUser({
      currentError: blocked,
      listError: listPending,
      ...settled,
    });
    expect(refusal).toEqual({ kind: "pending", error: listPending });
  });

  // The blocked branch used to conclude here, sending a pending user to the
  // blocked screen because the one response that says otherwise had not landed.
  it("waits for the list rather than concluding blocked while it is in flight", () => {
    const refusal = resolveRefusedUser({
      currentError: blocked,
      listError: undefined,
      isCurrentLoading: false,
      isListLoading: true,
    });
    expect(refusal).toEqual({ kind: "undecided" });
  });

  it("waits for the named response rather than settling for the list", () => {
    const refusal = resolveRefusedUser({
      currentError: undefined,
      listError: listPending,
      isCurrentLoading: true,
      isListLoading: false,
    });
    expect(refusal).toEqual({ kind: "undecided" });
  });

  it("routes a genuinely blocked user once both have settled", () => {
    const refusal = resolveRefusedUser({
      currentError: blocked,
      listError: blocked,
      ...settled,
    });
    expect(refusal).toEqual({ kind: "blocked", error: blocked });
  });

  it("leaves an unrefused user alone", () => {
    expect(resolveRefusedUser({ ...settled })).toEqual({ kind: "undecided" });
  });
});
