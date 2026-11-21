import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { Modal } from "@components/modal/Modal";
import { PlusIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { NetworkResource } from "@/interfaces/Network";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { AccessControlModalContent } from "@/modules/access-control/AccessControlModal";
import AccessControlPolicyList from "@/modules/access-control/AccessControlPolicyList";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  existingPolicies: Policy[];
  newPolicies: Policy[];
  onNewPoliciesChange: (policies: Policy[]) => void;
  address: string;
  resourceName?: string;
  resourceId?: string;
  hasResourceGroups?: boolean;
};

function getResourceType(address: string): "domain" | "host" | "subnet" {
  const hasChars = !!address.match(/[a-z*]/i);
  const isCIDR = !!address.match(/\//);
  return hasChars ? "domain" : isCIDR ? "subnet" : "host";
}

export default function NetworkResourceAccessControl({
  existingPolicies,
  newPolicies,
  onNewPoliciesChange,
  address,
  resourceName,
  resourceId,
  hasResourceGroups = false,
}: Readonly<Props>) {
  const { network, confirmMultiResourceAction } = useNetworksContext();
  const { openEditPolicyModal, deletePolicy } = usePolicies();
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingPolicyIndex, setEditingPolicyIndex] = useState<number | null>(
    null,
  );

  const allPolicies = useMemo(
    () => [...existingPolicies, ...newPolicies],
    [existingPolicies, newPolicies],
  );

  const destinationResource: PolicyRuleResource = useMemo(() => {
    return {
      id: resourceId || resourceName || address,
      type: getResourceType(address),
    };
  }, [address, resourceName, resourceId]);

  const currentResource = useMemo<NetworkResource>(() => {
    return {
      id: resourceId || resourceName || address,
      name: resourceName || address,
      address,
      type: getResourceType(address),
      enabled: true,
    };
  }, [resourceId, resourceName, address]);

  const openAddPolicy = () => {
    setEditingPolicyIndex(null);
    setPolicyModalOpen(true);
  };

  const openEditPolicy = async (policy: Policy) => {
    if (policy.id) {
      const confirm = await confirmMultiResourceAction(
        policy,
        "edit",
        currentResource,
      );
      if (!confirm) return;
      openEditPolicyModal(policy);
    } else {
      const idx = newPolicies.indexOf(policy);
      if (idx === -1) return;
      setEditingPolicyIndex(idx);
      setPolicyModalOpen(true);
    }
  };

  const savePolicy = (policy: Policy) => {
    if (editingPolicyIndex !== null) {
      onNewPoliciesChange(
        newPolicies.map((p, i) => (i === editingPolicyIndex ? policy : p)),
      );
    } else {
      onNewPoliciesChange([...newPolicies, policy]);
    }
  };

  const handleDeletePolicy = async (policy: Policy) => {
    const confirm = await confirmMultiResourceAction(
      policy,
      "delete",
      currentResource,
    );
    if (!confirm) return;
    if (policy.id) {
      await deletePolicy(policy);
    } else {
      onNewPoliciesChange(newPolicies.filter((p) => p !== policy));
    }
  };

  return (
    <div className={"px-8 flex-col flex gap-6"}>
      <div>
        <Label>Access Control Policies</Label>
        <HelpText>
          Define which source groups are allowed to access this resource. You
          can also restrict access to specific protocols and ports. Without
          policies access to this resource will not be possible.
        </HelpText>

        <AccessControlPolicyList
          policies={allPolicies}
          onEdit={openEditPolicy}
          onDelete={handleDeletePolicy}
        />

        <Button
          variant="dotted"
          className={"w-full mt-1"}
          size="sm"
          onClick={openAddPolicy}
          data-testid="add-policy"
        >
          <PlusIcon size={14} />
          Add Policy
        </Button>
      </div>

      <Modal
        open={policyModalOpen}
        onOpenChange={(open) => {
          setPolicyModalOpen(open);
          if (!open) setEditingPolicyIndex(null);
        }}
        key={policyModalOpen ? 1 : 0}
      >
        <AccessControlModalContent
          useSave={false}
          policy={
            editingPolicyIndex !== null
              ? newPolicies[editingPolicyIndex]
              : undefined
          }
          initialDestinationResource={
            editingPolicyIndex === null ? destinationResource : undefined
          }
          disableDestinationSelector={!hasResourceGroups}
          additionalResources={[currentResource]}
          initialName={`${resourceName || address} Access`}
          initialDescription={
            network?.description
              ? `${network.name}, ${network.description}`
              : network?.name || ""
          }
          onSuccess={(policy) => {
            savePolicy(policy);
            setPolicyModalOpen(false);
            setEditingPolicyIndex(null);
          }}
        />
      </Modal>
    </div>
  );
}
