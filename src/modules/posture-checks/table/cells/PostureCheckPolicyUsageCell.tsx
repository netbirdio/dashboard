import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { ArrowUpRightIcon, ShieldIcon, SquarePenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useState } from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { Policy } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";

type Props = {
  check: PostureCheck;
};

export const PostureCheckPolicyUsageCell = ({ check }: Props) => {
  const router = useRouter();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const policyCount = check?.policies?.length || 0;
  const policies = check?.policies;
  const { openEditPolicyModal } = usePolicies();

  return (
    <div className={cn("flex gap-4")}>
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
              {policies?.map((policy: Policy) => {
                const rule = policy?.rules?.[0];
                if (!rule) return;
                return (
                  <button
                    key={policy.id}
                    className={
                      "m-0 pl-3 py-2.5 leading-none flex justify-between group hover:bg-nb-gray-900 rounded-md"
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTooltipOpen(false);
                      openEditPolicyModal(policy, "posture_checks");
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
              <span className={"font-medium text-xs"}>{policyCount}</span>
            </div>
          </Badge>
        </FullTooltip>
      )}
      <FullTooltip
        content={
          <div className={"text-xs max-w-[260px]"}>
            To assign this posture check to your policies, visit the Policies
            page.
          </div>
        }
        interactive={false}
      >
        <Button
          size={"xs"}
          variant={"secondary"}
          className={"min-w-[130px]"}
          onClick={() => router.push("/access-control")}
        >
          <>
            Go to Policies
            <ArrowUpRightIcon size={12} />
          </>
        </Button>
      </FullTooltip>
    </div>
  );
};
