import Badge from "@components/Badge";
import { HoverCard, HoverCardTrigger } from "@components/HoverCard";
import { Share2 } from "lucide-react";
import { Policy } from "@/interfaces/Policy";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";
import { AccessControlRulesOverviewHoverContent } from "@/modules/access-control/table/AccessControlRuleEndpointCell";

type Props = {
  policy: Policy;
};
export default function AccessControlProtocolCell({ policy }: Props) {
  const protocols = [...new Set(policy.rules?.map((rule) => rule.protocol))];
  const firstProtocol = protocols[0];
  const otherProtocols = protocols.slice(1);

  return firstProtocol ? (
    <div className={"flex"}>
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger>
          <div className="inline-flex items-center gap-2">
            <Badge
              variant={"gray"}
              className={"uppercase tracking-wider font-medium"}
            >
              <Share2 size={12} />
              {firstProtocol}
            </Badge>
            {otherProtocols.length > 0 && (
              <Badge variant="gray-ghost" useHover={true} className="px-3">
                + {otherProtocols.length}
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
  ) : (
    <EmptyRow />
  );
}
