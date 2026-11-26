import { render, renderHook } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { Peer } from "@/interfaces/Peer";
import { usePeerIssueIcon } from "@/modules/peer/PeerIssueIcon";

vi.mock("@components/FullTooltip", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/cloud/edr/PeerDisapprovalReason", () => ({
  PeerDisapprovalReason: () => null,
}));
vi.mock("@/cloud/edr/useBypass", () => ({
  useBypassedPeers: () => ({ isBypassed: () => false }),
}));
vi.mock("@/modules/integrations/edr/useIntegrations", () => ({
  useIntegrations: () => ({
    isAnyIntegrationEnabled: false,
    activeIntegrationName: "",
  }),
}));

const iconFor = (peer: Partial<Peer>) => {
  const { result } = renderHook(() =>
    usePeerIssueIcon({ id: "p1", ...peer } as Peer),
  );
  return render(<>{result.current}</>).container.querySelector("svg");
};

describe("usePeerIssueIcon", () => {
  it("shows a yellow clock for an expired login", () => {
    const icon = iconFor({ login_expired: true });
    expect(icon?.classList.contains("lucide-clock")).toBe(true);
    expect(icon?.classList.contains("text-yellow-400")).toBe(true);
  });

  // An expired login must not hide that the peer is waiting for approval.
  it("keeps the red triangle when approval is also required", () => {
    const icon = iconFor({ login_expired: true, approval_required: true });
    expect(icon?.classList.contains("lucide-clock")).toBe(false);
    expect(icon?.classList.contains("text-red-500")).toBe(true);
  });

  it("shows nothing for a healthy peer", () => {
    expect(iconFor({})).toBeNull();
  });
});
