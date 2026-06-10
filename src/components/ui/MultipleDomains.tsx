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
  if (domains.length === 0) {
    return (
      <Badge
        variant={"blue-darker"}
        className={"uppercase tracking-wider font-medium"}
      >
        <GlobeIcon size={10} />
        All
      </Badge>
    );
  }

  if (domains.length > 1) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={1}>
          <TooltipTrigger asChild={true}>
            <Badge variant={"blue-darker"} className={"cursor-help"}>
              <GlobeIcon size={10} />
              {domains.length} Domains
            </Badge>
          </TooltipTrigger>
          <TooltipContent className={"p-3"}>
            <div className={"flex flex-col gap-1.5 items-start max-w-sm"}>
              {domains.map((domain) => (
                <Badge key={domain} variant={"blue-darker"}>
                  <GlobeIcon size={10} />
                  {domain}
                </Badge>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge variant={"blue-darker"}>
      <GlobeIcon size={10} />
      {domains[0]}
    </Badge>
  );
}
