import useFetchApi from "@utils/api";
import { ExitNode } from "@/interfaces/ExitNode";
import { getPeerExitNode } from "@/modules/exit-nodes/exitNodeHelpers";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

/**
 * The exit node a peer belongs to, for pages outside Exit Nodes (the peers
 * table, the peer page). Fetched only for callers that can read exit nodes.
 */
export const usePeerExitNode = (peerId?: string) => {
  const canRead = !!useExitNodePermissions()?.read;
  const { data: exitNodes, isLoading } = useFetchApi<ExitNode[]>(
    "/exit-nodes",
    true,
    true,
    canRead && !!peerId,
  );
  return {
    exitNode: getPeerExitNode(exitNodes, peerId),
    isLoading,
  };
};
