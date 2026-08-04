import { Modal } from "@components/modal/Modal";
import { useReactFlow } from "@xyflow/react";
import * as React from "react";
import { mutate } from "swr";
import { Network, NetworkResource } from "@/interfaces/Network";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  ResourceEditorState,
  useDraftMode,
} from "@/modules/control-center/draft/DraftModeContext";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import {
  DraftNetworkRef,
  getDraftResource,
} from "@/modules/control-center/utils/helpers";
import { NetworkAccessControlProvider } from "@/modules/networks/NetworkAccessControlProvider";
import { NetworkProvider } from "@/modules/networks/NetworkProvider";
import {
  ResourceModalContent,
  ResourceModalResult,
} from "@/modules/networks/resources/NetworkResourceModal";

// Draft resource editor — the networks page's resource modal in pure-data
// mode (useSave={false}): no API call; data lands on the canvas node and a
// create-resource change. Two modes: edit an existing resource node, or
// CREATE into a frame — the node is only born on save. Parent network is the
// frame, so no network selector.
export const DraftResourceEditorModal = () => {
  const { resourceEditor, setResourceEditor } = useDraftMode();
  return (
    <Modal
      open={!!resourceEditor}
      onOpenChange={(open) => !open && setResourceEditor(null)}
    >
      {resourceEditor && (
        // NetworkProvider needs the access-control context above it (same
        // nesting as the live network page).
        <NetworkAccessControlProvider>
          <NetworkProvider>
            <EditorContent
              editor={resourceEditor}
              onClose={() => setResourceEditor(null)}
            />
          </NetworkProvider>
        </NetworkAccessControlProvider>
      )}
    </Modal>
  );
};

const EditorContent = ({
  editor,
  onClose,
}: {
  editor: ResourceEditorState;
  onClose: () => void;
}) => {
  const reactFlow = useReactFlow();
  const { isDraft } = useDraftMode();
  const { setLayoutInitialized } = useCanvasState();
  const { groups: apiGroups, networks: apiNetworks } = useControlCenterData();
  const { changes, trackCreateGroup } = useDraftChangeset();
  const { saveDraftResource } = useDraftNetworkActions();
  const { addResourceToFrame, addDraftResource } = useDraftNodeCreation();

  const isCreate = !editor.nodeId;
  const node = editor.nodeId
    ? reactFlow.getNodes().find((n) => n.id === editor.nodeId)
    : undefined;
  const frame = editor.createInNetworkNodeId
    ? reactFlow.getNodes().find((n) => n.id === editor.createInNetworkNodeId)
    : undefined;
  // Draft resources carry their data via getDraftResource; existing ones
  // (edited in place) prefill from their real resource on the node.
  const draftResource =
    getDraftResource(node) ??
    (node?.data as { resource?: NetworkResource })?.resource;
  const network: DraftNetworkRef | undefined = editor.createInNetworkNodeId
    ? {
        networkClientId: editor.createInNetworkNodeId.replace("network-", ""),
        name:
          (frame?.data as { network?: { name?: string } })?.network?.name ??
          "",
      }
    : isCreate
      ? // Standalone create — no network yet; assigned later via "No Network".
        undefined
      : (node?.data as { draftNetwork?: DraftNetworkRef })?.draftNetwork;
  const groupIds =
    (node?.data as { resourceGroupIds?: string[] })?.resourceGroupIds ?? [];

  // Other draft resources on the canvas — API resources are covered by the
  // modal's own resourceExists check.
  const takenNames = reactFlow
    .getNodes()
    .filter((n) => n.id !== editor.nodeId)
    .map((n) => getDraftResource(n)?.name)
    .filter(Boolean) as string[];

  const onSaved = (result: ResourceModalResult) => {
    // Groups typed straight into the selector need their create-group
    // change (draft groups are referenced by name).
    result.groups.forEach((g) => {
      if (g.id) return;
      const exists = changes.some(
        (c) => c.type === "create-group" && c.name === g.name,
      );
      if (!exists) {
        trackCreateGroup({ clientId: `group-new-${g.name}`, name: g.name });
      }
    });

    const save = (nodeId: string) =>
      saveDraftResource({
        nodeId,
        name: result.name,
        address: result.address,
        description: result.description || undefined,
        groupIds: result.groups.map((g) => g.id ?? g.name),
        network: network ?? { name: "" },
      });

    if (isCreate) {
      // The node is only born now, on save — into its frame, or standalone at
      // the drop/click position (a plain "No Network" card until assigned).
      const nodeId = editor.createInNetworkNodeId
        ? addResourceToFrame(editor.createInNetworkNodeId)
        : addDraftResource(editor.createStandaloneAt ?? undefined);
      // Next tick — the freshly created node must be committed to the
      // canvas before saveDraftResource stamps its data.
      if (nodeId) setTimeout(() => save(nodeId), 0);
    } else if (editor.nodeId) {
      save(editor.nodeId);
    }
    onClose();
  };

  // LIVE mode: the frame's "Add Resource" creates against the REAL network
  // (the modal's own save POSTs); mutate lands via SWR revalidation. The live
  // single-network view has no frame node (it lays resources out directly), so
  // fall back to the real network from the API list by id — same fallback the
  // network edit modal uses.
  if (!isDraft && editor.createInNetworkNodeId) {
    const liveNetworkId = editor.createInNetworkNodeId.replace("network-", "");
    const liveNetwork =
      (frame?.data as { network?: Network })?.network ??
      apiNetworks?.find((n) => n.id === liveNetworkId);
    if (!liveNetwork?.id) return null;
    return (
      <ResourceModalContent
        network={liveNetwork}
        onCreated={async () => {
          // The modal POSTed the resource against the real network. Nothing
          // has told the canvas yet: revalidate the network + resource lists,
          // then force the live view to rebuild (the init effect is gated on
          // layoutInitialized) so the new resource appears. Same rebuild
          // drilling in/out triggers, which is why it only showed after
          // navigating. Await the mutations first so the rebuild reads the
          // fresh data.
          await Promise.all([
            mutate("/networks"),
            mutate("/networks/resources"),
            mutate("/groups"),
          ]);
          setLayoutInitialized(false);
          onClose();
        }}
      />
    );
  }

  return (
    <ResourceModalContent
      network={{ id: "", name: network?.name ?? "" } as Network}
      resource={
        isCreate
          ? undefined
          : ({
              // The modal treats this as "edit" — fields prefill from the node.
              id: draftResource?.id ?? "",
              name: draftResource?.name ?? "",
              description: draftResource?.description ?? "",
              address: draftResource?.address ?? "",
              enabled: true,
              groups: groupIds.map(
                (idOrName) =>
                  apiGroups?.find((g) => g.id === idOrName) ?? {
                    name: idOrName,
                  },
              ),
            } as NetworkResource)
      }
      useSave={false}
      takenNames={takenNames}
      onSaved={onSaved}
    />
  );
};
