import Badge from "@components/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import { orderBy } from "lodash";
import React, { useMemo } from "react";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};

export default function AccessControlPortsCell({ policy }: Readonly<Props>) {
  const rule = useMemo(() => {
    if (policy.rules.length > 0) return policy.rules[0];
    return undefined;
  }, [policy]);

  const hasPorts = rule?.ports && rule?.ports?.length > 0;
  const hasPortRanges = rule?.port_ranges && rule?.port_ranges?.length > 0;
  const hasAnyPorts = hasPorts || hasPortRanges;

  const allPorts = useMemo(() => {
    const ports = rule?.ports ?? [];
    const portRanges =
      rule?.port_ranges?.map((r) => {
        if (r.start === r.end) return `${r.start}`;
        return `${r.start}-${r.end}`;
      }) ?? [];
    return orderBy(
      [...portRanges, ...ports],
      [(p) => Number(p.split("-")[0])],
      ["asc"],
    );
  }, [rule]);

  const firstTwoPorts = useMemo(() => {
    return allPorts?.slice(0, 2) ?? [];
  }, [allPorts]);

  const otherPorts = useMemo(() => {
    return allPorts?.slice(2) ?? [];
  }, [allPorts]);

  return (
    <div className={"flex-1"}>
      <TooltipProvider>
        <Tooltip delayDuration={1}>
          <TooltipTrigger asChild={true}>
            <div className={"inline-flex items-center gap-2"}>
              {!hasAnyPorts && (
                <Badge
                  variant={"gray"}
                  className={"uppercase tracking-wider font-medium"}
                >
                  All
                </Badge>
              )}

              {firstTwoPorts?.map((port) => {
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
              <div
                className={
                  "flex gap-2 items-start mt-3 mb-2 flex-wrap max-w-sm"
                }
              >
                {otherPorts.map((port) => {
                  return (
                    <Badge key={port} variant={"gray"}>
                      {port}
                    </Badge>
                  );
                })}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
