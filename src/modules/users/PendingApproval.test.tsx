import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PendingApproval } from "@/modules/users/PendingApproval";

// The logo is an SVG import vitest does not transform, and it carries no copy
// these tests care about.
vi.mock("@components/NetBirdLogo", () => ({
  NetBirdLogo: () => <div data-testid={"netbird-logo"} />,
}));

// Management names the owner inside the refusal itself. By the time it reaches
// the dashboard it has been lowercased and wrapped by
// NewPermissionValidationError, so both are pinned here.
const withOwner = {
  code: 403,
  message:
    "failed to validate user permissions: user is pending approval by owner ad****n@example.com",
};
const withoutOwner = {
  code: 403,
  message: "failed to validate user permissions: user is pending approval",
};

// The copy is split across elements for styling, so it is read back as one
// whitespace-normalised string.
const copyFor = (error: { code: number; message: string } | null) => {
  const { container } = render(
    <PendingApproval error={error} onRefresh={vi.fn()} onLogout={vi.fn()} />,
  );
  return container.textContent?.replace(/\s+/g, " ").trim() ?? "";
};

afterEach(cleanup);

describe("PendingApproval", () => {
  it("names the owner carried in the refusal message", () => {
    expect(copyFor(withOwner)).toContain(
      "Ask the owner of the account at ad****n@example.com to approve your access.",
    );
  });

  it("asks for the owner without an address when management named none", () => {
    const copy = copyFor(withoutOwner);
    expect(copy).toContain(
      "Ask the owner of the account to approve your access.",
    );
    expect(copy).not.toContain("@example.com");
  });

  it("falls back to the addressless copy when there is no error at all", () => {
    expect(copyFor(null)).toContain(
      "Ask the owner of the account to approve your access.",
    );
  });

  it("states the approval requirement either way", () => {
    expect(copyFor(withOwner)).toContain(
      "Your organization requires new users to be manually approved before joining.",
    );
    cleanup();
    expect(copyFor(withoutOwner)).toContain(
      "Your organization requires new users to be manually approved before joining.",
    );
  });

  it("walks the stepper to the approval step", () => {
    const copy = copyFor(null);
    expect(copy).toContain("Account Created");
    expect(copy).toContain("Waiting for Approval");
    expect(copy).toContain("Join Account");
  });
});
