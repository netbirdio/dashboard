import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { Settings, ShieldIcon, ShieldOff, SquarePenIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import CircleIcon from "@/assets/icons/CircleIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import { cn } from "@utils/helpers";

type Props = {
  resource?: NetworkResource;
};
export const ResourcePolicyCell = ({ resource }: Props) => {
  const { permission } = usePermissions();
  const {
    openResourceModal,
    network,
    openEditPolicyModal,
    assignedPolicies,
    openPolicyModal,
  } = useNetworksContext();
  const {
    policies: resourcePolicies,
    enabledPolicies,
    isLoading,
    policyCount,
  } = assignedPolicies(resource);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  if (isLoading) {
    return (
      <div className={"flex gap-3"}>
        <Skeleton height={34} width={220} />
      </div>
    );
  }

  return (
    network && (
      <div className={"flex gap-3"}>
        {policyCount === 0 && (
          <Badge variant={"gray"}>
            <ShieldOff size={12} className="text-red-500" />
            <span className={"font-medium text-xs"}>None</span>
          </Badge>
        )}

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
                {resourcePolicies?.map((policy: Policy) => {
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
              useHover={true}
              className={"select-none hover:bg-nb-gray-910 cursor-pointer"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (tooltipOpen) setTooltipOpen(false);
                openResourceModal(network, resource, "access-control");
              }}
            >
              <ShieldIcon
                size={14}
                className={cn(
                  enabledPolicies?.length > 0
                    ? "text-green-500"
                    : "text-nb-gray-400",
                )}
              />
              <div>
                <span className={"font-medium text-xs"}>
                  {enabledPolicies?.length > 0
                    ? enabledPolicies?.length
                    : `${policyCount} Disabled`}
                </span>
              </div>
            </Badge>
          </FullTooltip>
        )}

        <Button
          size={"xs"}
          variant={"secondary"}
          className={"!px-3"}
          disabled={!permission.networks.update}
          onClick={() => openResourceModal(network, resource, "access-control")}
        >
          <Settings size={12} />
          Configure
        </Button>
      </div>
    )
  );
};
