import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { Peer } from "@/interfaces/Peer";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

// Watches the peers list while a draft is open: when a placeholder's
// installed machine registers (matched by the hostname the install modal
// suggested and stamped onto the node), the placeholder upgrades in place to
// the real peer — same position, edges rewired — and every draft policy
// referencing the placeholder's "draft-…" id is re-recorded with the real
// peer id, which makes it deployable and lets it enter the changeset.
export function useDraftPeerUpgrade() {
  const { isDraft } = useDraftMode();
  const { nodes } = useCanvasState();
  const { peers } = useControlCenterData();
  const { updateDraftPolicy } = useControlCenterPolicy();
  const reactFlow = useReactFlow();
  // The effect re-runs on every nodes/peers change — never upgrade a node
  // twice (state updates land asynchronously).
  const upgraded = useRef(new Set<string>());

  useEffect(() => {
    if (!isDraft || !peers?.length) return;

    const onCanvas = new Set(nodes.map((n) => n.id));
    const upgrades: { draftId: string; nodeId: string; peer: Peer }[] = [];

    nodes.forEach((node) => {
      const data = node.data as {
        placeholderKind?: string;
        installHostname?: string;
      };
      if (!data?.placeholderKind || !data.installHostname) return;
      if (upgraded.current.has(node.id)) return;
      const match = peers.find(
        (p) =>
          (p.hostname === data.installHostname ||
            p.name === data.installHostname) &&
          !onCanvas.has(`peer-${p.id}`),
      );
      if (!match?.id) return;
      upgraded.current.add(node.id);
      upgrades.push({
        draftId: node.id.replace("peer-", ""),
        nodeId: node.id,
        peer: match,
      });
    });

    if (upgrades.length === 0) return;

    // Swap the placeholder nodes for real peer nodes in place (position and
    // edges kept, only id + data change).
    reactFlow.setNodes((prev) =>
      prev.map((n) => {
        const up = upgrades.find((u) => u.nodeId === n.id);
        if (!up) return n;
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
      }),
    );
    reactFlow.setEdges((prev) =>
      prev.map((e) => {
        const bySource = upgrades.find((u) => u.nodeId === e.source);
        const byTarget = upgrades.find((u) => u.nodeId === e.target);
        if (!bySource && !byTarget) return e;
        return {
          ...e,
          source: bySource ? `peer-${bySource.peer.id}` : e.source,
          target: byTarget ? `peer-${byTarget.peer.id}` : e.target,
        };
      }),
    );

    // Re-record the policies that referenced the placeholders' draft ids.
    const policyUpdates: Policy[] = [];
    nodes.forEach((n) => {
      const policy = (n.data as { policy?: Policy })?.policy;
      const rule = policy?.rules?.[0];
      if (!policy || !rule) return;
      let changed = false;
      const remap = (
        r?: PolicyRuleResource,
      ): PolicyRuleResource | undefined => {
        const up = r && upgrades.find((u) => u.draftId === r.id);
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
  }, [isDraft, peers, nodes, reactFlow, updateDraftPolicy]);
}
