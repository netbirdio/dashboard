import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { Modal } from "@components/modal/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { ResourceIcon } from "@/assets/icons/ResourceIcon";
import { Edit2, MoreVertical, PlusIcon, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { NetworkResource } from "@/interfaces/Network";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { cn } from "@utils/helpers";
import { useDialog } from "@/contexts/DialogProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import AccessControlSourcesCell from "@/modules/access-control/table/AccessControlSourcesCell";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import { AccessControlModalContent } from "@/modules/access-control/AccessControlModal";
import { useSWRConfig } from "swr";
import CircleIcon from "@/assets/icons/CircleIcon";
import AccessControlProtocolCell from "@/modules/access-control/table/AccessControlProtocolCell";
import AccessControlPortsCell from "@/modules/access-control/table/AccessControlPortsCell";
import TruncatedText from "@components/ui/TruncatedText";
import CopyToClipboardText from "@components/CopyToClipboardText";

type Props = {
  existingPolicies: Policy[];
  newPolicies: Policy[];
  onNewPoliciesChange: (policies: Policy[]) => void;
  address: string;
  resourceName?: string;
};

export default function NetworkResourceAccessControl({
  existingPolicies,
  newPolicies,
  onNewPoliciesChange,
  address,
  resourceName,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const { network, getPolicyDestinationResources } = useNetworksContext();
  const { openEditPolicyModal, deletePolicy } = usePolicies();
  const { confirm } = useDialog();
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingPolicyIndex, setEditingPolicyIndex] = useState<number | null>(
    null,
  );

  const allPolicies = useMemo(
    () => [...existingPolicies, ...newPolicies],
    [existingPolicies, newPolicies],
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

  const confirmMultiResourceAction = async (
    policy: Policy,
    action: "edit" | "delete",
  ) => {
    const affectedResources = getPolicyDestinationResources(policy);
    const isMulti = affectedResources.length > 1;
    return confirm({
      title: isMulti ? (
        <>This policy is used by multiple resources</>
      ) : (
        <>
          {action === "edit" ? "Edit" : "Delete"} policy &apos;{policy.name}
          &apos;?
        </>
      ),
      description: isMulti
        ? `This policy uses one or many resource group(s) as destinations. ${
            action === "edit" ? "Updating" : "Deleting"
          } this policy will also affect following resources:`
        : action === "delete"
        ? "Are you sure you want to delete this policy? This action cannot be undone."
        : undefined,
      children: isMulti ? (
        <AffectedResourceList resources={affectedResources} />
      ) : undefined,
      confirmText: action === "edit" ? "Edit Policy" : "Delete Policy",
      cancelText: "Cancel",
      hideIcon: isMulti,
      type: action === "edit" ? "warning" : "danger",
      maxWidthClass: isMulti ? "max-w-lg" : undefined,
    });
  };

  const openEditPolicy = async (policy: Policy) => {
    if (policy.id) {
      const affectedResources = getPolicyDestinationResources(policy);
      if (affectedResources.length > 1) {
        if (!(await confirmMultiResourceAction(policy, "edit"))) return;
      }
      openEditPolicyModal(policy);
    } else {
      setEditingPolicyIndex(newPolicies.indexOf(policy));
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
    if (!(await confirmMultiResourceAction(policy, "delete"))) return;
    if (policy.id) {
      deletePolicy(policy, () => {
        mutate("/policies");
      });
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

        {allPolicies.length > 0 && (
          <div
            className={
              "mt-3 mb-3 overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30 py-1 px-1 rounded-md"
            }
          >
            <table className="w-full">
              <thead>
                <tr>
                  <th className="py-2 px-4 text-left text-[11px] uppercase tracking-wider text-nb-gray-400 font-medium">
                    Name
                  </th>
                  <th className="py-2 pl-5 pr-2 text-left text-[11px] uppercase tracking-wider text-nb-gray-400 font-medium">
                    Source Groups
                  </th>
                  <th className="py-2 px-4 text-left text-[11px] uppercase tracking-wider text-nb-gray-400 font-medium">
                    Protocol & Ports
                  </th>
                  <th className="py-2 pr-4 pl-2" />
                </tr>
              </thead>
              <tbody>
                {allPolicies.map((policy, index) => {
                  return (
                    <tr
                      key={policy.id || `new-${index}`}
                      onClick={() => openEditPolicy(policy)}
                      className="rounded-md hover:bg-nb-gray-900/30 cursor-pointer transition-all"
                    >
                      <td className="py-2.5 px-4 align-middle">
                        <div
                          className={
                            "text-[13px] mt-1 flex items-center gap-2 leading-none font-medium text-nb-gray-300 group-hover:text-nb-gray-200 whitespace-nowrap"
                          }
                        >
                          <div className={"self-start flex"}>
                            <CircleIcon
                              size={8}
                              active={policy.enabled}
                              className={"shrink-0 top-[3px] relative"}
                            />
                          </div>
                          <div
                            className={
                              "flex flex-col items-start justify-start"
                            }
                          >
                            <TruncatedText
                              text={policy.name}
                              maxWidth={"130px"}
                            />
                            <div className={"mt-1 text-nb-gray-400 text-xs"}>
                              <TruncatedText
                                text={policy.description}
                                maxWidth={"130px"}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pl-5 pr-2 align-middle">
                        <AccessControlSourcesCell
                          policy={policy}
                          hideEdit
                          disableRedirect
                        />
                      </td>
                      <td className="py-2.5 pl-3 pr-2 align-middle">
                        <div className={"flex items-center gap-2"}>
                          <AccessControlProtocolCell policy={policy} />
                          <AccessControlPortsCell
                            policy={policy}
                            visiblePorts={1}
                          />
                        </div>
                      </td>

                      <td className="py-2.5 pl-2 pr-3">
                        <div
                          className="flex items-center gap-6 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="default-outline"
                                className="!px-3"
                              >
                                <MoreVertical size={16} className="shrink-0" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className="w-auto min-w-[200px]"
                              align="end"
                            >
                              <DropdownMenuItem
                                onClick={() => openEditPolicy(policy)}
                              >
                                <div className="flex gap-3 items-center">
                                  <Edit2 size={14} className="shrink-0" />
                                  Edit Policy
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant={"danger"}
                                onClick={() => handleDeletePolicy(policy)}
                              >
                                <div className="flex gap-3 items-center">
                                  <Trash2 size={14} className="shrink-0" />
                                  Delete Policy
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
          policy={
            editingPolicyIndex !== null
              ? newPolicies[editingPolicyIndex]
              : undefined
          }
          initialDestinationResource={destinationResource}
          initialName={`${resourceName || address} Policy`}
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

function AffectedResourceList({ resources }: { resources: NetworkResource[] }) {
  const maxVisible = 6;
  const visible = resources.slice(0, maxVisible);
  const remaining = resources.length - maxVisible;
  return (
    <div
      className={cn(
        "rounded-md bg-nb-gray-930 border border-nb-gray-900 text-xs mt-4",
      )}
    >
      {visible.map((r, i) => (
        <div
          key={r.id}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5",
            i > 0 && "border-t border-nb-gray-900",
          )}
        >
          <ResourceIcon type={r.type || "host"} size={12} />
          <span className="font-medium text-nb-gray-200">{r.name}</span>
          <CopyToClipboardText className={"text-nb-gray-300"}>
            {r.address}
          </CopyToClipboardText>
        </div>
      ))}
      {remaining > 0 && (
        <div className="border-t border-nb-gray-900 px-3 py-2 text-nb-gray-200">
          + {remaining} more
        </div>
      )}
    </div>
  );
}
