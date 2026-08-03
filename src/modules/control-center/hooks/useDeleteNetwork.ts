import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { Network } from "@/interfaces/Network";
import { useDialog } from "@/contexts/DialogProvider";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftGroupActions } from "@/modules/control-center/hooks/useDraftGroupActions";

// Delete a whole EXISTING network: confirm, record the delete-network change
// (its resources/routers cascade server-side), then take the frame off the
// canvas. Draft (not-yet-created) networks are never deleted this way — they
// Remove. Shared by the node context menu and the drill-down header's ⋮ menu
// so both confirm identically and keep the changeset honest.
// Resolves to true when the network was actually marked for deletion (false on
// cancel or a draft/id-less network), so callers can navigate out of a
// drill-down only when the network is really gone.
export function useDeleteNetwork() {
  const reactFlow = useReactFlow();
  const { confirm } = useDialog();
  const { trackDeleteNetwork } = useDraftChangeset();
  const { removeNodeWithEdges } = useDraftGroupActions();

  return useCallback(
    async (nodeId: string): Promise<boolean> => {
      const target = reactFlow.getNodes().find((n) => n.id === nodeId);
      const network = (target?.data as { network?: Network })?.network;
      if (!network?.id) return false;
      const choice = await confirm({
        title: `Delete network “${network.name}”?`,
        description:
          "Its resources and routing peers are removed too. It will be marked for deletion and deleted when you review and deploy.",
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
        dismissOnOutsideClick: true,
      });
      if (!choice) return false;
      trackDeleteNetwork({ networkId: network.id, name: network.name });
      removeNodeWithEdges(nodeId);
      return true;
    },
    [reactFlow, confirm, trackDeleteNetwork, removeNodeWithEdges],
  );
}
