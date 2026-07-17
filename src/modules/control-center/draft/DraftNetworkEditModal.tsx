import { Modal } from "@components/modal/Modal";
import { useReactFlow } from "@xyflow/react";
import * as React from "react";
import { Network } from "@/interfaces/Network";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
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
  const { changes } = useDraftChangeset();
  const { renameDraftNetwork } = useDraftNetworkActions();

  const frame = reactFlow.getNodes().find((n) => n.id === networkNodeId);
  const name =
    (frame?.data as { network?: { name?: string } })?.network?.name ?? "";
  // The description lives only in the create-network change.
  const clientId = networkNodeId.replace("network-", "");
  const description = (
    changes.find(
      (c) => c.type === "create-network" && c.clientId === clientId,
    ) as { description?: string } | undefined
  )?.description;

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
