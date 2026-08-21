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
  // Canvas node id being replaced (peer-draft-… or, on re-selection of a
  // user-device select node, peer-<oldPeerId>).
  nodeId: string;
  peer: Peer;
};

// Swaps placeholder/select peer nodes for real peers in place — same
// position, edges rewired to the new id — and re-records every draft policy
// referencing the old ids with the real peer id (making those policies
// deployable, so they enter the changeset). User-device select nodes keep
// their dropdown (placeholderKind stays on the node); installed server/agent
// placeholders become regular peer cards.
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

      // The peer now exists (installed / selected) — its pending
      // install-peer step is done.
      withOldIds.forEach((u) =>
        markInstallPeerInstalled(u.oldId, {
          id: u.peer.id as string,
          name: u.peer.name,
        }),
      );

      // Routing edges from upgraded placeholders become deployable — record
      // their create-router changes with the real peer id. (Read pre-swap:
      // edge sources still carry the old node ids.)
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
            // Every upgraded placeholder becomes a plain peer card — user
            // devices included (re-selection now lives in the setup modal,
            // not on the node).
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
          // Group nodes tracking the placeholder as an added member (it was
          // grouped before installing) follow the rename to the real id.
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
                // The real peer is in the API list now — the held draft
                // object is obsolete.
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

      // Group changes (create/update) carrying the placeholder's draft id as
      // a member get the real peer id, so deploy adds the installed peer.
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

      // Re-record the policies that referenced the old ids.
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
        // Next tick — the node swap must be committed to the canvas before
        // drawPolicyOnCanvas rebuilds the policies' edges against it.
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

// Watches the peers list while a draft is open: when a placeholder's
// installed machine registers, the placeholder upgrades in place via
// usePlaceholderUpgrade. Server/Agent placeholders are matched by membership
// in the hidden group their setup key auto-assigned (reliable); hostname is a
// fallback. Once matched, that throwaway group has served its purpose and is
// deleted from the API.
export function useDraftPeerUpgrade() {
  const { isDraft } = useDraftMode();
  const { nodes } = useCanvasState();
  const { peers } = useControlCenterData();
  const upgrade = usePlaceholderUpgrade();
  const deleteArtifacts = usePlaceholderArtifacts();
  // The effect re-runs on every nodes/peers change — never upgrade a node
  // twice (state updates land asynchronously).
  const upgraded = useRef(new Set<string>());
  // Placeholders whose artifacts were already scheduled for deletion.
  const cleaned = useRef(new Set<string>());

  useEffect(() => {
    if (!isDraft || !peers?.length) return;

    const onCanvas = new Set(nodes.map((n) => n.id));
    const upgrades: PlaceholderUpgrade[] = [];
    // Hidden artifacts (bound group + setup key) to delete once their peer
    // has been matched — they only existed to find it.
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

    // The reliable match: the placeholder's setup key auto-assigns its unique
    // BOUND identity group, so the registering peer is the (only) new peer
    // that landed in that group.
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

      // Placeholders absorbed into a group (no own node anymore) install
      // from the group panel — their pending entries ride on the group node.
      data?.draftPeers?.forEach((p) => {
        if (!p.id) return;
        const pseudoNodeId = `peer-${p.id}`;
        if (upgraded.current.has(pseudoNodeId)) return;
        // Bound-group match first (reliable); hostname is the fallback.
        const match =
          (p.boundGroupId ? findByGroup(p.boundGroupId) : undefined) ??
          (p.installHostname ? findMatch(p.installHostname) : undefined);
        if (!match?.id) return;
        upgraded.current.add(pseudoNodeId);
        upgrades.push({ nodeId: pseudoNodeId, peer: match });
        // Drop the setup key + bound group the placeholder created once matched.
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
      // Bound-group match first; hostname is the fallback (user devices, or a
      // key generated without a bound group).
      const match =
        (data.boundGroupId ? findByGroup(data.boundGroupId) : undefined) ??
        (data.installHostname ? findMatch(data.installHostname) : undefined);
      if (!match?.id) return;
      upgraded.current.add(node.id);
      upgrades.push({ nodeId: node.id, peer: match });
      // The bound group + setup key only existed to find this peer — drop
      // them now that it's matched.
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

  // A placeholder is "waiting" once its setup key is generated (setupKeyId /
  // boundGroupId written to the node or its group-panel entry) and it hasn't
  // upgraded yet. getPlaceholderPeer returns undefined after upgrade (the node
  // becomes a real peer), and absorbed entries are dropped, so this clears
  // itself.
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

  // While a placeholder waits for its machine to register, /peers won't change
  // on its own (SWR only revalidates on focus/reconnect). Poll it so the
  // watcher above picks up the new peer and upgrades the placeholder in place.
  useEffect(() => {
    if (!isDraft || !hasWaitingInstall) return;
    const id = window.setInterval(() => void mutate("/peers"), 5000);
    return () => window.clearInterval(id);
  }, [isDraft, hasWaitingInstall]);
}
