import useFetchApi, { useApiCall } from "@utils/api";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useIsLicensed } from "@/hooks/useIsLicensed";

export interface BypassResponse {
  peer_id: string;
}

const BYPASSED_PATH = "/peers/edr/bypassed";

export const useBypassedPeers = () => {
  // EDR bypass is a licensed feature; the endpoint is not served on
  // open-source deployments, so skip the call there entirely.
  const { isLicensed } = useIsLicensed();
  const { data, isLoading, mutate } = useFetchApi<BypassResponse[]>(
    BYPASSED_PATH,
    true,
    true,
    isLicensed,
  );

  // The endpoint can resolve to a non-array (e.g. an error body) on
  // self-hosted/unlicensed deployments; coerce so `.map` never throws.
  const bypassedPeers = Array.isArray(data) ? data : [];
  const bypassedPeerIds = new Set(bypassedPeers.map((p) => p.peer_id));

  const isBypassed = (peerId: string) => bypassedPeerIds.has(peerId);

  return {
    bypassedPeers,
    bypassedPeerIds,
    isBypassed,
    isLoading,
    mutate,
  };
};

export const useBypass = () => {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const api = useApiCall<BypassResponse>("/peers", true);

  const bypassCompliance = async (peerId: string) => {
    const result = await api.post({}, `/${peerId}/edr/bypass`);
    await mutate("/peers");
    await mutate("/groups");
    await mutate(BYPASSED_PATH);
    return result;
  };

  const revokeBypass = async (peerId: string) => {
    await api.del({}, `/${peerId}/edr/bypass`);
    await mutate("/peers");
    await mutate("/groups");
    await mutate(BYPASSED_PATH);
  };

  const canBypass = permission?.edr?.update && permission?.peers?.update;

  return {
    bypassCompliance,
    revokeBypass,
    canBypass,
  };
};
