import Badge from "@components/Badge";
import { HoverCard, HoverCardTrigger } from "@components/HoverCard";
import React from "react";
import LongArrowBidirectionalIcon from "@/assets/icons/LongArrowBidirectionalIcon";
import LongArrowLeftIcon from "@/assets/icons/LongArrowLeftIcon";
import { Policy, PolicyRule } from "@/interfaces/Policy";
import { AccessControlRulesOverviewHoverContent } from "@/modules/access-control/table/AccessControlRuleEndpointCell";

type Props = {
  policy: Policy;
};

export const getRuleDirectionKey = (rule?: PolicyRule) => {
  if (!rule) return "direct";
  const isSingleResource =
    !!rule.destinationResource && rule.destinationResource?.type !== "peer";
  return rule.bidirectional && !isSingleResource ? "bidirectional" : "direct";
};

export const getPolicyDirectionSummaryCount = (policy: Policy) => {
  return new Set(policy.rules?.map(getRuleDirectionKey)).size;
};

const DirectionBadge = ({ direction }: { direction: string }) => {
  const isBidirectional = direction === "bidirectional";

  return (
    <Badge
      variant={isBidirectional ? "green" : "blueDark"}
      className={"py-2 px-4"}
    >
      {isBidirectional ? (
        <LongArrowBidirectionalIcon
          size={60}
          autoHeight={true}
          className={"fill-green-500"}
        />
      ) : (
        <LongArrowLeftIcon
          size={60}
          autoHeight={true}
          className={"fill-sky-400 rotate-180"}
        />
      )}
    </Badge>
  );
};

export default function AccessControlDirectionCell({
  policy,
}: Readonly<Props>) {
  const directions = [...new Set(policy.rules?.map(getRuleDirectionKey))];
  const firstDirection = directions[0] ?? "direct";
  const otherDirections = directions.slice(1);

  return (
    <div className={"flex h-full"}>
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger>
          <div className="inline-flex items-center gap-2">
            <DirectionBadge direction={firstDirection} />
            {otherDirections.length > 0 && (
              <Badge variant="gray-ghost" useHover={true} className="px-3">
                + {otherDirections.length}
              </Badge>
            )}
          </div>
        </HoverCardTrigger>
        <AccessControlRulesOverviewHoverContent
          policy={policy}
          disableRedirect={false}
        />
      </HoverCard>
    </div>
  );
}
