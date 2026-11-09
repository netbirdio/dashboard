import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openDuplicatePolicyModal = vi.fn();
let canCreate = true;

vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({
    permission: {
      policies: { create: canCreate, read: true, update: true, delete: true },
    },
  }),
}));
vi.mock("@/contexts/PoliciesProvider", () => ({
  usePolicies: () => ({
    openDuplicatePolicyModal,
    deletePolicy: vi.fn(),
    updatePolicy: vi.fn(),
    serializeRules: vi.fn(),
  }),
}));
vi.mock("@/contexts/DialogProvider", () => ({
  useDialog: () => ({ confirm: vi.fn() }),
}));

const { default: AccessControlActionCell } = await import(
  "@/modules/access-control/table/AccessControlActionCell"
);

const policy = {
  id: "pol-1",
  name: "Devs to Servers",
  description: "",
  enabled: true,
  source_posture_checks: [],
  rules: [],
};

// openMenu opens the row's actions menu the way Radix listens for it.
const openMenu = () =>
  fireEvent.pointerDown(screen.getByTestId("policy-actions"), {
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
  });

beforeEach(() => {
  openDuplicatePolicyModal.mockReset();
  canCreate = true;
});
afterEach(cleanup);

describe("AccessControlActionCell", () => {
  it("opens the duplicate modal for the row's policy", () => {
    render(<AccessControlActionCell policy={policy} />);
    openMenu();
    fireEvent.click(screen.getByTestId("duplicate-policy"));

    expect(openDuplicatePolicyModal).toHaveBeenCalledWith(policy);
  });

  it("disables Duplicate without permission to create policies", () => {
    canCreate = false;
    render(<AccessControlActionCell policy={policy} />);
    openMenu();

    // A disabled item takes no pointer events in the browser (jsdom does not
    // apply the CSS), so the disabled state is what keeps it from opening.
    const item = screen.getByTestId("duplicate-policy");
    expect(item.hasAttribute("data-disabled")).toBe(true);
  });
});
