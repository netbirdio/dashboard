import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { Modal } from "@components/modal/Modal";
import { ToggleSwitch } from "@components/ToggleSwitch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { Edit2, MinusCircleIcon, MoreVertical, PlusIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { NetworkResource } from "@/interfaces/Network";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { usePolicies } from "@/contexts/PoliciesProvider";
import AccessControlSourcesCell from "@/modules/access-control/table/AccessControlSourcesCell";
import AccessControlProtocolCell from "@/modules/access-control/table/AccessControlProtocolCell";
import AccessControlPortsCell from "@/modules/access-control/table/AccessControlPortsCell";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import { AccessControlModalContent } from "@/modules/access-control/AccessControlModal";
import { Group } from "@/interfaces/Group";

type Props = {
  policies: Policy[];
  onChange: (policies: Policy[]) => void;
  address: string;
  resource?: NetworkResource;
  groups?: Group[];
};

export default function NetworkResourceAccessControlTabContent({
  policies,
  onChange,
  address,
  resource,
  groups,
}: Readonly<Props>) {
  const { network } = useNetworksContext();
  const { openEditPolicyModal, updatePolicy } = usePolicies();
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingPolicyIndex, setEditingPolicyIndex] = useState<number | null>(
    null,
  );

  const destinationResource: PolicyRuleResource = useMemo(() => {
    const hasChars = !!address.match(/[a-z*]/i);
    const isCIDR = !!address.match(/\//);
    const type = hasChars ? "domain" : isCIDR ? "subnet" : "host";
    return { id: address, type };
  }, [address]);

  const openAddPolicy = () => {
    setEditingPolicyIndex(null);
    setPolicyModalOpen(true);
  };

  const openEditPolicy = (policy: Policy, index: number) => {
    if (policy.id) {
      openEditPolicyModal(policy);
    } else {
      setEditingPolicyIndex(index);
      setPolicyModalOpen(true);
    }
  };

  const savePolicy = (policy: Policy) => {
    if (editingPolicyIndex !== null) {
      onChange(policies.map((p, i) => (i === editingPolicyIndex ? policy : p)));
    } else {
      onChange([...policies, policy]);
    }
  };

  const removePolicy = (index: number) => {
    onChange(policies.filter((_, i) => i !== index));
  };

  const togglePolicyEnabled = (policy: Policy, index: number) => {
    if (policy.id) {
      updatePolicy(policy, { enabled: !policy.enabled });
    } else {
      onChange(
        policies.map((p, i) =>
          i === index ? { ...p, enabled: !p.enabled } : p,
        ),
      );
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

        {policies.length > 0 && (
          <div
            className={
              "mt-3 mb-3 overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30 py-1 px-1 rounded-md"
            }
          >
            <table className="w-full">
              <thead>
                <tr>
                  <th className="py-2 pl-5 pr-2 text-left text-[11px] uppercase tracking-wider text-nb-gray-400 font-medium w-full">
                    Source
                  </th>
                  <th className="py-2 px-4 text-left text-[11px] uppercase tracking-wider text-nb-gray-400 font-medium">
                    Protocol
                  </th>
                  <th className="py-2 px-4 text-left text-[11px] uppercase tracking-wider text-nb-gray-400 font-medium">
                    Ports
                  </th>
                  <th className="py-2 pr-4 pl-2" />
                </tr>
              </thead>
              <tbody>
                {policies.map((policy, index) => (
                  <tr
                    key={policy.id || index}
                    onClick={() => openEditPolicy(policy, index)}
                    className="rounded-md hover:bg-nb-gray-900/30 cursor-pointer transition-all"
                  >
                    <td className="py-2.5 pl-5 pr-2 align-middle">
                      <AccessControlSourcesCell
                        policy={policy}
                        hideEdit
                        disableRedirect
                      />
                    </td>
                    <td className="py-2.5 px-4 align-middle">
                      <AccessControlProtocolCell policy={policy} />
                    </td>
                    <td className="py-2.5 px-4 align-middle">
                      <AccessControlPortsCell policy={policy} />
                    </td>
                    <td className="py-2.5 pl-6 pr-4">
                      <div
                        className="flex items-center gap-6 justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ToggleSwitch
                          size="small"
                          checked={policy.enabled}
                          onCheckedChange={() =>
                            togglePolicyEnabled(policy, index)
                          }
                        />
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="default-outline" className="!px-3">
                              <MoreVertical size={16} className="shrink-0" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-auto min-w-[200px]"
                            align="end"
                          >
                            <DropdownMenuItem
                              onClick={() => openEditPolicy(policy, index)}
                            >
                              <div className="flex gap-3 items-center">
                                <Edit2 size={14} className="shrink-0" />
                                Edit Policy
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant={"danger"}
                              onClick={() => removePolicy(index)}
                            >
                              <div className="flex gap-3 items-center">
                                <MinusCircleIcon
                                  size={14}
                                  className="shrink-0"
                                />
                                Remove Policy
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button
          variant="dotted"
          className={"w-full mt-1"}
          size="sm"
          onClick={openAddPolicy}
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
          disableDestination={true}
          policy={
            editingPolicyIndex !== null
              ? policies[editingPolicyIndex]
              : undefined
          }
          initialDestinationResource={
            groups?.length ? undefined : destinationResource
          }
          initialDestinationGroups={groups?.length ? groups : undefined}
          initialName={`Resource ${address}`}
          initialDescription={`Network ${network?.name || ""}`}
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
