import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { Modal } from "@components/modal/Modal";
import { PlusIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { AccessControlModalContent } from "@/modules/access-control/AccessControlModal";
import AccessControlPolicyList from "@/modules/access-control/AccessControlPolicyList";

/** Destination id of policies drafted before their exit node exists. */
export const NEW_EXIT_NODE_ID = "new-exit-node";

type Props = {
  exitNodeId?: string;
  exitNodeName: string;
  existingPolicies: Policy[];
  newPolicies: Policy[];
  onNewPoliciesChange: (policies: Policy[]) => void;
};

/**
 * The policies that let peers use the exit node. New ones are drafts until
 * the exit node is saved; existing ones are edited and deleted right away.
 */
export default function ExitNodeAccessControl({
  exitNodeId,
  exitNodeName,
  existingPolicies,
  newPolicies,
  onNewPoliciesChange,
}: Readonly<Props>) {
  const { openEditPolicyModal, deletePolicy } = usePolicies();
  const { confirm } = useDialog();
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const allPolicies = useMemo(
    () => [...existingPolicies, ...newPolicies],
    [existingPolicies, newPolicies],
  );

  const id = exitNodeId ?? NEW_EXIT_NODE_ID;
  const name = exitNodeName.trim() || "New Exit Node";

  const destinationResource = useMemo<PolicyRuleResource>(
    () => ({ id, type: "exit_node" }),
    [id],
  );
  const draftExitNodes = useMemo(() => [{ id, name }], [id, name]);

  const openEditPolicy = (policy: Policy) => {
    if (policy.id) return openEditPolicyModal(policy);
    const index = newPolicies.indexOf(policy);
    if (index === -1) return;
    setEditingIndex(index);
    setPolicyModalOpen(true);
  };

  const handleDeletePolicy = async (policy: Policy) => {
    if (!policy.id) {
      onNewPoliciesChange(newPolicies.filter((p) => p !== policy));
      return;
    }
    const choice = await confirm({
      title: `Delete '${policy.name}'?`,
      description:
        "Are you sure you want to delete this access control policy? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (choice) await deletePolicy(policy);
  };

  const savePolicy = (policy: Policy) => {
    onNewPoliciesChange(
      editingIndex !== null
        ? newPolicies.map((p, i) => (i === editingIndex ? policy : p))
        : [...newPolicies, policy],
    );
  };

  return (
    <div className={"px-8 flex-col flex gap-6"}>
      <div>
        <Label>Access Control Policies</Label>
        <HelpText>
          Define which source groups are allowed to use this exit node. You can
          also restrict access to specific protocols and ports. Without
          policies, no peer can use this exit node.
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
          onClick={() => {
            setEditingIndex(null);
            setPolicyModalOpen(true);
          }}
          data-testid="exit-node-add-policy"
        >
          <PlusIcon size={14} />
          Add Policy
        </Button>
      </div>

      <Modal
        open={policyModalOpen}
        onOpenChange={(open) => {
          setPolicyModalOpen(open);
          if (!open) setEditingIndex(null);
        }}
        key={policyModalOpen ? 1 : 0}
      >
        <AccessControlModalContent
          useSave={false}
          policy={editingIndex !== null ? newPolicies[editingIndex] : undefined}
          initialDestinationResource={
            editingIndex === null ? destinationResource : undefined
          }
          disableDestinationSelector={true}
          additionalExitNodes={draftExitNodes}
          initialName={`${name} Access`}
          onSuccess={(policy) => {
            savePolicy(policy);
            setPolicyModalOpen(false);
            setEditingIndex(null);
          }}
        />
      </Modal>
    </div>
  );
}
