import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { NetworkResource } from "@/interfaces/Network";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftGroupActions } from "@/modules/control-center/hooks/useDraftGroupActions";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import {
  DraftNetworkRef,
  getResourceDraftGroupIds,
  getResourceLiveBaseline,
  getResourceNodeEnabled,
} from "@/modules/control-center/utils/helpers";

export function useDraftNodeActions() {
  const reactFlow = useReactFlow();
  const { nodes, setNodes } = useCanvasState();
  const { trackInstallPeer, trackUpdateResource, trackDeleteResource } =
    useDraftChangeset();
  const { syncDraftResource } = useDraftNetworkActions();
  const { removeNodeWithEdges } = useDraftGroupActions();

  const renamePlaceholder = useCallback(
    (id: string, name: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, placeholderName: name } }
            : n,
        ),
      );
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

  const setResourceEnabled = useCallback(
    (id: string, enabled: boolean) => {
      const target = reactFlow.getNodes().find((n) => n.id === id);
      const isDraftResource = id.startsWith("resource-new-");
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                data: isDraftResource
                  ? { ...n.data, enabled }
                  : { ...n.data, resourceEnabled: enabled },
              }
            : n,
        ),
      );
      if (isDraftResource) {
        setTimeout(() => syncDraftResource(id), 0);
        return;
      }
      const resource = (target?.data as { resource?: NetworkResource })
        ?.resource;
      const net = (target?.data as { draftNetwork?: DraftNetworkRef })
        ?.draftNetwork;
      if (resource?.id && net?.networkId) {
        // trackUpdateResource replaces the pending change wholesale, so this must
        // carry the CURRENT groups; the live ones would revert a pending edit.
        const groupIds = getResourceDraftGroupIds(target);
        const live = getResourceLiveBaseline(target);
        const originalGroupIds = (
          (live?.groups as (string | { id?: string })[]) ?? []
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
          // Live state, so toggling back to it drops the change. Not `resource`:
          // that already holds any earlier name/address edit.
          original: {
            enabled: live?.enabled ?? true,
            name: live?.name ?? resource.name,
            address: live?.address ?? resource.address,
            description: live?.description,
            groupIds: originalGroupIds,
          },
        });
      }
    },
    [reactFlow, setNodes, trackUpdateResource, syncDraftResource],
  );

  const isResourceEnabled = useCallback(
    (id: string) => getResourceNodeEnabled(nodes.find((n) => n.id === id)),
    [nodes],
  );

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
