import { Modal } from "@components/modal/Modal";
import { useReactFlow } from "@xyflow/react";
import * as React from "react";
import { mutate } from "swr";
import { Network, NetworkResource } from "@/interfaces/Network";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
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

// The networks page's resource modal in pure-data mode (useSave={false}): no API call.
export const DraftResourceEditorModal = () => {
  const { resourceEditor, setResourceEditor } = useDraftMode();
  return (
    <Modal
      open={!!resourceEditor}
      onOpenChange={(open) => !open && setResourceEditor(null)}
    >
      {resourceEditor && (
        // NetworkProvider needs the access-control context above it.
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
      ? // Standalone create: no network yet, assigned later.
        undefined
      : (node?.data as { draftNetwork?: DraftNetworkRef })?.draftNetwork;
  const groupIds =
    (node?.data as { resourceGroupIds?: string[] })?.resourceGroupIds ?? [];

  // API resources are already covered by the modal's own resourceExists check.
  const takenNames = reactFlow
    .getNodes()
    .filter((n) => n.id !== editor.nodeId)
    .map((n) => getDraftResource(n)?.name)
    .filter(Boolean) as string[];

  const onSaved = (result: ResourceModalResult) => {
    // Groups typed into the selector need their own create-group change.
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
      // The node is only born now, on save.
      const nodeId = editor.createInNetworkNodeId
        ? addResourceToFrame(
            editor.createInNetworkNodeId,
            editor.createAt ?? undefined,
          )
        : addDraftResource(editor.createStandaloneAt ?? undefined);
      // The node must be committed to the canvas before saveDraftResource stamps its data.
      if (nodeId) setTimeout(() => save(nodeId), 0);
    } else if (editor.nodeId) {
      save(editor.nodeId);
    }
    onClose();
  };

  // The live single-network view has no frame node, so fall back to the API list by id.
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
          // Nothing told the canvas about the POSTed resource: revalidate, then rebuild.
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
              // Passing a resource makes the modal treat this as an edit.
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
