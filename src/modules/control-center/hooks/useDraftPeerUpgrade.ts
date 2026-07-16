import { useCallback, useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { Peer } from "@/interfaces/Peer";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

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
  const { replacePeerIdInGroups } = useDraftChangeset();

  return useCallback(
    (upgrades: PlaceholderUpgrade[]) => {
      if (upgrades.length === 0) return;
      const withOldIds = upgrades.map((u) => ({
        ...u,
        oldId: u.nodeId.replace("peer-", ""),
      }));

      reactFlow.setNodes((prev) =>
        prev.map((n) => {
          const up = withOldIds.find((u) => u.nodeId === n.id);
          if (up) {
            const data = n.data as {
              placeholderKind?: string;
              placeholderName?: string;
            };
            const keepSelect = data?.placeholderKind === "user-device";
            return {
              ...n,
              id: `peer-${up.peer.id}`,
              data: keepSelect
                ? {
                    placeholderKind: "user-device",
                    placeholderName: data.placeholderName,
                    peer: up.peer,
                    enabled: true,
                    showHandles: true,
                  }
                : {
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
          if (members) {
            const hits = withOldIds.filter((u) => members.has(u.oldId));
            if (hits.length > 0) {
              const next = new Set(members);
              hits.forEach((u) => {
                next.delete(u.oldId);
                next.add(u.peer.id as string);
              });
              return { ...n, data: { ...n.data, addedMembers: next } };
            }
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
    [reactFlow, updateDraftPolicy, replacePeerIdInGroups],
  );
}

// Watches the peers list while a draft is open: when a placeholder's
// installed machine registers (matched by the hostname the install modal
// suggested and stamped onto the node), the placeholder upgrades in place
// via usePlaceholderUpgrade.
export function useDraftPeerUpgrade() {
  const { isDraft } = useDraftMode();
  const { nodes } = useCanvasState();
  const { peers } = useControlCenterData();
  const upgrade = usePlaceholderUpgrade();
  // The effect re-runs on every nodes/peers change — never upgrade a node
  // twice (state updates land asynchronously).
  const upgraded = useRef(new Set<string>());

  useEffect(() => {
    if (!isDraft || !peers?.length) return;

    const onCanvas = new Set(nodes.map((n) => n.id));
    const upgrades: PlaceholderUpgrade[] = [];

    nodes.forEach((node) => {
      const data = node.data as {
        placeholderKind?: string;
        installHostname?: string;
        peer?: Peer;
      };
      if (!data?.placeholderKind || !data.installHostname || data.peer) return;
      if (upgraded.current.has(node.id)) return;
      const match = peers.find(
        (p) =>
          (p.hostname === data.installHostname ||
            p.name === data.installHostname) &&
          !onCanvas.has(`peer-${p.id}`),
      );
      if (!match?.id) return;
      upgraded.current.add(node.id);
      upgrades.push({ nodeId: node.id, peer: match });
    });

    upgrade(upgrades);
  }, [isDraft, peers, nodes, upgrade]);
}
