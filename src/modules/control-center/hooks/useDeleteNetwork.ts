import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSWRConfig } from "swr";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Network } from "@/interfaces/Network";
import { useDialog } from "@/contexts/DialogProvider";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftGroupActions } from "@/modules/control-center/hooks/useDraftGroupActions";

// Delete a whole EXISTING network by its canvas node id. Mode-aware, since a
// draft change and a live change persist completely differently:
//   • Draft — record a delete-network change (its resources/routers cascade)
//     and drop the frame; it applies when the user reviews & deploys.
//   • Live — delete immediately against the account (DELETE /networks/{id},
//     mirroring the networks page). Live changes are NEVER deployed via the
//     changeset, so they must hit the API now.
// Draft (not-yet-created) networks are never deleted this way — they Remove.
// Shared by the node context menu and the top-bar ⋮ menu so both confirm and
// behave identically. Resolves true only when the network was actually deleted
// (false on cancel or a draft/id-less network), so callers can navigate out of
// the just-deleted network's view.
export function useDeleteNetwork() {
  const reactFlow = useReactFlow();
  const { isDraft } = useDraftMode();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const { trackDeleteNetwork } = useDraftChangeset();
  const { removeNodeWithEdges } = useDraftGroupActions();
  const deleteCall = useApiCall("/networks").del;

  return useCallback(
    async (nodeId: string): Promise<boolean> => {
      const target = reactFlow.getNodes().find((n) => n.id === nodeId);
      const network = (target?.data as { network?: Network })?.network;
      if (!network?.id) return false;

      if (isDraft) {
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
      }

      // Live — immediate delete, same confirm copy as the networks page.
      const choice = await confirm({
        title: `Delete network '${network.name}'?`,
        description:
          "Are you sure you want to delete this network? Every resource and routing peer will be removed from this network. This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
      });
      if (!choice) return false;
      // Remove the frame only AFTER the DELETE succeeds — an optimistic remove
      // left the canvas out of sync (frame gone, network still on the account)
      // whenever the request failed, with no rollback.
      const promise = deleteCall({}, `/${network.id}`).then(() => {
        removeNodeWithEdges(nodeId);
        mutate("/networks");
        mutate("/groups");
      });
      notify({
        title: network.name,
        description: "Network deleted successfully.",
        loadingMessage: "Deleting network...",
        promise,
      });
      try {
        await promise;
        return true;
      } catch {
        // The frame stays on the canvas; notify() surfaced the error.
        return false;
      }
    },
    [
      reactFlow,
      isDraft,
      confirm,
      mutate,
      trackDeleteNetwork,
      removeNodeWithEdges,
      deleteCall,
    ],
  );
}
