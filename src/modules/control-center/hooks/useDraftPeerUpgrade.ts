import { useCallback, useEffect, useMemo, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { mutate } from "swr";
import { Peer } from "@/interfaces/Peer";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { usePlaceholderArtifacts } from "@/modules/control-center/hooks/usePlaceholderArtifacts";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  draftUid,
  getPlaceholderPeer,
} from "@/modules/control-center/utils/helpers";

export type PlaceholderUpgrade = {
  // Canvas node id being replaced (peer-draft-… or peer-<oldPeerId>).
  nodeId: string;
  peer: Peer;
};

// Swaps placeholders for real peers in place, re-recording the draft policies
// that referenced the old ids so they become deployable.
export function usePlaceholderUpgrade() {
  const reactFlow = useReactFlow();
  const { updateDraftPolicy } = useControlCenterPolicy();
  const { replacePeerIdInGroups, trackCreateRouter, markInstallPeerInstalled } =
    useDraftChangeset();

  return useCallback(
    (upgrades: PlaceholderUpgrade[]) => {
      if (upgrades.length === 0) return;
      const withOldIds = upgrades.map((u) => ({
        ...u,
        oldId: u.nodeId.replace("peer-", ""),
      }));

      withOldIds.forEach((u) =>
        markInstallPeerInstalled(u.oldId, {
          id: u.peer.id as string,
          name: u.peer.name,
        }),
      );

      // Read pre-swap: edge sources still carry the old node ids.
      const routerEdges = reactFlow
        .getEdges()
        .filter((e) => (e.data as { router?: boolean })?.router);
      withOldIds.forEach((u) => {
        routerEdges
          .filter((e) => e.source === u.nodeId)
          .forEach((e) => {
            const networkNode = reactFlow
              .getNodes()
              .find((n) => n.id === e.target);
            const network = (
              networkNode?.data as { network?: { id?: string; name: string } }
            )?.network;
            if (!networkNode || !network) return;
            trackCreateRouter({
              clientId: `new-${draftUid()}`,
              networkId: network.id,
              networkClientId: network.id
                ? undefined
                : networkNode.id.replace("network-", ""),
              networkName: network.name,
              peerId: u.peer.id as string,
              peerName: u.peer.name,
            });
          });
      });

      reactFlow.setNodes((prev) =>
        prev.map((n) => {
          const up = withOldIds.find((u) => u.nodeId === n.id);
          if (up) {
            return {
              ...n,
              id: `peer-${up.peer.id}`,
              data: {
                peer: up.peer,
                enabled: true,
                showHandles: true,
                variant: "card",
              },
            };
          }
          const members = n.data?.addedMembers as Set<string> | undefined;
          const held = n.data?.draftPeers as Peer[] | undefined;
          const heldHits =
            held?.some((p) => withOldIds.some((u) => u.oldId === p.id)) ??
            false;
          const memberHits = members
            ? withOldIds.filter((u) => members.has(u.oldId))
            : [];
          if (memberHits.length > 0 || heldHits) {
            const next = new Set(members ?? []);
            memberHits.forEach((u) => {
              next.delete(u.oldId);
              next.add(u.peer.id as string);
            });
            return {
              ...n,
              data: {
                ...n.data,
                addedMembers: next,
                // The real peer is in the API list now; drop the held draft.
                ...(heldHits
                  ? {
                      draftPeers: held!.filter(
                        (p) => !withOldIds.some((u) => u.oldId === p.id),
                      ),
                    }
                  : {}),
              },
            };
          }
          return n;
        }),
      );

      withOldIds.forEach((u) =>
        replacePeerIdInGroups(u.oldId, u.peer.id as string),
      );
      reactFlow.setEdges((prev) =>
        prev.map((e) => {
          const bySource = withOldIds.find((u) => u.nodeId === e.source);
          const byTarget = withOldIds.find((u) => u.nodeId === e.target);
          if (!bySource && !byTarget) return e;
          return {
            ...e,
            source: bySource ? `peer-${bySource.peer.id}` : e.source,
            target: byTarget ? `peer-${byTarget.peer.id}` : e.target,
          };
        }),
      );

      const policyUpdates: Policy[] = [];
      reactFlow.getNodes().forEach((n) => {
        const policy = (n.data as { policy?: Policy })?.policy;
        const rule = policy?.rules?.[0];
        if (!policy || !rule) return;
        let changed = false;
        const remap = (
          r?: PolicyRuleResource,
        ): PolicyRuleResource | undefined => {
          const up = r && withOldIds.find((u) => u.oldId === r.id);
          if (!up) return r;
          changed = true;
          return { ...r, id: up.peer.id as string };
        };
        const sourceResource = remap(rule.sourceResource);
        const destinationResource = remap(rule.destinationResource);
        if (!changed) return;
        policyUpdates.push({
          ...policy,
          rules: [
            { ...rule, sourceResource, destinationResource },
            ...(policy.rules?.slice(1) ?? []),
          ],
        });
      });
      if (policyUpdates.length > 0) {
        // The node swap must commit before the policy edges are rebuilt on it.
        setTimeout(() => policyUpdates.forEach((p) => updateDraftPolicy(p)), 0);
      }
    },
    [
      reactFlow,
      updateDraftPolicy,
      replacePeerIdInGroups,
      trackCreateRouter,
      markInstallPeerInstalled,
    ],
  );
}

// Upgrades a placeholder in place once its installed machine registers.
export function useDraftPeerUpgrade() {
  const { isDraft } = useDraftMode();
  const { nodes } = useCanvasState();
  const { peers } = useControlCenterData();
  const upgrade = usePlaceholderUpgrade();
  const deleteArtifacts = usePlaceholderArtifacts();
  // State lands asynchronously, so the re-running effect must not upgrade twice.
  const upgraded = useRef(new Set<string>());
  // Placeholders whose artifacts were already scheduled for deletion.
  const cleaned = useRef(new Set<string>());

  useEffect(() => {
    if (!isDraft || !peers?.length) return;

    const onCanvas = new Set(nodes.map((n) => n.id));
    const upgrades: PlaceholderUpgrade[] = [];
    // The bound group + setup key only existed to find the peer.
    const artifactsToDelete: {
      nodeId: string;
      boundGroupId?: string;
      setupKeyId?: string;
    }[] = [];

    const findMatch = (installHostname: string) =>
      peers.find(
        (p) =>
          (p.hostname === installHostname || p.name === installHostname) &&
          !onCanvas.has(`peer-${p.id}`),
      );

    // The setup key auto-assigns a unique bound group, so the registering peer
    // is the only new peer in it.
    const findByGroup = (groupId: string) =>
      peers.find(
        (p) =>
          p.groups?.some((g) => g.id === groupId) &&
          !onCanvas.has(`peer-${p.id}`),
      );

    nodes.forEach((node) => {
      const data = node.data as {
        placeholderKind?: string;
        installHostname?: string;
        boundGroupId?: string;
        setupKeyId?: string;
        peer?: Peer;
        draftPeers?: (Peer & {
          installHostname?: string;
          boundGroupId?: string;
          setupKeyId?: string;
        })[];
      };

      // Placeholders absorbed into a group ride on the group node.
      data?.draftPeers?.forEach((p) => {
        if (!p.id) return;
        const pseudoNodeId = `peer-${p.id}`;
        if (upgraded.current.has(pseudoNodeId)) return;
        const match =
          (p.boundGroupId ? findByGroup(p.boundGroupId) : undefined) ??
          (p.installHostname ? findMatch(p.installHostname) : undefined);
        if (!match?.id) return;
        upgraded.current.add(pseudoNodeId);
        upgrades.push({ nodeId: pseudoNodeId, peer: match });
        if (
          (p.boundGroupId || p.setupKeyId) &&
          !cleaned.current.has(pseudoNodeId)
        ) {
          cleaned.current.add(pseudoNodeId);
          artifactsToDelete.push({
            nodeId: pseudoNodeId,
            boundGroupId: p.boundGroupId,
            setupKeyId: p.setupKeyId,
          });
        }
      });

      if (!data?.placeholderKind || data.peer) return;
      if (upgraded.current.has(node.id)) return;
      const match =
        (data.boundGroupId ? findByGroup(data.boundGroupId) : undefined) ??
        (data.installHostname ? findMatch(data.installHostname) : undefined);
      if (!match?.id) return;
      upgraded.current.add(node.id);
      upgrades.push({ nodeId: node.id, peer: match });
      if (
        (data.boundGroupId || data.setupKeyId) &&
        !cleaned.current.has(node.id)
      ) {
        cleaned.current.add(node.id);
        artifactsToDelete.push({
          nodeId: node.id,
          boundGroupId: data.boundGroupId,
          setupKeyId: data.setupKeyId,
        });
      }
    });

    upgrade(upgrades);
    artifactsToDelete.forEach(({ boundGroupId, setupKeyId }) =>
      deleteArtifacts({ boundGroupId, setupKeyId }),
    );
  }, [isDraft, peers, nodes, upgrade, deleteArtifacts]);

  // Waiting = a setup key was generated but the peer hasn't registered yet.
  const hasWaitingInstall = useMemo(
    () =>
      nodes.some((n) => {
        const d = n.data as {
          boundGroupId?: string;
          setupKeyId?: string;
          draftPeers?: { boundGroupId?: string; setupKeyId?: string }[];
        };
        if (getPlaceholderPeer(n) && (d?.boundGroupId || d?.setupKeyId)) {
          return true;
        }
        return (d?.draftPeers ?? []).some(
          (p) => p?.boundGroupId || p?.setupKeyId,
        );
      }),
    [nodes],
  );

  // SWR only revalidates /peers on focus/reconnect, so poll while one waits.
  useEffect(() => {
    if (!isDraft || !hasWaitingInstall) return;
    const id = window.setInterval(() => void mutate("/peers"), 5000);
    return () => window.clearInterval(id);
  }, [isDraft, hasWaitingInstall]);
}
