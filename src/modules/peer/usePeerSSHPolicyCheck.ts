import useFetchApi from "@utils/api";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { isNativeSSHSupported } from "@utils/version";

export const usePeerSSHPolicyCheck = (peer?: Peer) => {
  const { data: policies, isLoading } = useFetchApi<Policy[]>(
    "/policies",
    true,
    false,
  );
  const peerGroupIds = peer?.groups?.map((p) => p.id);

  const peerPolicies = policies?.filter((policy) => {
    // Skip disabled policies
    if (!policy?.enabled) return false;

    const rule = policy?.rules?.[0];
    if (!rule) return false;

    // Skip icmp and udp
    if (rule.protocol === "icmp" || rule.protocol === "udp") return false;

    // Check resource and groups
    const isPeerInDestinationResource =
      rule.destinationResource?.id === peer?.id;
    const isPeerInDestinationGroup =
      rule.destinations?.some((group) => {
        const groupId = typeof group === "string" ? group : group?.id;
        return peerGroupIds?.includes(groupId);
      }) ?? false;

    const isPeerInDestination =
      isPeerInDestinationResource || isPeerInDestinationGroup;

    // If bidirectional, also check if peer is in source
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

    const isInSourceOrDestination = isPeerInDestination || isPeerInSource;
    if (!isInSourceOrDestination) return false;

    if (rule.protocol === "all") return true;

    // Check ports
    const hasNoPortRestrictions = rule.ports === undefined;
    const hasExplicitPort22 = rule.ports?.includes("22");
    const hasPort22InRange = rule.port_ranges?.some(
      (range) => 22 >= range.start && 22 <= range.end,
    );

    return hasNoPortRestrictions || hasExplicitPort22 || hasPort22InRange;
  });

  const hasSSHPolicy = (peerPolicies?.length ?? 0) > 0;
  const showSSHPolicyInfo =
    !hasSSHPolicy &&
    !isLoading &&
    !!peer?.ssh_enabled &&
    isNativeSSHSupported(peer.version);

  return {
    peerPolicies,
    isCheckLoading: isLoading,
    hasSSHPolicy,
    showSSHPolicyInfo,
  };
};
