import { Modal } from "@components/modal/Modal";
import { useReactFlow } from "@xyflow/react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { Network } from "@/interfaces/Network";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { NetworkModalContent } from "@/modules/networks/NetworkModal";

// The networks page's modal in pure-data mode (useSave={false}): name and
// description land on the draft network instead of hitting the API.
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
  const { isDraft } = useDraftMode();
  const { mutate } = useSWRConfig();
  const { changes, trackUpdateNetwork } = useDraftChangeset();
  const { renameDraftNetwork } = useDraftNetworkActions();
  const { networks } = useControlCenterData();

  const frame = reactFlow.getNodes().find((n) => n.id === networkNodeId);
  // The description lives only in the create-network change.
  const clientId = networkNodeId.replace("network-", "");
  // The live single-network view has no frame node, so fall back to the API list.
  const network =
    (frame?.data as { network?: Network })?.network ??
    networks?.find((n) => n.id === clientId);
  const name = network?.name ?? "";
  const description = (
    changes.find(
      (c) => c.type === "create-network" && c.clientId === clientId,
    ) as { description?: string } | undefined
  )?.description;

  if (network?.id) {
    const existing = network;
    // Patch the frame in place so the canvas reflects the edit immediately.
    const patchFrame = (name: string, description?: string) => {
      if (!frame) return;
      reactFlow.setNodes((prev) =>
        prev.map((n) =>
          n.id === networkNodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  network: { ...existing, name, description },
                },
              }
            : n,
        ),
      );
    };

    // Live changes are never deployed via the changeset, so they must hit the
    // API now.
    if (!isDraft) {
      return (
        <NetworkModalContent
          network={existing}
          onUpdated={(updated) => {
            patchFrame(updated.name, updated.description);
            mutate("/networks");
            onClose();
          }}
        />
      );
    }

    return (
      <NetworkModalContent
        network={existing}
        useSave={false}
        onSaved={(values) => {
          patchFrame(values.name, values.description);
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
