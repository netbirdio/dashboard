import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { Settings, ShieldIcon, ShieldOff, SquarePenIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policies: Policy[];
  // Defaults to the number of policies listed.
  policyCount?: number;
  canConfigure: boolean;
  onSelectPolicy: (policy: Policy) => void | Promise<void>;
  onConfigure: () => void;
  configureLabel?: string;
};

/**
 * A shield with the number of enabled policies, listing them on hover to
 * pick one to edit, and a gear to manage them.
 */
export const PolicyCountBadge = ({
  policies,
  policyCount = policies.length,
  canConfigure,
  onSelectPolicy,
  onConfigure,
  configureLabel = "Configure policies",
}: Props) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const enabledCount = policies.filter((p) => p.enabled).length;
  const displayCount = enabledCount > 0 ? enabledCount : policyCount;

  const policyBadge = (
    <Badge
      variant={"gray"}
      useHover={false}
      disabled={!canConfigure}
      className={
        "cursor-pointer !rounded-r-none !border-r-0 !h-[34px] !px-2 min-w-[50px] hover:bg-nb-gray-930 dark:hover:bg-nb-gray-930 transition-all"
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canConfigure) return;
        if (tooltipOpen) setTooltipOpen(false);
        onConfigure();
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
                {policies.map((policy: Policy) => {
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
                        await onSelectPolicy(policy);
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
            onConfigure();
          }}
          aria-label={configureLabel}
        >
          <Settings size={12} />
        </Button>
      </div>
    </div>
  );
};
