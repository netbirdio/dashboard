export type OnboardingPollState = {
  isNetworks: boolean;
  hasFirstDevice: boolean;
  hasSecondDevice: boolean;
  hasRoutingPeer: boolean;
  step: number;
};

/**
 * Whether onboarding keeps refreshing /peers and /groups. On the networks
 * path a second peer can be the routing peer before the router lookup has
 * resolved it, so only the resolved routing peer ends the wait there.
 */
export const shouldPollOnboardingPeers = ({
  isNetworks,
  hasFirstDevice,
  hasSecondDevice,
  hasRoutingPeer,
  step,
}: OnboardingPollState): boolean => {
  if (step !== 3 && step !== 4 && step !== 5) return false;
  if (!hasFirstDevice) return true;
  if (isNetworks) return !hasRoutingPeer;
  return !hasSecondDevice && !hasRoutingPeer;
};
