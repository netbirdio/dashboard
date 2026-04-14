import useFetchApi from "@utils/api";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";

export const usePeerVNCPolicyCheck = (peer?: Peer) => {
  const { data: policies, isLoading } = useFetchApi<Policy[]>(
    "/policies",
    true,
    false,
  );
  const peerGroupIds = peer?.groups?.map((p) => p.id);

  const peerPolicies = policies?.filter((policy) => {
    if (!policy?.enabled) return false;

    const rule = policy?.rules?.[0];
    if (!rule) return false;

    // Only match VNC protocol policies
    if (rule.protocol !== "netbird-vnc") return false;

    const isPeerInDestinationResource =
      rule.destinationResource?.id === peer?.id;
    const isPeerInDestinationGroup =
      rule.destinations?.some((group) => {
        const groupId = typeof group === "string" ? group : group?.id;
        return peerGroupIds?.includes(groupId);
      }) ?? false;

    const isPeerInDestination =
      isPeerInDestinationResource || isPeerInDestinationGroup;

    let isPeerInSource = false;
    if (rule.bidirectional) {
      const isPeerInSourceResource = rule.sourceResource?.id === peer?.id;
      const isPeerInSourceGroup =
        rule.sources?.some((group) => {
          const groupId = typeof group === "string" ? group : group?.id;
          return peerGroupIds?.includes(groupId);
        }) ?? false;

      isPeerInSource = isPeerInSourceResource || isPeerInSourceGroup;
    }

    return isPeerInDestination || isPeerInSource;
  });

  const hasVNCPolicy = (peerPolicies?.length ?? 0) > 0;
  const isVNCEnabled = !!peer?.local_flags?.server_vnc_allowed;
  const showVNCPolicyInfo = !hasVNCPolicy && !isLoading && isVNCEnabled;

  return {
    peerPolicies,
    isCheckLoading: isLoading,
    hasVNCPolicy,
    showVNCPolicyInfo,
  };
};
