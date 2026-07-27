"use client";

import Badge from "@components/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import { Server } from "lucide-react";
import React from "react";
import { NameserverGroup } from "@/interfaces/Nameserver";
import { useTranslations } from "next-intl";

type Props = {
  ns: NameserverGroup;
};
export default function NameserverNameserversCell({ ns }: Props) {
  const t = useTranslations("dns");
  const nameservers = ns.nameservers ?? [];

  if (nameservers.length > 3) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={1}>
          <TooltipTrigger asChild={true}>
            <Badge variant={"gray"} className={"font-mono cursor-help"}>
              <Server size={10} className={"mr-1"} />
              {t("serverCount", { count: nameservers.length })}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className={"p-3"}>
            <div className={"flex flex-col gap-1.5 items-start max-w-sm"}>
              {nameservers.map((server) => (
                <Badge
                  key={server.ip}
                  variant={"gray"}
                  className={"font-mono"}
                >
                  <Server size={10} className={"mr-1"} />
                  {server.ip}
                </Badge>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={"flex gap-2"}>
      {nameservers.map((server) => (
        <Badge key={server.ip} variant={"gray"} className={"font-mono"}>
          <Server size={10} className={"mr-1"} />
          {server.ip}
        </Badge>
      ))}
    </div>
  );
}
