import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import * as React from "react";
import { useMemo, useState } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import {
  NetworkDestinationPickerState,
  useDraftMode,
} from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { getDraftResource } from "@/modules/control-center/utils/helpers";

// Destination picker for a POLICY connected with a network frame: the policy
// modal's destination selector, limited to that network's resources and groups.
export const DraftNetworkDestinationModal = () => {
  const { networkDestinationPicker, setNetworkDestinationPicker } =
    useDraftMode();
  return (
    <Modal
      open={!!networkDestinationPicker}
      onOpenChange={(open) => !open && setNetworkDestinationPicker(null)}
    >
      {networkDestinationPicker && (
        <PickerContent
          state={networkDestinationPicker}
          onClose={() => setNetworkDestinationPicker(null)}
        />
      )}
    </Modal>
  );
};

const PickerContent = ({
  state,
  onClose,
}: {
  state: NetworkDestinationPickerState;
  onClose: () => void;
}) => {
  const { networkNodeId, policyNodeId } = state;
  const { nodes } = useCanvasState();
  const { groups: apiGroups, networkResources } = useControlCenterData();
  const { updateDraftPolicy } = useControlCenterPolicy();

  const [pickedGroups, setPickedGroups] = useState<Group[]>([]);
  const [pickedResource, setPickedResource] = useState<
    PolicyRuleResource | undefined
  >(undefined);

  const frame = nodes.find((n) => n.id === networkNodeId);
  const network = (frame?.data as { network?: Network })?.network;
  const policyNode = nodes.find((n) => n.id === policyNodeId);
  const policy = (policyNode?.data as { policy?: Policy })?.policy;

  const children = useMemo(
    () => nodes.filter((n) => n.parentId === networkNodeId),
    [nodes, networkNodeId],
  );
  const resources = useMemo(() => {
    const draft = children
      .map((n) => getDraftResource(n))
      .filter(Boolean) as NetworkResource[];
    // Existing-network cards have no draft children; use the API resources.
    if (draft.length > 0 || !network?.id) return draft;
    return (networkResources ?? []).filter((r) =>
      (network.resources ?? []).includes(r.id),
    );
  }, [children, network, networkResources]);
  const groupIds = useMemo(() => {
    const ids = new Set<string>();
    children.forEach((n) => {
      const resourceGroupIds = (n.data as { resourceGroupIds?: string[] })
        ?.resourceGroupIds;
      resourceGroupIds?.forEach((idOrName) => {
        const group = apiGroups?.find((g) => g.id === idOrName);
        ids.add(group ? group.id ?? group.name : idOrName);
      });
      if (n.type === "resourceGroupNode") {
        const group = (n.data as { group?: Group })?.group;
        if (group) ids.add(group.id ?? group.name);
      }
    });
    // Existing-network cards: the groups of the network's API resources.
    if (ids.size === 0 && network?.id) {
      resources.forEach((r) =>
        (r.groups as (Group | string)[] | undefined)?.forEach((g) =>
          ids.add(typeof g === "string" ? g : g.id ?? g.name),
        ),
      );
    }
    return Array.from(ids);
  }, [children, apiGroups, network, resources]);

  const groupKey = (g: Group | string) =>
    typeof g === "string" ? g : g.id ?? g.name;
  const hasPick = !!pickedResource || pickedGroups.length > 0;

  // Same guards as a direct handle drop; a blocked pick disables Connect and
  // says why — closing silently would read as success.
  const rule = policy?.rules?.[0];
  const existingDestinations = (rule?.destinations as (Group | string)[]) ?? [];
  const blockedReason = rule?.destinationResource
    ? "This policy already has a resource destination. Remove it from the policy first."
    : pickedResource && existingDestinations.length > 0
      ? "This policy already has group destinations, and a resource can't be combined with them. Pick groups instead."
      : null;

  const onConnect = () => {
    if (!policy || !rule || blockedReason) return;
    const merged = [
      ...existingDestinations,
      ...pickedGroups.filter(
        (g) => !existingDestinations.some((e) => groupKey(e) === groupKey(g)),
      ),
    ] as Group[];
    updateDraftPolicy({
      ...policy,
      rules: [
        {
          ...rule,
          destinationResource: pickedResource,
          destinations: pickedResource ? [] : merged,
        },
        ...(policy.rules?.slice(1) ?? []),
      ],
    });
    onClose();
  };

  return (
    <ModalContent maxWidthClass={"max-w-lg"}>
      <ModalHeader
        icon={<NetworkRoutesIcon className={"fill-netbird"} />}
        title={"Select Destination"}
        description={`Access ${network?.name ?? "this network"}${
          policy?.name ? ` via "${policy.name}"` : ""
        }`}
        color={"netbird"}
      />
      <div className={"p-default flex flex-col"}>
        {resources.length === 0 && groupIds.length === 0 ? (
          <div className={"text-sm text-nb-gray-400 text-center py-4"}>
            This network has no resources yet.
          </div>
        ) : (
          <div className={"w-full"}>
            <PeerGroupSelector
              data-testid={"network-destination-selector"}
              popoverWidth={480}
              placeholder={"Select destination(s)..."}
              showResources={true}
              showResourceCounter={true}
              // Land on the tab that has content.
              initialTab={groupIds.length === 0 ? "resources" : "groups"}
              hideAllGroup={true}
              saveGroupAssignments={false}
              values={pickedGroups}
              onChange={setPickedGroups}
              resource={pickedResource}
              onResourceChange={setPickedResource}
              resourceIds={resources.map((r) => r.id)}
              additionalResources={resources}
              groupIds={groupIds}
            />
          </div>
        )}
        {blockedReason && (
          <div
            className={"text-sm text-yellow-400 pt-3"}
            data-testid={"network-destination-blocked"}
          >
            {blockedReason}
          </div>
        )}
      </div>
      <ModalFooter className={"items-center"} separator={false}>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"} className={"w-full"}>
              Cancel
            </Button>
          </ModalClose>
          <Button
            variant={"primary"}
            className={"w-full"}
            onClick={onConnect}
            disabled={!hasPick || !!blockedReason}
          >
            Connect
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
};
