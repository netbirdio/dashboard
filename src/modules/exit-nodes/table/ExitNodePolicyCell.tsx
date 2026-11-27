import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { Settings, ShieldIcon, ShieldOff, SquarePenIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { ExitNode } from "@/interfaces/ExitNode";
import { useExitNodes } from "@/modules/exit-nodes/ExitNodesProvider";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

type Props = {
  exitNode: ExitNode;
};

/**
 * Number of policies that allow peers to use the exit node. Hovering lists
 * them; without any, the badge opens the Access Control tab.
 */
export default function ExitNodePolicyCell({ exitNode }: Readonly<Props>) {
  const exitNodePermission = useExitNodePermissions();
  const { permission } = usePermissions();
  const { getPolicies, openExitNodeModal } = useExitNodes();
  const { openEditPolicyModal } = usePolicies();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const policies = getPolicies(exitNode);
  const policyCount = policies.length;
  const enabledCount = policies.filter((p) => p.enabled).length;
  const displayCount = enabledCount > 0 ? enabledCount : policyCount;
  const canConfigure = !!exitNodePermission?.update;

  const openAccessControl = () =>
    openExitNodeModal(exitNode, { tab: "access-control" });

  const activate = () => {
    if (!canConfigure) return;
    if (tooltipOpen) setTooltipOpen(false);
    openAccessControl();
  };

  const policyBadge = (
    <Badge
      variant={"gray"}
      useHover={false}
      disabled={!canConfigure}
      className={
        "cursor-pointer !rounded-r-none !border-r-0 !h-[34px] !px-2 min-w-[50px] hover:bg-nb-gray-930 dark:hover:bg-nb-gray-930 transition-all"
      }
      role={"button"}
      tabIndex={canConfigure ? 0 : -1}
      aria-disabled={!canConfigure}
      aria-label={`${displayCount} access control policies, configure`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        activate();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        activate();
      }}
      data-testid={"exit-node-policies"}
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
    <div className={"flex"} onClick={(e) => e.stopPropagation()}>
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
                {policies.map((policy) => (
                  <button
                    key={policy.id}
                    className={
                      "m-0 pl-3 py-2.5 leading-none flex justify-between group hover:bg-nb-gray-900 rounded-md"
                    }
                    disabled={!permission?.policies?.update}
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
                ))}
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
            openAccessControl();
          }}
          aria-label="Configure policies"
        >
          <Settings size={12} />
        </Button>
      </div>
    </div>
  );
}
