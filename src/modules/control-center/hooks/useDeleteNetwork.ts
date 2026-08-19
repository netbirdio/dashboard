import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { Network } from "@/interfaces/Network";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftGroupActions } from "@/modules/control-center/hooks/useDraftGroupActions";

// Deletes an EXISTING network by its canvas node id. Draft records a
// delete-network change (resources/routers cascade) applied on review & deploy;
// live deletes immediately (DELETE /networks/{id}) — live changes never go
// through the changeset. Draft not-yet-created networks Remove instead, never
// delete here. Resolves true only when the network was actually deleted, so
// callers can navigate out of its view.
export function useDeleteNetwork() {
  const reactFlow = useReactFlow();
  const { isDraft } = useDraftMode();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const { trackDeleteNetwork } = useDraftChangeset();
  const { removeNodeWithEdges } = useDraftGroupActions();
  const deleteCall = useApiCall("/networks").del;
  const { data: networks } = useFetchApi<Network[]>("/networks");

  return useCallback(
    async (nodeId: string): Promise<boolean> => {
      const target = reactFlow.getNodes().find((n) => n.id === nodeId);
      const network =
        (target?.data as { network?: Network })?.network ??
        networks?.find((n) => `network-${n.id}` === nodeId);
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
      // would desync the canvas (frame gone, network still live) on failure,
      // with no rollback.
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
      networks,
      isDraft,
      confirm,
      mutate,
      trackDeleteNetwork,
      removeNodeWithEdges,
      deleteCall,
    ],
  );
}
