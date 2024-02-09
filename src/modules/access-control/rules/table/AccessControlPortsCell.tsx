import Badge from "@components/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import React, { useMemo, useState } from "react";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};
export default function AccessControlPortsCell({ policy }: Props) {
  const firstRule = useMemo(() => {
    if (policy.rules.length > 0) return policy.rules[0];
    return undefined;
  }, [policy]);

  const hasPorts = firstRule?.ports && firstRule?.ports.length > 0;

  const [firstTwoPorts] = useState(() => {
    if (!hasPorts) return [];
    return firstRule?.ports.slice(0, 2) ?? [];
  });

  const [otherPorts] = useState(() => {
    if (!hasPorts) return [];
    return firstRule?.ports.slice(2) ?? [];
  });

  return (
    <div className={"flex-1"}>
      <TooltipProvider>
        <Tooltip delayDuration={1}>
          <TooltipTrigger asChild={true}>
            <div className={"inline-flex items-center gap-2"}>
              {!hasPorts && (
                <Badge
                  variant={"gray"}
                  className={"uppercase tracking-wider font-medium"}
                >
                  All
                </Badge>
              )}

              {firstTwoPorts &&
                firstTwoPorts.map((port) => {
                  return (
                    <Badge
                      key={port}
                      variant={"gray"}
                      className={
                        "px-3 gap-2 whitespace-nowrap uppercase tracking-wider font-medium"
                      }
                    >
                      {port}
                    </Badge>
                  );
                })}

              {otherPorts && otherPorts.length > 0 && (
                <Badge
                  variant={"gray"}
                  className={
                    "px-3 gap-2 whitespace-nowrap uppercase tracking-wider font-medium"
                  }
                >
                  + {otherPorts.length}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          {otherPorts && otherPorts.length > 0 && (
            <TooltipContent>
              <div className={"flex flex-col gap-2 items-start mt-3 mb-2"}>
                {otherPorts.map((port) => {
                  return <Badge key={port}>{port}</Badge>;
                })}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
