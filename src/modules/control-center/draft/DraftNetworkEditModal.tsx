import { Modal } from "@components/modal/Modal";
import { useReactFlow } from "@xyflow/react";
import * as React from "react";
import { Network } from "@/interfaces/Network";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { NetworkModalContent } from "@/modules/networks/NetworkModal";

// Draft network editor — the networks page's network modal in pure-data mode
// (useSave={false}): name + description land on the draft network (canvas
// node, create-network change, and every reference via renameDraftNetwork).
// Opened from the node context menu's Edit and the drill-down header.
export const DraftNetworkEditModal = () => {
  const { networkEditor, setNetworkEditor } = useDraftMode();
  return (
    <Modal
      open={!!networkEditor}
      onOpenChange={(open) => !open && setNetworkEditor(null)}
    >
      {networkEditor && (
        <EditorContent
          networkNodeId={networkEditor.networkNodeId}
          onClose={() => setNetworkEditor(null)}
        />
      )}
    </Modal>
  );
};

const EditorContent = ({
  networkNodeId,
  onClose,
}: {
  networkNodeId: string;
  onClose: () => void;
}) => {
  const reactFlow = useReactFlow();
  const { changes, trackUpdateNetwork } = useDraftChangeset();
  const { renameDraftNetwork } = useDraftNetworkActions();
  const { networks } = useControlCenterData();

  const frame = reactFlow.getNodes().find((n) => n.id === networkNodeId);
  // The description lives only in the create-network change.
  const clientId = networkNodeId.replace("network-", "");
  // The live single-network view has no frame node (it lays resources out
  // directly), so fall back to the real network from the API list by id.
  const network =
    (frame?.data as { network?: Network })?.network ??
    networks?.find((n) => n.id === clientId);
  const name = network?.name ?? "";
  const description = (
    changes.find(
      (c) => c.type === "create-network" && c.clientId === clientId,
    ) as { description?: string } | undefined
  )?.description;

  // EXISTING networks are edited as a draft change (update-network) — no live
  // PUT; it deploys with the rest of the changeset. The frame's label follows
  // the pending rename immediately so the canvas reflects the edit.
  if (network?.id) {
    const existing = network;
    return (
      <NetworkModalContent
        network={existing}
        useSave={false}
        onSaved={(values) => {
          if (frame) {
            reactFlow.setNodes((prev) =>
              prev.map((n) =>
                n.id === networkNodeId
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        network: {
                          ...existing,
                          name: values.name,
                          description: values.description,
                        },
                      },
                    }
                  : n,
              ),
            );
          }
          trackUpdateNetwork({
            networkId: existing.id,
            name: values.name,
            originalName: existing.name,
            description: values.description,
            originalDescription: existing.description,
          });
          onClose();
        }}
      />
    );
  }

  return (
    <NetworkModalContent
      network={{ id: "", name, description } as Network}
      useSave={false}
      onSaved={(values) => {
        if (frame) renameDraftNetwork(frame, values.name, values.description);
        onClose();
      }}
    />
  );
};
