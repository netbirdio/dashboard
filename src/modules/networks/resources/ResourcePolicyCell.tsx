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
    confirmMultiResourceAction,
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
        <Skeleton height={34} width={120} />
      </div>
    );
  }

  if (!network) return null;

  const canConfigure = !!permission.networks.update;
  const enabledCount = enabledPolicies?.length ?? 0;
  const displayCount = enabledCount > 0 ? enabledCount : policyCount;

  const policyBadge = (
    <Badge
      variant={"gray"}
      useHover={false}
      disabled={!canConfigure}
      className={
        "cursor-pointer !rounded-r-none !border-r-0 !h-[34px] !px-2 min-w-[50px] hover:bg-nb-gray-930 transition-all"
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canConfigure) return;
        if (tooltipOpen) setTooltipOpen(false);
        openResourceModal(network, resource, "access-control");
      }}
    >
      {policyCount > 0 ? (
        <ShieldIcon
          size={12}
          className={cn(
            enabledCount > 0 ? "text-green-500" : "text-nb-gray-400",
          )}
        />
      ) : (
        <ShieldOff size={12} className="text-red-500" />
      )}
      <span className={"font-medium text-xs"}>{displayCount}</span>
    </Badge>
  );

  return (
    <div className={"flex"}>
      <div className={"flex items-center"}>
        {policyCount > 0 ? (
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
                  if (!rule) return null;
                  return (
                    <button
                      key={policy.id}
                      className={
                        "m-0 pl-3 py-2.5 leading-none flex justify-between group hover:bg-nb-gray-900 rounded-md"
                      }
                      onClick={async () => {
                        setTooltipOpen(false);
                        const confirm = await confirmMultiResourceAction(
                          policy,
                          "edit",
                          resource,
                        );
                        if (!confirm) return;
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
            {policyBadge}
          </FullTooltip>
        ) : (
          policyBadge
        )}

        <Button
          size={"xs"}
          variant={"secondary"}
          className={"!rounded-l-none !px-2 !h-[34px]"}
          disabled={!canConfigure}
          onClick={(e) => {
            e.stopPropagation();
            openResourceModal(network, resource, "access-control");
          }}
          aria-label="Configure policies"
        >
          <Settings size={12} />
        </Button>
      </div>
    </div>
  );
};
