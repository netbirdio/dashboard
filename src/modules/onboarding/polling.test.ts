import { describe, expect, it } from "vitest";
import { shouldPollOnboardingPeers } from "@/modules/onboarding/polling";

const base = {
  isNetworks: true,
  hasFirstDevice: true,
  hasSecondDevice: false,
  hasRoutingPeer: false,
  step: 4,
};

describe("shouldPollOnboardingPeers", () => {
  it("keeps polling on the networks path with peers [U, R] until the routing peer resolves", () => {
    // R is picked up as the second device while the router lookup is pending,
    // so its routing-group membership still needs refreshing.
    expect(shouldPollOnboardingPeers({ ...base, hasSecondDevice: true })).toBe(
      true,
    );
    expect(
      shouldPollOnboardingPeers({
        ...base,
        hasSecondDevice: true,
        hasRoutingPeer: true,
      }),
    ).toBe(false);
  });

  it("stops on the p2p path once both devices are present", () => {
    const p2p = { ...base, isNetworks: false };
    expect(shouldPollOnboardingPeers(p2p)).toBe(true);
    expect(shouldPollOnboardingPeers({ ...p2p, hasSecondDevice: true })).toBe(
      false,
    );
  });

  it("polls while the first device is missing and only on the waiting steps", () => {
    expect(shouldPollOnboardingPeers({ ...base, hasFirstDevice: false })).toBe(
      true,
    );
    expect(shouldPollOnboardingPeers({ ...base, step: 2 })).toBe(false);
    expect(shouldPollOnboardingPeers({ ...base, step: 6 })).toBe(false);
  });
});
