import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { NetworkResource } from "@/interfaces/Network";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { useDraftGroupActions } from "@/modules/control-center/hooks/useDraftGroupActions";
import { DraftNetworkRef } from "@/modules/control-center/utils/helpers";

/**
 * Per-node draft edits that aren't group or network specific: renaming a
 * placeholder peer or a draft resource, enabling/disabling a resource, and
 * deleting an existing one. Shared by the node context menu and the
 * assistant's `cc_node`, so both write the same canvas state and the same
 * changeset entries.
 */
export function useDraftNodeActions() {
  const reactFlow = useReactFlow();
  const { nodes, setNodes } = useCanvasState();
  const { trackInstallPeer, trackUpdateResource, trackDeleteResource } =
    useDraftChangeset();
  const { syncDraftResource } = useDraftNetworkActions();
  const { removeNodeWithEdges } = useDraftGroupActions();

  // Placeholder names live only on the canvas node — the real name comes from
  // the machine once the peer is installed.
  const renamePlaceholder = useCallback(
    (id: string, name: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, placeholderName: name } }
            : n,
        ),
      );
      // The pending install-peer entry follows the rename.
      const kind = reactFlow
        .getNodes()
        .find((n) => n.id === id)?.data?.placeholderKind as
        | "user-device"
        | "server"
        | "agent"
        | undefined;
      if (kind) {
        trackInstallPeer({ clientId: id.replace("peer-", ""), name, kind });
      }
    },
    [setNodes, reactFlow, trackInstallPeer],
  );

  // Rename a draft resource node (canvas + changeset re-sync for saved ones).
  const renameResource = useCallback(
    (id: string, name: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  resource: {
                    ...(n.data.resource as object),
                    name,
                  },
                },
              }
            : n,
        ),
      );
      setTimeout(() => syncDraftResource(id), 0);
    },
    [setNodes, syncDraftResource],
  );

  // Enable/disable a resource on the canvas (dims the node), mirroring the
  // policy Enable/Disable toggle. For an EXISTING resource it also records an
  // update-resource change so the enabled state deploys.
  const setResourceEnabled = useCallback(
    (id: string, enabled: boolean) => {
      const target = reactFlow.getNodes().find((n) => n.id === id);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, enabled } } : n,
        ),
      );
      // Draft resources carry their enabled state via their create-resource
      // change (re-sync after the canvas update). Existing resources record an
      // update-resource change.
      if (id.startsWith("resource-new-")) {
        setTimeout(() => syncDraftResource(id), 0);
        return;
      }
      const resource = (target?.data as { resource?: NetworkResource })
        ?.resource;
      const net = (target?.data as { draftNetwork?: DraftNetworkRef })
        ?.draftNetwork;
      if (resource?.id && net?.networkId) {
        const groupIds = (
          (resource.groups as (string | { id?: string })[]) ?? []
        )
          .map((g) => (typeof g === "string" ? g : g.id ?? ""))
          .filter(Boolean);
        trackUpdateResource({
          resourceId: resource.id,
          networkId: net.networkId,
          name: resource.name,
          networkName: net.name,
          address: resource.address,
          description: resource.description,
          enabled,
          groupIds,
          // Only `enabled` changes here — the rest mirror the live resource, so
          // toggling back to the original drops the change.
          original: {
            enabled: resource.enabled ?? true,
            name: resource.name,
            address: resource.address,
            description: resource.description,
            groupIds,
          },
        });
      }
    },
    [reactFlow, setNodes, trackUpdateResource, syncDraftResource],
  );

  const isResourceEnabled = useCallback(
    (id: string) =>
      ((nodes.find((n) => n.id === id)?.data as { enabled?: boolean })
        ?.enabled ?? true) as boolean,
    [nodes],
  );

  /**
   * Marks an EXISTING resource for deletion: records the delete-resource
   * change, then takes it off the canvas. The caller owns the confirmation —
   * the menu asks first, the assistant doesn't (nothing is deleted until the
   * draft deploys).
   */
  const deleteResource = useCallback(
    (id: string) => {
      const target = reactFlow.getNodes().find((n) => n.id === id);
      const resource = (target?.data as { resource?: NetworkResource })
        ?.resource;
      const net = (target?.data as { draftNetwork?: DraftNetworkRef })
        ?.draftNetwork;
      if (resource?.id && net?.networkId) {
        trackDeleteResource({
          resourceId: resource.id,
          networkId: net.networkId,
          name: resource.name,
          networkName: net.name,
        });
      }
      removeNodeWithEdges(id);
    },
    [reactFlow, trackDeleteResource, removeNodeWithEdges],
  );

  return {
    renamePlaceholder,
    renameResource,
    setResourceEnabled,
    isResourceEnabled,
    deleteResource,
  };
}
