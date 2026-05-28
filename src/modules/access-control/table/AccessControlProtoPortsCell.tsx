import Badge from "@components/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import { Share2 } from "lucide-react";
import React, { useMemo } from "react";
import { Policy } from "@/interfaces/Policy";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";
import { parsePortsToStrings } from "@/modules/access-control/useAccessControl";

// AccessControlProtoPortsCell — single column combining the protocol
// and ports indicators. Protocol is always shown. Ports rendering:
//   - none defined         → ALL
//   - exactly one          → that port
//   - more than one        → `N Ports` badge with hover-card listing all
type Props = {
  policy: Policy;
};

export default function AccessControlProtoPortsCell({
  policy,
}: Readonly<Props>) {
  const rule = useMemo(() => {
    if (policy.rules.length > 0) return policy.rules[0];
    return undefined;
  }, [policy]);

  const allPorts = useMemo(() => parsePortsToStrings(rule), [rule]);
  const hasAnyPorts = allPorts.length > 0;

  if (!rule) return <EmptyRow />;

  return (
    <div className={"flex items-center gap-2"}>
      <Badge variant={"gray"} className={"uppercase tracking-wider font-medium"}>
        <Share2 size={12} />
        {rule.protocol}
      </Badge>

      <TooltipProvider>
        <Tooltip delayDuration={1}>
          <TooltipTrigger asChild={true}>
            <div className={"inline-flex items-center"}>
              {!hasAnyPorts && (
                <Badge
                  variant={"gray"}
                  className={"uppercase tracking-wider font-medium"}
                >
                  All
                </Badge>
              )}

              {hasAnyPorts && allPorts.length === 1 && (
                <Badge
                  variant={"gray"}
                  className={
                    "px-3 whitespace-nowrap uppercase tracking-wider font-medium"
                  }
                >
                  {allPorts[0]}
                </Badge>
              )}

              {hasAnyPorts && allPorts.length > 1 && (
                <Badge
                  variant={"gray"}
                  className={
                    "px-3 whitespace-nowrap uppercase tracking-wider font-medium"
                  }
                >
                  {allPorts.length} Ports
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          {hasAnyPorts && allPorts.length > 1 && (
            <TooltipContent className={"p-3"}>
              <div className={"flex gap-2 items-start flex-wrap max-w-sm"}>
                {allPorts.map((port) => (
                  <Badge key={port} variant={"gray"}>
                    {port}
                  </Badge>
                ))}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
