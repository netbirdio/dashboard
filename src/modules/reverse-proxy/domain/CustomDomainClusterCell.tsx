"use client";

import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { Globe, Server, Sparkles } from "lucide-react";
import React from "react";
import { ReverseProxyDomain } from "@/interfaces/ReverseProxy";

type Props = {
  domain: ReverseProxyDomain;
};

export default function CustomDomainClusterCell({ domain }: Readonly<Props>) {
  const hasCluster = !!domain.target_cluster;

  if (!hasCluster) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="gray" className="font-normal">
          <Globe size={12} />
          All
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={"gray"} className={"font-normal"}>
        <Server size={11} className={"text-nb-gray-400"} />
        {domain.target_cluster}
      </Badge>
      {domain.auto_configured && (
        <FullTooltip
          content={
            <div className={"text-xs max-w-xs"}>
              CNAME managed by NetBird via your{" "}
              {domain.auto_configured_provider ?? "DNS"} credential.
            </div>
          }
          interactive={false}
        >
          <Badge variant={"blue"} className={"font-normal cursor-help"}>
            <Sparkles size={11} />
            Auto
          </Badge>
        </FullTooltip>
      )}
    </div>
  );
}
