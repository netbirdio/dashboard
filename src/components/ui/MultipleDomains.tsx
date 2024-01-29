import Badge from "@components/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import { GlobeIcon } from "lucide-react";
import * as React from "react";

type Props = {
  domains: string[];
};
export default function MultipleDomains({ domains }: Props) {
  const firstDomain = domains.length > 0 ? domains[0] : undefined;
  const otherDomains = domains.length > 0 ? domains.slice(1) : [];

  return domains.length > 0 ? (
    <TooltipProvider>
      <Tooltip delayDuration={1}>
        <TooltipTrigger asChild={true}>
          <div className={"inline-flex items-center gap-2"}>
            {firstDomain && (
              <Badge variant={"blue-darker"}>
                <GlobeIcon size={10} />
                {firstDomain}
              </Badge>
            )}
            {otherDomains && otherDomains.length > 0 && (
              <Badge
                variant={"blue-darker"}
                className={"px-3 gap-2 whitespace-nowrap"}
              >
                + {otherDomains.length}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        {otherDomains && otherDomains.length > 0 && (
          <TooltipContent sideOffset={10}>
            <div className={"flex flex-col gap-2 items-start "}>
              {otherDomains.map((domain) => {
                return (
                  domain && (
                    <div
                      key={domain}
                      className={
                        "flex gap-2 items-center justify-between w-full"
                      }
                    >
                      <Badge variant={"blue-darker"}>
                        <GlobeIcon size={10} />
                        {domain}
                      </Badge>
                    </div>
                  )
                );
              })}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  ) : (
    <Badge
      variant={"blue-darker"}
      className={"uppercase tracking-wider font-medium"}
    >
      <GlobeIcon size={10} />
      All
    </Badge>
  );
}
