import { describe, expect, it, vi } from "vitest";
import { RefusalKind, resolveRefusedUser } from "@/contexts/UsersProvider";

// Importing the provider pulls in the runtime config and, through the pending
// screen, an SVG import vitest does not transform. Neither reaches the pure
// decision under test.
vi.mock("@utils/config", () => ({ default: () => ({}) }));
vi.mock("@components/NetBirdLogo", () => ({ NetBirdLogo: () => null }));

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
    expect(
      resolveRefusedUser({
        currentError: currentPendingNamed,
        listError: listPending,
        ...settled,
      }),
    ).toEqual({
      kind: RefusalKind.PendingApproval,
      error: currentPendingNamed,
    });
  });

  it("falls back to the list on management that reports pending as blocked", () => {
    expect(
      resolveRefusedUser({
        currentError: blocked,
        listError: listPending,
        ...settled,
      }),
    ).toEqual({ kind: RefusalKind.PendingApproval, error: listPending });
  });

  // The blocked branch used to conclude here, sending a user awaiting approval
  // to the blocked screen because the response saying otherwise had not landed.
  it("waits for the list rather than concluding blocked while it is in flight", () => {
    expect(
      resolveRefusedUser({
        currentError: blocked,
        isCurrentLoading: false,
        isListLoading: true,
      }),
    ).toBeUndefined();
  });

  it("waits for the named response rather than settling for the list", () => {
    expect(
      resolveRefusedUser({
        listError: listPending,
        isCurrentLoading: true,
        isListLoading: false,
      }),
    ).toBeUndefined();
  });

  it("routes a genuinely blocked user once both have settled", () => {
    expect(
      resolveRefusedUser({
        currentError: blocked,
        listError: blocked,
        ...settled,
      }),
    ).toEqual({ kind: RefusalKind.Blocked, error: blocked });
  });

  it("leaves an unrefused user alone", () => {
    expect(resolveRefusedUser({ ...settled })).toBeUndefined();
  });
});
