import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import useFetchApi from "@utils/api";
import { orderBy } from "lodash";
import { PlusCircle, ShieldIcon, SquarePenIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import CircleIcon from "@/assets/icons/CircleIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource?: NetworkResource;
};
export const ResourcePolicyCell = ({ resource }: Props) => {
  const { permission } = usePermissions();
  const { openPolicyModal, network, openEditPolicyModal } =
    useNetworksContext();
  const { data: policies, isLoading } = useFetchApi<Policy[]>("/policies");
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const assignedPolicies = useMemo(() => {
    const resourceGroups = resource?.groups as Group[];
    return orderBy(
      policies?.filter((policy) => {
        const destinationResource = policy.rules
          ?.map((rule) => rule?.destinationResource?.id === resource?.id)
          .some((id) => id);
        if (destinationResource) return true;
        const destinationPolicyGroups = policy.rules
          ?.map((rule) => rule?.destinations)
          .flat() as Group[];
        const policyGroups = [...destinationPolicyGroups];
        return resourceGroups?.some((resourceGroup) =>
          policyGroups.some(
            (policyGroup) => policyGroup?.id === resourceGroup.id,
          ),
        );
      }),
      "enabled",
      "desc",
    );
  }, [policies, resource]);

  if (isLoading) {
    return (
      <div className={"flex gap-3"}>
        <Skeleton height={34} width={220} />
      </div>
    );
  }

  const enabledPolicies = assignedPolicies?.filter((policy) => policy?.enabled);

  const policyCount = assignedPolicies?.length || 0;

  return (
    network && (
      <div className={"flex gap-3"}>
        {policyCount > 0 && (
          <FullTooltip
            contentClassName={"p-0"}
            delayDuration={200}
            skipDelayDuration={200}
            customOpen={tooltipOpen}
            customOnOpenChange={setTooltipOpen}
            className={"border-nb-gray-800"}
            content={
              <div className={"text-xs flex flex-col p-1"}>
                {assignedPolicies?.map((policy: Policy) => {
                  const rule = policy?.rules?.[0];
                  if (!rule) return;
                  return (
                    <button
                      key={policy.id}
                      className={
                        "m-0 pl-3 py-2.5 leading-none flex justify-between group hover:bg-nb-gray-900 rounded-md"
                      }
                      onClick={() => {
                        setTooltipOpen(false);
                        openEditPolicyModal(policy);
                      }}
                    >
                      <div
                        className={
                          " flex items-center gap-2 leading-none font-medium text-nb-gray-300 group-hover:text-nb-gray-200 whitespace-nowrap"
                        }
                      >
                        <CircleIcon
                          size={8}
                          active={policy.enabled}
                          className={"shrink-0"}
                        />
                        {policy.name}
                      </div>

                      <div
                        className={
                          "text-nb-gray-300 px-2 ml-4 uppercase font-mono opacity-0 group-hover:opacity-100"
                        }
                      >
                        <SquarePenIcon size={12} />
                      </div>
                    </button>
                  );
                })}
              </div>
            }
            interactive={true}
            align={"start"}
            alignOffset={0}
            sideOffset={14}
          >
            <Badge
              variant={"gray"}
              useHover={false}
              className={"select-none hover:bg-nb-gray-910"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!tooltipOpen) setTooltipOpen(true);
              }}
            >
              <ShieldIcon size={14} className={"text-green-500"} />
              <div>
                <span className={"font-medium text-xs"}>
                  {enabledPolicies?.length}
                </span>
              </div>
            </Badge>
          </FullTooltip>
        )}

        <Button
          size={"xs"}
          variant={"secondary"}
          disabled={!permission.networks.update}
          onClick={() => openPolicyModal(network, resource)}
        >
          <PlusCircle size={12} />
          Add Policy
        </Button>
      </div>
    )
  );
};
