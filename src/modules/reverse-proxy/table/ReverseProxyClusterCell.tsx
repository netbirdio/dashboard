"use client";

import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import { Globe, Server } from "lucide-react";
import React from "react";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import {
  ReverseProxy,
  ReverseProxyDomainType,
} from "@/interfaces/ReverseProxy";

type Props = {
  reverseProxy: ReverseProxy;
};

export default function ReverseProxyClusterCell({
  reverseProxy,
}: Readonly<Props>) {
  const { domains } = useReverseProxies();

  const hasCluster = !!reverseProxy.proxy_cluster;
  const isConnected = domains?.some(
    (d) =>
      d.type === ReverseProxyDomainType.FREE &&
      d.domain === reverseProxy.proxy_cluster,
  );

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
      <Badge
        variant={"gray"}
        className={cn("font-normal", !isConnected && "opacity-60")}
      >
        <Server size={11} className={cn(isConnected && "text-green-500")} />
        {reverseProxy.proxy_cluster}
      </Badge>
    </div>
  );
}
